const http = require('http');
const fs = require('fs');
const path = require('path');

const API = 'http://localhost:8080';

const server = http.createServer((req, res) => {
  // Serve index.html
  if (req.url === '/' || req.url === '/index.html') {
    const file = path.join(__dirname, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Proxy /api/* to slotopol
  const apiPath = req.url.replace('/api', '');
  const url = new URL(apiPath, API);
  const opts = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: req.method,
    headers: { ...req.headers, host: url.host }
  };

  const proxy = http.request(opts, (pRes) => {
    res.writeHead(pRes.statusCode, pRes.headers);
    pRes.pipe(res);
  });

  proxy.on('error', (e) => {
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  });

  req.pipe(proxy);
});

server.listen(8888, '0.0.0.0', () => console.log('Casino on :8888 (UI + API proxy)'));
