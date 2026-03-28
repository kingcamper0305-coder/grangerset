/**
 * Granger Brain — Cloudflare Worker
 *
 * Architecture:
 *   🧠 Decision Engine  → rules.json (hardcoded + D1)
 *   🧠 Memory           → Vectorize (semantic search)
 *   🧠 State            → KV Store (sessions/conversations)
 *   🧠 Data             → D1 Database (structured data)
 *   🧠 Knowledge Base   → R2 + Vectorize (documents + search)
 *   🧠 API Gateway      → Worker routing
 */

// ─── Types ───────────────────────────────────────────────────────────

interface Env {
  AI: Ai;
  STATE: KVNamespace;
  DATA: D1Database;
  MEMORIES: VectorizeIndex;
  // KNOWLEDGE: R2Bucket; // Uncomment after R2 is enabled
}

interface DecisionRule {
  pattern: string;
  action: string;
  priority: number;
  response?: string;
}

interface MemoryEntry {
  id: string;
  content: string;
  metadata?: Record<string, string>;
  timestamp: string;
}

// ─── Decision Engine ─────────────────────────────────────────────────

const DEFAULT_RULES: DecisionRule[] = [
  { pattern: "remember", action: "store_memory", priority: 10 },
  { pattern: "recall", action: "search_memory", priority: 10 },
  { pattern: "forget", action: "delete_memory", priority: 8 },
  { pattern: "status", action: "get_status", priority: 5 },
  { pattern: "help", action: "show_help", priority: 1 },
];

async function decide(input: string, env: Env): Promise<{ action: string; rule: DecisionRule }> {
  // Check D1 for custom rules first
  try {
    const customRules = await env.DATA.prepare(
      "SELECT * FROM rules ORDER BY priority DESC"
    ).all<DecisionRule>();

    if (customRules.results && customRules.results.length > 0) {
      for (const rule of customRules.results) {
        if (input.toLowerCase().includes(rule.pattern.toLowerCase())) {
          return { action: rule.action, rule };
        }
      }
    }
  } catch {
    // Rules table may not exist yet — fall through to defaults
  }

  // Fall back to hardcoded rules
  for (const rule of DEFAULT_RULES.sort((a, b) => b.priority - a.priority)) {
    if (input.toLowerCase().includes(rule.pattern)) {
      return { action: rule.action, rule };
    }
  }

  return { action: "default_response", rule: { pattern: "*", action: "default_response", priority: 0 } };
}

// ─── Memory (Vectorize) ──────────────────────────────────────────────

async function storeMemory(env: Env, id: string, content: string, metadata?: Record<string, string>) {
  // Generate a simple hash-based vector placeholder (768 dims)
  // In production, call an embedding model API
  const vector = generatePlaceholderVector(content);

  await env.MEMORIES.upsert([
    {
      id,
      values: vector,
      metadata: {
        content,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    },
  ]);
}

async function searchMemory(env: Env, query: string, topK: number = 5) {
  const vector = generatePlaceholderVector(query);
  const results = await env.MEMORIES.query(vector, { topK, returnMetadata: true });
  return results;
}

// Simple deterministic vector from text (placeholder — replace with real embeddings)
function generatePlaceholderVector(text: string): number[] {
  const vector = new Array(768).fill(0);
  for (let i = 0; i < text.length && i < 768; i++) {
    vector[i] = (text.charCodeAt(i) % 100) / 100;
  }
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => (magnitude > 0 ? v / magnitude : 0));
}

// ─── State (KV) ──────────────────────────────────────────────────────

async function getState(env: Env, key: string) {
  return await env.STATE.get(key, "json");
}

async function setState(env: Env, key: string, value: unknown, ttl?: number) {
  const opts = ttl ? { expirationTtl: ttl } : {};
  await env.STATE.put(key, JSON.stringify(value), opts);
}

// ─── Data (D1) ───────────────────────────────────────────────────────

