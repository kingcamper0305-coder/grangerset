// 🧠 Granger Brain — Cloudflare Worker
// Full architecture: Decision Engine + Memory + State + Data + Knowledge + Gateway

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    try {
      // Routes
      if (path === '/' && request.method === 'GET') {
        return json({ status: 'alive', brain: 'granger', modules: ['decision-engine','memory','state','data','knowledge-base','api-gateway'], timestamp: new Date().toISOString() }, cors);
      }

      if (path === '/think' && request.method === 'POST') {
        const { input } = await request.json();
        // Query rules
        const rules = await env.DB.prepare('SELECT * FROM rules ORDER BY priority DESC').all();
        for (const rule of (rules.results || [])) {
          if (input.toLowerCase().includes(rule.pattern.toLowerCase())) {
            return json({ action: rule.action, rule: rule.pattern, result: `Processed: "${input}"` }, cors);
          }
        }
        // Fallback to AI
        const ai = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            { role: 'system', content: 'You are Granger Brain. Be concise and actionable.' },
            { role: 'user', content: input }
          ]
        });
        return json({ response: ai.response, thought: 'AI fallback', model: '@cf/meta/llama-3.1-8b-instruct' }, cors);
      }

      if (path === '/memory' && request.method === 'POST') {
        const { text, category = 'general', importance = 5 } = await request.json();
        await env.DB.prepare('INSERT INTO memories (text, category, importance, timestamp) VALUES (?, ?, ?, ?)').bind(text, category, importance, Date.now()).run();
        return json({ success: true, stored: text.substring(0, 50) }, cors);
      }

      if (path === '/memory' && request.method === 'GET') {
        const query = url.searchParams.get('q');
        if (query) {
          const results = await env.DB.prepare('SELECT * FROM memories WHERE text LIKE ? ORDER BY importance DESC LIMIT 10').bind('%' + query + '%').all();
          return json({ results: results.results || [] }, cors);
        }
        const recent = await env.DB.prepare('SELECT * FROM memories ORDER BY timestamp DESC LIMIT 20').all();
        return json({ memories: recent.results || [] }, cors);
      }

      if (path.startsWith('/state/') && request.method === 'GET') {
        const key = path.replace('/state/', '');
        const value = await env.STATE.get(key);
        return json({ key, value: value ? JSON.parse(value) : null }, cors);
      }

      if (path.startsWith('/state/') && request.method === 'PUT') {
        const key = path.replace('/state/', '');
        const { value } = await request.json();
        await env.STATE.put(key, JSON.stringify(value));
        return json({ success: true, key }, cors);
      }

      if (path === '/status') {
        const memories = await env.DB.prepare('SELECT COUNT(*) as count FROM memories').first();
        return json({
          status: 'online',
          name: 'Granger Brain',
          model: '@cf/meta/llama-3.1-8b-instruct',
          memory_count: memories?.count || 0,
          capabilities: ['chat', 'memory', 'decision', 'state']
        }, cors);
      }

      return json({ error: 'Not found', path }, cors, 404);
    } catch (e) {
      return json({ error: e.message }, cors, 500);
    }
  }
};

function json(data, cors, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}
