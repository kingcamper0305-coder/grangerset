const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const PORT = 3088;

// Serve the dashboard
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
  } else if (req.url === '/api/status') {
    try {
      const uptime = execSync("uptime").toString().trim();
      const df = execSync("df -h / | tail -1").toString().trim();
      const free = execSync("free -h | grep Mem").toString().trim();
      const load = execSync("cat /proc/loadavg").toString().trim();
      const hostname = execSync("hostname").toString().trim();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ uptime, df, free, load, hostname }));
    } catch(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  } else if (req.url === '/api/processes') {
    try {
      const ps = execSync("ps aux --sort=-%cpu | head -20").toString().trim();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ processes: ps }));
    } catch(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  } else if (req.url === '/api/network') {
    try {
      const ss = execSync("ss -tuln 2>/dev/null | head -20 || netstat -tuln 2>/dev/null | head -20").toString().trim();
      const ip = execSync("curl -s ifconfig.me 2>/dev/null || hostname -I").toString().trim();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ listeners: ss, publicIp: ip }));
    } catch(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  } else if (req.url === '/api/eye/screenshot') {
    // Return a placeholder - actual screenshots go through OpenClaw browser tool
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ note: "Screenshots are captured via OpenClaw browser tool and pushed via SSE" }));
  } else if (req.url.startsWith('/api/exec') && req.method === 'GET') {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const cmd = url.searchParams.get('cmd');
    if (!cmd) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'No cmd parameter' }));
      return;
    }
    // Whitelist safe commands
    const safe = ['ls', 'cat', 'echo', 'date', 'whoami', 'pwd', 'df', 'free', 'uptime', 'ps', 'head', 'tail', 'wc'];
    const firstWord = cmd.trim().split(/\s+/)[0];
    if (!safe.includes(firstWord)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: `Command '${firstWord}' not in whitelist` }));
      return;
    }
    try {
      const out = execSync(cmd, { timeout: 10000 }).toString().trim();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ output: out }));
    } catch(e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ output: e.message }));
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Granger Eye running on http://127.0.0.1:${PORT}`);
});
