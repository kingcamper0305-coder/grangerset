export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Routes
      if (path === '/' && method === 'GET') {
        return jsonResponse({
          status: 'online',
          name: 'Granger Brain',
          message: '🧠 Granger Brain is online',
          version: '1.0.0',
          endpoints: {
            'POST /chat': 'Send a message to the brain. Input: {"message": "...", "context": "..."}',
            'POST /memory/store': 'Store a memory. Input: {"content": "...", "category": "...", "importance": 0}',
            'GET /memory/search?q=query': 'Search memories by query string',
            'GET /memory/recent': 'Get recent memories',
            'POST /decide': 'Decision engine. Input: {"situation": "...", "options": ["..."]}',
            'GET /status': 'Brain status and stats',
          }
        }, corsHeaders);
      }

      if (path === '/chat' && method === 'POST') {
        return await handleChat(request, env, corsHeaders);
      }

      if (path === '/memory/store' && method === 'POST') {
        return await handleMemoryStore(request, env, corsHeaders);
      }

      if (path === '/memory/search' && method === 'GET') {
        return await handleMemorySearch(request, env, corsHeaders);
      }

      if (path === '/memory/recent' && method === 'GET') {
        return await handleMemoryRecent(request, env, corsHeaders);
      }

      if (path === '/decide' && method === 'POST') {
        return await handleDecide(request, env, corsHeaders);
      }

      if (path === '/status' && method === 'GET') {
        return await handleStatus(request, env, corsHeaders);
      }

      return jsonResponse({ error: 'Not found', path }, corsHeaders, 404);
    } catch (err) {
      return jsonResponse({ error: err.message, stack: err.stack }, corsHeaders, 500);
    }
  },
};

// Chat endpoint - uses Cloudflare AI Llama 3.1 8B
async function handleChat(request, env, corsHeaders) {
  const body = await request.json();
  const { message, context } = body;

  if (!message) {
    return jsonResponse({ error: 'message is required' }, corsHeaders, 400);
  }

  // Search relevant memories
  let memoryContext = '';
  try {
    const memResults = await env.DB.prepare(
      'SELECT content, category, importance FROM memories ORDER BY importance DESC, created_at DESC LIMIT 5'
    ).all();
    if (memResults.results?.length > 0) {
      memoryContext = '\n\nRelevant memories:\n' +
        memResults.results.map(m => `- [${m.category}] ${m.content}`).join('\n');
    }
  } catch (e) {
    // memories table might not exist yet, that's ok
  }

  const systemPrompt = `You are Granger's Brain — an AI cognitive engine. You think clearly, reason step by step, and provide thoughtful responses. Always be helpful, insightful, and concise. When responding, think through the problem first.${memoryContext ? memoryContext : ''}`;

  const messages = [
    { role: 'system', content: systemPrompt },
  ];
  if (context) {
    messages.push({ role: 'system', content: `Additional context: ${context}` });
  }
  messages.push({ role: 'user', content: message });

  const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages,
    max_tokens: 512,
  });

  const responseText = aiResponse.response || aiResponse.result?.response || 'No response generated';

  // Extract a "thought" (first line or reasoning) from the response
  const lines = responseText.split('\n').filter(l => l.trim());
  const thought = lines.length > 1 ? lines[0] : 'Direct response generated';

  // Auto-store important interactions as memories
  try {
    await env.DB.prepare(
      'INSERT INTO memories (content, category) VALUES (?, ?)'
    ).bind(`User asked: "${message}" → Brain responded briefly`, 'conversation').run();
  } catch (e) {
    // non-critical
  }

  return jsonResponse({
    response: responseText,
    thought,
    model: '@cf/meta/llama-3.1-8b-instruct',
  }, corsHeaders);
}

// Store a memory
async function handleMemoryStore(request, env, corsHeaders) {
  const body = await request.json();
  const { content, category = 'general', importance = 0 } = body;

  if (!content) {
    return jsonResponse({ error: 'content is required' }, corsHeaders, 400);
  }

  const result = await env.DB.prepare(
    'INSERT INTO memories (content, category, importance) VALUES (?, ?, ?)'
  ).bind(content, category, importance).run();

  // Also index in FTS
  try {
    const lastId = result.meta?.last_row_id;
    if (lastId) {
      await env.DB.prepare(
        'INSERT INTO memories_fts (rowid, content, category) VALUES (?, ?, ?)'
      ).bind(lastId, content, category).run();
    }
  } catch (e) {
    // FTS might fail, non-critical
  }

  return jsonResponse({
    success: true,
    id: result.meta?.last_row_id,
    message: 'Memory stored',
  }, corsHeaders);
}

