#!/usr/bin/env node
// 🏕️ GRANGER — Master Orchestrator
// Starts all sub-agents: Twin Eyes, Left Hand, Right Hand

const { fork } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 3088;
const agents = {};

function startAgent(name, script) {
  const child = fork(script, [], { silent: true });
  child.stdout.on('data', d => process.stdout.write(`[${name}] ${d}`));
  child.stderr.on('data', d => process.stderr.write(`[${name}] ${d}`));
  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}, restarting...`);
    setTimeout(() => startAgent(name, script), 2000);
  });
  agents[name] = { process: child, port: getPort(name), pid: child.pid };
  console.log(`[${name}] started (PID ${child.pid})`);
}

function getPort(name) {
  return {
    'eye': 3090,
    'left-hand': 3089,
    'right-hand': 3091,
    'clear-eye': 3093,
    'dark-eye': 3094
  }[name];
}

// Proxy API to sub-agents (preserves query string)
function proxyTo(agent, fullPath, res) {
  const port = agents[agent]?.port;
  if (!port) { res.writeHead(503); return res.end(JSON.stringify({ error: `${agent} not running` })); }
  http.get(`http://127.0.0.1:${port}${fullPath}`, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(data); });
  }).on('error', (e) => { res.writeHead(502); res.end(JSON.stringify({ error: e.message })); });
}

// Start all sub-agents
startAgent('eye', path.join(__dirname, 'eye/agent.js'));
startAgent('clear-eye', path.join(__dirname, 'clear-eye/agent.js'));
startAgent('dark-eye', path.join(__dirname, 'dark-eye/agent.js'));
startAgent('left-hand', path.join(__dirname, 'left-hand/agent.js'));
startAgent('right-hand', path.join(__dirname, 'right-hand/agent.js'));

// Master API
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader('Content-Type', 'application/json');

  // System status
  if (url.pathname === '/api/system') {
    return res.end(JSON.stringify({
      name: 'Granger 🏕️',
      agents: Object.entries(agents).map(([name, a]) => ({ name, pid: a.pid, port: a.port })),
      timestamp: new Date().toISOString(),
    }));
  }

  // Proxy routes (preserve query string, strip prefix)
  if (url.pathname.startsWith('/eye')) return proxyTo('eye', url.pathname.replace('/eye', '') + url.search, res);
  if (url.pathname.startsWith('/clear-eye')) return proxyTo('clear-eye', url.pathname.replace('/clear-eye', '') + url.search, res);
  if (url.pathname.startsWith('/dark-eye')) return proxyTo('dark-eye', url.pathname.replace('/dark-eye', '') + url.search, res);
  if (url.pathname.startsWith('/left')) return proxyTo('left-hand', url.pathname.replace('/left', '') + url.search, res);
  if (url.pathname.startsWith('/right')) return proxyTo('right-hand', url.pathname.replace('/right', '') + url.search, res);

  // Serve findings/reports
  if (url.pathname.startsWith('/findings/')) {
    const fs = require('fs');
    const filePath = path.join(__dirname, url.pathname);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (filePath.endsWith('.md')) {
        // Render markdown as HTML
        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Findings</title>
<style>
  body { background: #0a0a0f; color: #e0e0e0; font-family: monospace; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
  h1 { color: #7eb8ff; border-bottom: 1px solid #2a3a4e; padding-bottom: 10px; }
  h2 { color: #5b9bd5; margin-top: 24px; }
  h3 { color: #4ade80; }
  pre { background: #12121a; padding: 16px; border-radius: 8px; overflow-x: auto; border: 1px solid #2a3a4e; }
  code { background: #1a1a2e; padding: 2px 6px; border-radius: 4px; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #5b9bd5; padding-left: 12px; color: #888; }
  .copy-btn { position: fixed; top: 10px; right: 10px; padding: 10px 20px; background: #1a3a5a; border: 1px solid #3a5a8a; border-radius: 6px; color: #7eb8ff; cursor: pointer; font-family: monospace; }
  .copy-btn:hover { background: #2a4a6a; }
</style></head><body>
<button class="copy-btn" onclick="copyAll()">📋 Copy All</button>
${content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/^- (.+)$/gm, '• $1<br>').replace(/\n\n/g, '<br><br>')}
<script>function copyAll(){navigator.clipboard.writeText(document.body.innerText.replace('📋 Copy All','')).then(()=>alert('Copied!'))}</script>
</body></html>`;
        res.setHeader('Content-Type', 'text/html');
        return res.end(html);
      }
      res.setHeader('Content-Type', 'text/plain');
      return res.end(content);
    } catch(e) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'File not found' }));
    }
  }

  // Serve files from granger-eye directory
  if (url.pathname === '/debloat-android.sh') {
  if (url.pathname === "/granger-phone-bridge.sh") {
    const fs = require("fs");
    const filePath = path.join(__dirname, "granger-phone-bridge.sh");
    try {
      const content = fs.readFileSync(filePath, "utf8");
      res.setHeader("Content-Type", "text/plain");
      return res.end(content);
    } catch { res.writeHead(404); return res.end("Not found"); }
  }
    const fs = require('fs');
    const filePath = path.join(__dirname, 'debloat-android.sh');
  if (url.pathname === "/granger-phone-bridge.sh") {
    const fs = require("fs");
    const filePath = path.join(__dirname, "granger-phone-bridge.sh");
    try {
      const content = fs.readFileSync(filePath, "utf8");
      res.setHeader("Content-Type", "text/plain");
      return res.end(content);
    } catch { res.writeHead(404); return res.end("Not found"); }
  }
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="debloat-android.sh"');
  if (url.pathname === "/granger-phone-bridge.sh") {
    const fs = require("fs");
    const filePath = path.join(__dirname, "granger-phone-bridge.sh");
    try {
      const content = fs.readFileSync(filePath, "utf8");
      res.setHeader("Content-Type", "text/plain");
      return res.end(content);
    } catch { res.writeHead(404); return res.end("Not found"); }
  }
      return res.end(content);
    } catch { res.writeHead(404); return res.end('Not found'); }
  }

  // List findings
  if (url.pathname === '/api/findings') {
    const fs = require('fs');
    const findingsDir = path.join(__dirname, 'findings');
    try {
      const targets = fs.readdirSync(findingsDir).filter(f => fs.statSync(path.join(findingsDir, f)).isDirectory());
      const result = {};
      for (const t of targets) {
        result[t] = fs.readdirSync(path.join(findingsDir, t)).filter(f => f.endsWith('.md'));
      }
      return res.end(JSON.stringify(result));
    } catch { return res.end(JSON.stringify({})); }
  }

  // Serve dashboard HTML
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(require('fs').readFileSync(path.join(__dirname, 'index.html')));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🏕️ GRANGER system online at http://127.0.0.1:${PORT}`);
  console.log('   👁️ Eye       → :3090 (Observer)');
  console.log('   👁️ Clear Eye → :3093 (Opportunity Hunter)');
  console.log('   🕶️ Dark Eye  → :3094 (Dark Web Intel)');
  console.log('   🖐️ Left      → :3089 (Offense)');
  console.log('   🖐️ Right     → :3091 (Defense)');
});
