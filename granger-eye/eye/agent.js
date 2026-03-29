#!/usr/bin/env node
// 👁️ EYE — Observer Agent
// Reconnaissance & Monitoring

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3090;
const FINDINGS_DIR = path.join(__dirname, '..', 'findings');

// Observation modes
const OBSERVE = {
  // Passive recon - DNS, whois, subdomains
  passive: (target) => {
    const results = {};
    try { results.dig = execSync(`dig ${target} ANY +short 2>&1`, { timeout: 10000 }).toString(); } catch {}
    try { results.whois = execSync(`whois ${target} 2>&1 | head -50`, { timeout: 15000 }).toString(); } catch {}
    try { results.dnsrecon = execSync(`/usr/bin/dnsrecon -d ${target} 2>&1 | head -100`, { timeout: 30000 }).toString(); } catch {}
    return results;
  },

  // Active scan - ports + services
  active: (target) => {
    const results = {};
    try {
      results.nmap_quick = execSync(`/usr/bin/nmap -T4 --top-ports 100 ${target} 2>&1`, { timeout: 60000 }).toString();
    } catch {}
    try {
      results.nmap_services = execSync(`/usr/bin/nmap -sV -sC --top-ports 1000 ${target} 2>&1`, { timeout: 300000 }).toString();
    } catch {}
    return results;
  },

  // Web observation
  web: (target) => {
    const results = {};
    const url = target.startsWith('http') ? target : `http://${target}`;
    try { results.whatweb = execSync(`/usr/bin/whatweb ${url} 2>&1`, { timeout: 30000 }).toString(); } catch {}
    try { results.headers = execSync(`curl -sI ${url} 2>&1`, { timeout: 10000 }).toString(); } catch {}
    try { results.tech = execSync(`curl -s ${url} 2>&1 | head -200`, { timeout: 10000 }).toString(); } catch {}
    return results;
  },

  // Monitor this host
  hostMonitor: () => {
    const results = {};
    try { results.connections = execSync('ss -tuln 2>/dev/null', { timeout: 5000 }).toString(); } catch {}
    try { results.processes = execSync('ps aux --sort=-%cpu | head -15', { timeout: 5000 }).toString(); } catch {}
    try { results.auth = execSync('last -10 2>/dev/null || echo "no last log"', { timeout: 5000 }).toString(); } catch {}
    try { results.failed_logins = execSync('grep "Failed password" /var/log/auth.log 2>/dev/null | tail -10 || echo "no auth log"', { timeout: 5000 }).toString(); } catch {}
    return results;
  },

  // Threat indicator scan
  threatHunt: () => {
    const results = {};
    // Check for suspicious processes
    try {
      results.suspicious_procs = execSync(
        `ps aux | grep -iE '(miner|xmrig|cryptonight|nc |ncat|netcat|reverse|shell|backdoor|meterpreter)' | grep -v grep || echo "None found"`,
        { timeout: 5000 }
      ).toString();
    } catch {}
    // Check for unusual network connections
    try {
      results.established = execSync(
        `ss -tnp | grep ESTAB | awk '{print $4, $5}' | sort | uniq -c | sort -rn | head -20`,
        { timeout: 5000 }
      ).toString();
    } catch {}
    // Check crontabs
    try { results.crontabs = execSync('for u in $(cut -f1 -d: /etc/passwd); do echo "=== $u ==="; crontab -u $u -l 2>/dev/null; done', { timeout: 10000 }).toString(); } catch {}
    return results;
  }
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader('Content-Type', 'application/json');

  if (url.pathname === '/api/observe') {
    const mode = url.searchParams.get('mode') || 'hostMonitor';
    const target = url.searchParams.get('target') || '';

    if (mode === 'hostMonitor' || mode === 'threatHunt') {
      const data = OBSERVE[mode]();
      return res.end(JSON.stringify({ mode, data, timestamp: new Date().toISOString() }));
    }

    if (!target) return res.end(JSON.stringify({ error: 'Target required for this mode' }));
    const data = OBSERVE[mode](target);

    // Save findings
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.join(FINDINGS_DIR, target.replace(/[^a-zA-Z0-9.-]/g, '_'));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `eye_${mode}_${ts}.json`), JSON.stringify(data, null, 2));

    return res.end(JSON.stringify({ mode, target, data, timestamp: new Date().toISOString() }));
  }

  if (url.pathname === '/api/status') {
    return res.end(JSON.stringify({
      agent: 'eye',
      modes: Object.keys(OBSERVE),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`👁️ EYE running on http://127.0.0.1:${PORT}`);
  console.log('Observation modes:', Object.keys(OBSERVE).join(', '));
});
