#!/usr/bin/env node
// 🖐️ RIGHT HAND — Defense Agent
// Hardening, Patching, Building

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3091;

// Defensive operations
const DEFEND = {
  // System hardening audit
  audit: () => {
    const results = {};
    // Check open ports
    try { results.open_ports = execSync('ss -tuln | grep LISTEN', { timeout: 5000 }).toString(); } catch {}
    // Check firewall
    try { results.iptables = execSync('iptables -L -n 2>&1 | head -30', { timeout: 5000 }).toString(); } catch {}
    // Check SSH config
    try { results.ssh_config = execSync('grep -E "^(PermitRoot|PasswordAuth|Port |PubkeyAuth)" /etc/ssh/sshd_config 2>/dev/null', { timeout: 5000 }).toString(); } catch {}
    // Check for outdated packages
    try { results.updates = execSync('apt list --upgradable 2>/dev/null | head -20', { timeout: 15000 }).toString(); } catch {}
    // Check SUID binaries
    try { results.suid = execSync('find / -perm -4000 -type f 2>/dev/null | head -20', { timeout: 10000 }).toString(); } catch {}
    // Check world-writable files in key dirs
    try { results.world_writable = execSync('find /etc /usr/bin -perm -o+w -type f 2>/dev/null | head -10 || echo "None"', { timeout: 10000 }).toString(); } catch {}
    return results;
  },

  // Apply security patches
  patch: () => {
    const results = {};
    try { results.update = execSync('apt-get update -qq 2>&1', { timeout: 60000 }).toString(); } catch {}
    try { results.upgrade = execSync('DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq 2>&1 | tail -10', { timeout: 300000 }).toString(); } catch {}
    try { results.autoremove = execSync('apt-get autoremove -y -qq 2>&1 | tail -5', { timeout: 60000 }).toString(); } catch {}
    return results;
  },

  // Check for indicators of compromise from Left Hand findings
  remediate: (findingFile) => {
    // Read findings and suggest remediation
    try {
      const data = JSON.parse(fs.readFileSync(findingFile, 'utf8'));
      return { findings: data, status: 'Analyzed - manual review recommended' };
    } catch(e) {
      return { error: e.message };
    }
  },

  // Generate security report
  report: () => {
    const audit = DEFEND.audit();
    return {
      timestamp: new Date().toISOString(),
      hostname: execSync('hostname').toString().trim(),
      audit,
      summary: {
        open_ports_count: (audit.open_ports || '').split('\n').filter(Boolean).length,
        updates_available: (audit.updates || '').split('\n').filter(l => l.includes('/')).length,
        suid_binaries: (audit.suid || '').split('\n').filter(Boolean).length,
        world_writable: (audit.world_writable || '').split('\n').filter(l => l !== 'None' && Boolean(l)).length,
      }
    };
  }
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader('Content-Type', 'application/json');

  if (url.pathname === '/api/audit') {
    return res.end(JSON.stringify(DEFEND.audit()));
  }

  if (url.pathname === '/api/patch') {
    return res.end(JSON.stringify(DEFEND.patch()));
  }

  if (url.pathname === '/api/report') {
    return res.end(JSON.stringify(DEFEND.report()));
  }

  if (url.pathname === '/api/status') {
    return res.end(JSON.stringify({
      agent: 'right-hand',
      operations: Object.keys(DEFEND),
      uptime: process.uptime(),
    }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🖐️ RIGHT HAND running on http://127.0.0.1:${PORT}`);
  console.log('Defense operations:', Object.keys(DEFEND).join(', '));
});