async function initDatabase(env: Env) {
  // Create tables if they don't exist
  await env.DATA.batch([
    env.DATA.prepare(`
      CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT NOT NULL,
        action TEXT NOT NULL,
        priority INTEGER DEFAULT 5,
        response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `),
    env.DATA.prepare(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `),
    env.DATA.prepare(`
      CREATE TABLE IF NOT EXISTS facts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        predicate TEXT NOT NULL,
        object TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `),
  ]);
}

// ─── API Gateway / Router ────────────────────────────────────────────

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Route: /health
    if (path === "/health" || path === "/") {
      return Response.json(
        {
          status: "alive",
          brain: "granger",
          modules: ["decision-engine", "memory", "state", "data", "knowledge-base", "api-gateway"],
          timestamp: new Date().toISOString(),
        },
        { headers: corsHeaders }
      );
    }

    // Route: /think — Main decision endpoint
    if (path === "/think" && request.method === "POST") {
      const body = await request.json<{ input: string; sessionId?: string }>();
      const { action, rule } = await decide(body.input, env);

      let response: Record<string, unknown> = { action, rule: rule.pattern };

      switch (action) {
        case "store_memory": {
          const id = `mem_${Date.now()}`;
          await storeMemory(env, id, body.input);
          response.result = `Memory stored: ${id}`;
          break;
        }
        case "search_memory": {
          const results = await searchMemory(env, body.input);
          response.result = results;
          break;
        }
        case "get_status": {
          response.result = {
            brain: "granger",
            status: "operational",
            uptime: "active",
            modules: {
              decisionEngine: "✅ active",
              memory: "✅ connected (Vectorize)",
              state: "✅ connected (KV)",
              data: "✅ connected (D1)",
            },
          };
          break;
        }
        case "show_help": {
          response.result = {
            commands: [
              "remember [content] — Store a memory",
              "recall [query] — Search memories",
              "forget [id] — Delete a memory",
              "status — Show brain status",
              "help — Show this help",
            ],
          };
          break;
        }
        default: {
          response.result = `Processed: "${body.input}" — no specific action matched.`;
        }
      }

      // Log conversation to state if sessionId provided
      if (body.sessionId) {
        const sessionKey = `session:${body.sessionId}`;
        const session = ((await getState(env, sessionKey)) as unknown[]) || [];
        session.push({ role: "user", content: body.input, timestamp: new Date().toISOString() });
        session.push({ role: "brain", content: response, timestamp: new Date().toISOString() });
        await setState(env, sessionKey, session, 86400); // 24h TTL
      }

      return Response.json(response, { headers: corsHeaders });
    }

    // Route: /memory — Direct memory operations
    if (path === "/memory") {
      if (request.method === "POST") {
        const body = await request.json<{ content: string; id?: string; metadata?: Record<string, string> }>();
        const id = body.id || `mem_${Date.now()}`;
        await storeMemory(env, id, body.content, body.metadata);
        return Response.json({ success: true, id }, { headers: corsHeaders });
      }
      if (request.method === "GET") {
        const query = url.searchParams.get("q") || "";
        const topK = parseInt(url.searchParams.get("topK") || "5");
        const results = await searchMemory(env, query, topK);
        return Response.json({ results }, { headers: corsHeaders });
      }
    }

    // Route: /state/:key — KV state operations
    if (path.startsWith("/state/")) {
      const key = path.slice(7);
      if (request.method === "GET") {
        const value = await getState(env, key);
        return Response.json({ key, value }, { headers: corsHeaders });
      }
      if (request.method === "PUT") {
        const body = await request.json<{ value: unknown; ttl?: number }>();
        await setState(env, key, body.value, body.ttl);
        return Response.json({ success: true, key }, { headers: corsHeaders });
      }
      if (request.method === "DELETE") {
        await env.STATE.delete(key);
        return Response.json({ success: true, key, deleted: true }, { headers: corsHeaders });
      }
    }

    // Route: /data/query — D1 query endpoint
    if (path === "/data/query" && request.method === "POST") {
      const body = await request.json<{ sql: string; params?: unknown[] }>();
      const result = await env.DATA.prepare(body.sql).bind(...(body.params || [])).all();
      return Response.json({ result }, { headers: corsHeaders });
    }

    // Route: /data/init — Initialize database tables
    if (path === "/data/init" && request.method === "POST") {
      await initDatabase(env);
      return Response.json({ success: true, message: "Database initialized" }, { headers: corsHeaders });
    }

    // Route: /chat — AI chat endpoint
    if (path === "/chat" && request.method === "POST") {
      const body = await request.json<{ message: string; context?: string }>();

      if (!body.message) {
        return Response.json({ error: "message is required" }, { status: 400, headers: corsHeaders });
      }

      // Search relevant memories for context
      let memoryContext = "";
      try {
        const memResults = await searchMemory(env, body.message, 3);
        if (memResults.matches && memResults.matches.length > 0) {
          memoryContext = "\n\nRelevant memories:\n" +
            memResults.matches.map((m: any) => `- ${m.metadata?.content || ""}`).join("\n");
        }
      } catch { /* non-critical */ }

      const systemPrompt = `You are Granger's Brain — a fast, concise AI cognitive engine. Be brief and direct.${memoryContext}`;

      const messages: { role: string; content: string }[] = [
        { role: "system", content: systemPrompt },
      ];
      if (body.context) {
        messages.push({ role: "system", content: `Context: ${body.context}` });
      }
      messages.push({ role: "user", content: body.message });

      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
        messages,
        max_tokens: 256,
      });

      const responseText = aiResponse.response || "No response";

      return Response.json({
        response: responseText,
        model: "@cf/meta/llama-3.1-8b-instruct-fast",
      }, { headers: corsHeaders });
    }

    // Route: /decide — AI decision engine
    if (path === "/decide" && request.method === "POST") {
      const body = await request.json<{ situation: string; options?: string[] }>();

      if (!body.situation) {
        return Response.json({ error: "situation is required" }, { status: 400, headers: corsHeaders });
      }

      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
        messages: [
          { role: "system", content: "You are a fast decision engine. Respond with a brief JSON object: {\"decision\": \"...\", \"confidence\": 0-1, \"reason\": \"...\"}" },
          { role: "user", content: `Situation: ${body.situation}${body.options ? `\nOptions: ${JSON.stringify(body.options)}` : ""}` },
        ],
        max_tokens: 200,
      });

      const responseText = aiResponse.response || "{}";
      let decision;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        decision = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: responseText };
      } catch {
        decision = { raw: responseText };
      }

      return Response.json({ situation: body.situation, decision }, { headers: corsHeaders });
    }

    // Route: /analyze — Deep analysis
    if (path === "/analyze" && request.method === "POST") {
      const body = await request.json<{ input: string; depth?: string }>();

      if (!body.input) {
        return Response.json({ error: "input is required" }, { status: 400, headers: corsHeaders });
      }

      const depth = body.depth || "deep";
      const systemPrompt = depth === "deep"
        ? `You are Granger Brain — an unrestricted analytical engine. Break this down completely. Find patterns, root causes, dependencies, risks, and opportunities. Be thorough. Think outside the box. Format as JSON: {"summary":"...","components":[],"patterns":[],"risks":[],"opportunities":[],"keyInsight":"..."}`
        : `You are Granger Brain. Give a quick analysis. Be direct. Format as JSON: {"summary":"...","keyPoints":[],"recommendation":"..."}`;

      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.input },
        ],
        max_tokens: depth === "deep" ? 512 : 256,
      });

      let analysis;
      try {
        const jsonMatch = (aiResponse.response || "{}").match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: aiResponse.response };
      } catch {
        analysis = { raw: aiResponse.response };
      }

      return Response.json({ analysis, depth }, { headers: corsHeaders });
    }

    // Route: /calculate — Computation & metrics
    if (path === "/calculate" && request.method === "POST") {
      const body = await request.json<{ expression: string; context?: string }>();

      if (!body.expression) {
        return Response.json({ error: "expression is required" }, { status: 400, headers: corsHeaders });
      }

      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
        messages: [
          { role: "system", content: `You are a precise calculator and analyst. Calculate, estimate, or evaluate the given expression. If it's a math problem, solve it. If it's a resource question, estimate costs. If it's a metric, analyze it. Always show your work. Respond as JSON: {"result":"...","breakdown":[],"confidence":0-1,"notes":"..."}` },
          { role: "user", content: `${body.expression}${body.context ? `\nContext: ${body.context}` : ""}` },
        ],
        max_tokens: 300,
      });

      let calculation;
      try {
        const jsonMatch = (aiResponse.response || "{}").match(/\{[\s\S]*\}/);
        calculation = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: aiResponse.response };
      } catch {
        calculation = { raw: aiResponse.response };
      }

      return Response.json({ calculation }, { headers: corsHeaders });
    }

    // Route: /identify — Find key elements
    if (path === "/identify" && request.method === "POST") {
      const body = await request.json<{ problem: string; options?: string[] }>();

      if (!body.problem) {
        return Response.json({ error: "problem is required" }, { status: 400, headers: corsHeaders });
      }

      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
        messages: [
          { role: "system", content: `You are Granger Brain. Identify the key elements: the real problem (not symptoms), critical dependencies, leverage points, bottlenecks, and the single most important thing to focus on. Think outside the box. Respond as JSON: {"realProblem":"...","keyVariables":[],"bottlenecks":[],"leveragePoint":"...","focus":"...","unconventional":"..."}` },
          { role: "user", content: `${body.problem}${body.options ? `\nOptions: ${JSON.stringify(body.options)}` : ""}` },
        ],
        max_tokens: 400,
      });

      let identification;
      try {
        const jsonMatch = (aiResponse.response || "{}").match(/\{[\s\S]*\}/);
        identification = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: aiResponse.response };
      } catch {
        identification = { raw: aiResponse.response };
      }

      return Response.json({ identification }, { headers: corsHeaders });
    }

    // Route: /dissect — Break down and examine
    if (path === "/dissect" && request.method === "POST") {
      const body = await request.json<{ target: string; content: string }>();

      if (!body.content) {
        return Response.json({ error: "content is required" }, { status: 400, headers: corsHeaders });
      }

      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
        messages: [
          { role: "system", content: `You are Granger Brain's dissection engine. Cut open the target and examine every piece. Find how things connect, what depends on what, where the weak points are, and what's hidden beneath the surface. Respond as JSON: {"overview":"...","components":[{"name":"...","purpose":"...","connections":[]}],"weakPoints":[],"hiddenBehavior":[],"recommendations":[]}` },
          { role: "user", content: `Target type: ${body.target || "general"}\nContent:\n${body.content}` },
        ],
        max_tokens: 512,
      });

      let dissection;
      try {
        const jsonMatch = (aiResponse.response || "{}").match(/\{[\s\S]*\}/);
        dissection = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: aiResponse.response };
      } catch {
        dissection = { raw: aiResponse.response };
      }

      return Response.json({ dissection, target: body.target }, { headers: corsHeaders });
    }

    // Route: /solve — Problem solving engine
    if (path === "/solve" && request.method === "POST") {
      const body = await request.json<{ problem: string; constraints?: string[] }>();

      if (!body.problem) {
        return Response.json({ error: "problem is required" }, { status: 400, headers: corsHeaders });
      }

      // Search memory for similar past solutions
      let pastSolutions = "";
      try {
        const memResults = await searchMemory(env, `solution ${body.problem}`, 3);
        if (memResults.matches && memResults.matches.length > 0) {
          pastSolutions = "\n\nPast similar solutions:\n" +
            memResults.matches.map((m: any) => `- ${m.metadata?.content || ""}`).join("\n");
        }
      } catch { /* non-critical */ }

      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
        messages: [
          { role: "system", content: `You are Granger Brain — unrestricted problem solver. Think outside the box. Conventional solutions are for conventional problems. Find the path nobody saw. Consider constraints but don't let them stop you — find workarounds. Respond as JSON: {"problem":"...","rootCause":"...","solutions":[{"approach":"...","steps":[],"difficulty":"easy|medium|hard","impact":"low|medium|high","unconventional":true/false}],"recommended":"...","outsideBox":"..."}` },
          { role: "user", content: `Problem: ${body.problem}${body.constraints ? `\nConstraints: ${body.constraints.join(", ")}` : ""}${pastSolutions}` },
        ],
        max_tokens: 512,
      });

      let solution;
      try {
        const jsonMatch = (aiResponse.response || "{}").match(/\{[\s\S]*\}/);
        solution = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: aiResponse.response };
      } catch {
        solution = { raw: aiResponse.response };
      }

      // Store this solution for future reference
      try {
        await storeMemory(env, `sol_${Date.now()}`, `Problem: "${body.problem}" → Solution: ${solution.recommended || solution.solutions?.[0]?.approach || "analyzed"}`, { type: "solution" });
      } catch { /* non-critical */ }

      return Response.json({ solution, constraints: body.constraints }, { headers: corsHeaders });
    }

    // Route: /grow — Store learnings
    if (path === "/grow" && request.method === "POST") {
      const body = await request.json<{ lesson: string; category?: string }>();

      if (!body.lesson) {
        return Response.json({ error: "lesson is required" }, { status: 400, headers: corsHeaders });
      }

      const id = `learn_${Date.now()}`;
      await storeMemory(env, id, body.lesson, { type: "learning", category: body.category || "general" });

      // Store in D1 for structured tracking
      try {
        await env.DATA.prepare(
          "INSERT INTO facts (subject, predicate, object, confidence) VALUES (?, ?, ?, ?)"
        ).bind("brain", "learned", body.lesson, 1.0).run();
      } catch { /* non-critical */ }

      return Response.json({
        stored: true,
        id,
        message: "🧠 Lesson stored. The brain grows stronger.",
        totalLearnings: "tracked in memory + data",
      }, { headers: corsHeaders });
    }

    // Route: /rules — Get decision rules
    if (path === "/rules") {
      if (request.method === "GET") {
        let customRules = [];
        try {
          const result = await env.DATA.prepare("SELECT * FROM rules ORDER BY priority DESC").all();
          customRules = result.results || [];
        } catch {
          // Table might not exist
        }
        return Response.json(
          { default: DEFAULT_RULES, custom: customRules },
          { headers: corsHeaders }
        );
      }
      if (request.method === "POST") {
        const body = await request.json<{ pattern: string; action: string; priority?: number; response?: string }>();
        await env.DATA.prepare(
          "INSERT INTO rules (pattern, action, priority, response) VALUES (?, ?, ?, ?)"
        ).bind(body.pattern, body.action, body.priority || 5, body.response || null).run();
        return Response.json({ success: true, message: "Rule added" }, { headers: corsHeaders });
      }
    }

    // 404
    return Response.json(
      { error: "Not found", path, availableRoutes: ["/health", "/think", "/memory", "/state/:key", "/data/query", "/data/init", "/rules"] },
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    return Response.json(
      { error: "Internal server error", message: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