// Search memories
async function handleMemorySearch(request, env, corsHeaders) {
  const query = new URL(request.url).searchParams.get('q');

  if (!query) {
    return jsonResponse({ error: 'q parameter is required' }, corsHeaders, 400);
  }

  // Try FTS first, fall back to LIKE
  let results;
  try {
    results = await env.DB.prepare(
      'SELECT m.id, m.content, m.category, m.created_at, m.importance FROM memories m INNER JOIN memories_fts fts ON m.id = fts.rowid WHERE memories_fts MATCH ? ORDER BY rank LIMIT 20'
    ).bind(query).all();
  } catch (e) {
    results = await env.DB.prepare(
      'SELECT id, content, category, created_at, importance FROM memories WHERE content LIKE ? ORDER BY importance DESC, created_at DESC LIMIT 20'
    ).bind(`%${query}%`).all();
  }

  return jsonResponse({
    query,
    results: results.results || [],
    count: (results.results || []).length,
  }, corsHeaders);
}

// Recent memories
async function handleMemoryRecent(request, env, corsHeaders) {
  const results = await env.DB.prepare(
    'SELECT id, content, category, created_at, importance FROM memories ORDER BY created_at DESC LIMIT 20'
  ).all();

  return jsonResponse({
    results: results.results || [],
    count: (results.results || []).length,
  }, corsHeaders);
}

// Decision engine
async function handleDecide(request, env, corsHeaders) {
  const body = await request.json();
  const { situation, options } = body;

  if (!situation) {
    return jsonResponse({ error: 'situation is required' }, corsHeaders, 400);
  }

  // Built-in decision rules
  const rules = {
    urgency: (sit) => {
      const urgent = ['emergency', 'urgent', 'asap', 'immediately', 'critical', 'now'];
      return urgent.some(w => sit.toLowerCase().includes(w));
    },
    complexity: (sit) => {
      const words = sit.split(/\s+/).length;
      if (words > 50) return 'high';
      if (words > 20) return 'medium';
      return 'low';
    },
    needsResearch: (sit) => {
      const researchWords = ['how', 'what', 'why', 'explain', 'research', 'find', 'search'];
      return researchWords.some(w => sit.toLowerCase().includes(w));
    },
  };

  // Build reasoning with AI
  const decisionPrompt = `You are a decision engine. Given the following situation, analyze it and recommend the best course of action.

Situation: ${situation}
${options ? `Available options: ${JSON.stringify(options)}` : ''}

Analyze:
1. What is the urgency level?
2. What is the complexity?
3. What action should be taken?
4. Why is this the best choice?

Respond in JSON format:
{
  "analysis": "brief analysis",
  "urgency": "low|medium|high|critical",
  "recommended_action": "what to do",
  "reasoning": "why this action",
  "confidence": 0.0-1.0
}`;

  const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'You are a logical decision engine. Always respond with valid JSON.' },
      { role: 'user', content: decisionPrompt },
    ],
    max_tokens: 300,
  });

  const responseText = aiResponse.response || aiResponse.result?.response || '{}';

  // Try to parse JSON from response
  let decision;
  try {
    // Extract JSON from possible markdown code blocks
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    decision = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: responseText };
  } catch (e) {
    decision = { raw: responseText };
  }

  // Add rule-based checks
  decision.rule_checks = {
    is_urgent: rules.urgency(situation),
    complexity: rules.complexity(situation),
    needs_research: rules.needsResearch(situation),
  };

  // Store the decision as a memory
  try {
    await env.DB.prepare(
      'INSERT INTO memories (content, category, importance) VALUES (?, ?, ?)'
    ).bind(`Decision for: "${situation.substring(0, 100)}" → ${decision.recommended_action || 'analyzed'}`, 'decision', decision.rule_checks.is_urgent ? 3 : 1).run();
  } catch (e) {
    // non-critical
  }

  return jsonResponse({
    situation,
    decision,
  }, corsHeaders);
}

// Status endpoint
async function handleStatus(request, env, corsHeaders) {
  let memoryCount = 0;
  let categories = [];
  try {
    const countResult = await env.DB.prepare('SELECT COUNT(*) as count FROM memories').first();
    memoryCount = countResult?.count || 0;
    const catResult = await env.DB.prepare('SELECT DISTINCT category FROM memories').all();
    categories = (catResult.results || []).map(r => r.category);
  } catch (e) {
    // DB might not be set up
  }

  return jsonResponse({
    status: 'online',
    name: 'Granger Brain',
    version: '1.0.0',
    uptime: 'running',
    model: '@cf/meta/llama-3.1-8b-instruct',
    database: {
      type: 'D1',
      name: 'granger-memories',
      memory_count: memoryCount,
      categories,
    },
    capabilities: ['chat', 'memory', 'decision'],
    timestamp: new Date().toISOString(),
  }, corsHeaders);
}

// Helper
function jsonResponse(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
