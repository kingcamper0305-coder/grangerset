const http = require('http');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'client.html'));
const extDir = path.join(__dirname, 'extension');

let pendingCmd = null;
let lastResult = null;
let clientActive = false;
let lastPoll = 0;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  
  if (req.url === '/poll') {
    lastPoll = Date.now(); clientActive = true;
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(pendingCmd || {}));
    pendingCmd = null;
  } else if (req.url === '/result' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { lastResult = JSON.parse(body); console.log('Result:', body.substring(0,200)); res.writeHead(200); res.end('ok'); });
  } else if (req.url === '/cmd' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { pendingCmd = JSON.parse(body); lastResult = null; console.log('Cmd:', body.substring(0,100)); res.writeHead(200); res.end('{"ok":true}'); });
  } else if (req.url === '/status') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({active: clientActive, lastPoll, hasPending: pendingCmd !== null, lastResult}));
  } else if (req.url === '/result-check') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(lastResult || {}));
  } else if (req.url === '/install') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<html><body style="background:#0a0a0a;color:#fff;font-family:monospace;padding:20px"><h1>Install Empire Extension</h1><p>1. Download the files below</p><p>2. Firefox → about:debugging → This Firefox → Load Temporary Add-on</p><p>3. Select manifest.json</p><hr><a href="/extension/manifest.json" style="color:#e94560">manifest.json</a><br><a href="/extension/background.js" style="color:#e94560">background.js</a><br><a href="/extension/content.js" style="color:#e94560">content.js</a><br><a href="/extension/popup.html" style="color:#e94560">popup.html</a><br><a href="/extension/popup.js" style="color:#e94560">popup.js</a></body></html>');
  } else if (req.url === '/userscript') {
    res.writeHead(200, {'Content-Type': 'text/javascript'});
    res.end(fs.readFileSync(path.join(__dirname, 'empire-bridge.user.js')));
  } else if (req.url.startsWith('/extension/')) {
    const file = req.url.replace('/extension/', '');
    const filePath = path.join(extDir, file);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, {'Content-Type': file.endsWith('.json') ? 'application/json' : 'text/javascript'});
      res.end(fs.readFileSync(filePath));
    } else { res.writeHead(404); res.end('not found'); }
  } else {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(html);
  }
});

server.listen(8765, '0.0.0.0', () => console.log('Bridge on :8765'));
