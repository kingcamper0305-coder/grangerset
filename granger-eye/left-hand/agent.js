#!/usr/bin/env node
// 🖐️ LEFT HAND — Offensive Security Agent
// Kali Arsenal Controller

const http = require('http');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3089;
const FINDINGS_DIR = path.join(__dirname, '..', 'findings');
const WORDLISTS = '/usr/share/seclists';

// Tool inventory
const ARSENAL = {
  recon: {
    nmap:      { bin: '/usr/bin/nmap',      desc: 'Port scanner & service detection' },
    masscan:   { bin: '/usr/bin/masscan',    desc: 'High-speed port scanner' },
    whatweb:   { bin: '/usr/bin/whatweb',    desc: 'Web technology fingerprinting' },
    dnsrecon:  { bin: '/usr/bin/dnsrecon',   desc: 'DNS enumeration' },
    fierce:    { bin: '/usr/bin/fierce',      desc: 'DNS reconnaissance' },
    nbtscan:   { bin: '/usr/bin/nbtscan',    desc: 'NetBIOS scanner' },
    enum4linux:{ bin: '/usr/local/bin/enum4linux', desc: 'SMB/NetBIOS enumeration' },
  },
  web: {
    nikto:     { bin: '/usr/bin/nikto',      desc: 'Web server scanner' },
    sqlmap:    { bin: '/usr/bin/sqlmap',     desc: 'SQL injection automation' },
    gobuster:  { bin: '/usr/bin/gobuster',   desc: 'Directory/DNS/vhost busting' },
    ffuf:      { bin: '/root/go/bin/ffuf',   desc: 'Fast web fuzzer' },
    dirb:      { bin: '/usr/bin/dirb',       desc: 'Web content scanner' },
    sslscan:   { bin: '/usr/bin/sslscan',    desc: 'SSL/TLS scanner' },
  },
  exploit: {
    searchsploit: { bin: '/usr/local/bin/searchsploit', desc: 'Exploit-DB search' },
  },
  password: {
    hydra:     { bin: '/usr/bin/hydra',      desc: 'Login cracker' },
    medusa:    { bin: '/usr/bin/medusa',     desc: 'Parallel login cracker' },
    crunch:    { bin: '/usr/bin/crunch',     desc: 'Wordlist generator' },
    cewl:      { bin: '/usr/bin/cewl',       desc: 'Custom wordlist from website' },
  },
  analysis: {
    tcpdump:   { bin: '/usr/bin/tcpdump',    desc: 'Packet capture' },
    strings:   { bin: '/usr/bin/strings',    desc: 'Extract printable strings' },
  },
};

// Check tool availability
function checkTool(name) {
  for (const cat of Object.values(ARSENAL)) {
    if (cat[name]) {
      try {
        execSync(`test -x ${cat[name].bin}`);
        return { available: true, ...cat[name] };
      } catch { return { available: false, ...cat[name] }; }
    }
  }
  return { available: false, desc: 'Unknown tool' };
}

// Execute a tool safely
function executeTool(tool, args, timeout = 300000) {
  const info = checkTool(tool);
  if (!info.available) return { error: `${tool} not available` };

  // Sanitize args - no shell metacharacters in dangerous positions
  const sanitized = args.replace(/[;&|`$(){}]/g, '');
  const cmd = `${info.bin} ${sanitized}`;

  try {
    const output = execSync(cmd, {
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf8',
    });
    return { tool, cmd, output, success: true };
  } catch(e) {
    return { tool, cmd, output: e.stdout || e.message, success: false };
  }
}

// Save findings
function saveFinding(target, tool, data) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(FINDINGS_DIR, target.replace(/[^a-zA-Z0-9.-]/g, '_'));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${tool}_${ts}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

// Pentest workflow
function runPentestWorkflow(target) {
  const results = [];

  // Phase 1: Recon
  results.push({ phase: 'recon', tool: 'nmap', ...executeTool('nmap', `-sV -sC -O --top-ports 1000 ${target}`) });

  // Phase 2: Web scan if ports found
  const nmapOut = results[0].output || '';
  if (nmapOut.includes('80/tcp') || nmapOut.includes('443/tcp')) {
    const proto = nmapOut.includes('443/tcp') ? 'https' : 'http';
    results.push({ phase: 'web', tool: 'nikto', ...executeTool('nikto', `-h ${proto}://${target}`, 120000) });
    results.push({ phase: 'web', tool: 'whatweb', ...executeTool('whatweb', `${proto}://${target}`) });
  }

  // Save findings
  const saved = saveFinding(target, 'full-pentest', { target, timestamp: new Date().toISOString(), results });
  return { target, phases: results, saved };
}

// HTTP API
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader('Content-Type', 'application/json');

  // Arsenal inventory
  if (url.pathname === '/api/arsenal') {
    const inv = {};
    for (const [cat, tools] of Object.entries(ARSENAL)) {
      inv[cat] = {};
      for (const [name, info] of Object.entries(tools)) {
        inv[cat][name] = checkTool(name);
      }
    }
    return res.end(JSON.stringify(inv));
  }

  // Execute a tool
  if (url.pathname === '/api/run') {
    const tool = url.searchParams.get('tool');
    const args = url.searchParams.get('args') || '';
    if (!tool) return res.end(JSON.stringify({ error: 'Missing tool parameter' }));
    const result = executeTool(tool, args);
    if (result.success) saveFinding('adhoc', tool, result);
    return res.end(JSON.stringify(result));
  }

  // Full pentest workflow
  if (url.pathname === '/api/pentest') {
    const target = url.searchParams.get('target');
    if (!target) return res.end(JSON.stringify({ error: 'Missing target parameter' }));
    const result = runPentestWorkflow(target);
    return res.end(JSON.stringify(result));
  }

  // Search exploits
  if (url.pathname === '/api/search') {
    const query = url.searchParams.get('q');
    if (!query) return res.end(JSON.stringify({ error: 'Missing q parameter' }));
    return res.end(JSON.stringify(executeTool('searchsploit', `-j ${query}`)));
  }

  // List findings
  if (url.pathname === '/api/findings') {
    try {
      const dirs = fs.readdirSync(FINDINGS_DIR);
      const findings = {};
      for (const d of dirs) {
        findings[d] = fs.readdirSync(path.join(FINDINGS_DIR, d));
      }
      return res.end(JSON.stringify(findings));
    } catch { return res.end(JSON.stringify({})); }
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🖐️ LEFT HAND running on http://127.0.0.1:${PORT}`);
  console.log('Arsenal loaded:', Object.values(ARSENAL).reduce((a,c) => a + Object.keys(c).length, 0), 'tools');
});
