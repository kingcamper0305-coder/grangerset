/**
 * 🤘 Left Hand — Unconventional Operator
 * Recon, analysis, creative problem-solving
 */

const { exec } = require('child_process');
const https = require('https');
const http = require('http');

class LeftHand {
  constructor() {
    this.name = 'Left Hand';
    this.role = 'Unconventional Operator';
    this.log = [];
  }

  _record(action, detail) {
    const entry = { action, detail, time: new Date().toISOString() };
    this.log.push(entry);
    console.log(`[Left Hand] ${action}: ${detail}`);
    return entry;
  }

  /**
   * Run a command with timeout.
   */
  async _exec(cmd, timeout = 30000) {
    return new Promise((resolve) => {
      exec(cmd, { timeout }, (err, stdout, stderr) => {
        resolve({ ok: !err, stdout: stdout?.trim(), stderr: stderr?.trim(), error: err?.message });
      });
    });
  }

  /**
   * Port scan a target (basic).
   */
  async scan(target, ports = '21,22,80,443,3000,3306,5432,8080,8443') {
    this._record('scan', `${target} ports:${ports}`);
    const portList = ports.split(',').map(p => p.trim());
    const results = [];

    for (const port of portList) {
      const r = await this._exec(`timeout 3 bash -c 'echo >/dev/tcp/${target}/${port}' 2>&1 && echo "OPEN" || echo "CLOSED"`);
      results.push({ port: parseInt(port), status: r.stdout?.includes('OPEN') ? 'open' : 'closed' });
    }

    return { target, results, openPorts: results.filter(r => r.status === 'open').map(r => r.port) };
  }

  /**
   * HTTP recon — headers, status, tech detection.
   */
  async recon(url) {
    this._record('recon', url);
    return new Promise((resolve) => {
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, { timeout: 10000 }, (res) => {
        const headers = res.headers;
        const tech = [];
        if (headers['x-powered-by']) tech.push(headers['x-powered-by']);
        if (headers['server']) tech.push('server:' + headers['server']);
        if (headers['x-aspnet-version']) tech.push('ASP.NET');
        res.resume();
        res.on('end', () => {
          resolve({ ok: true, status: res.statusCode, headers, tech });
        });
      });
      req.on('error', (e) => resolve({ ok: false, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    });
  }

  /**
   * DNS lookup.
   */
  async dns(domain) {
    this._record('dns', domain);
    const [a, aaaa, mx, ns, txt] = await Promise.all([
      this._exec(`dig +short ${domain} A`),
      this._exec(`dig +short ${domain} AAAA`),
      this._exec(`dig +short ${domain} MX`),
      this._exec(`dig +short ${domain} NS`),
      this._exec(`dig +short ${domain} TXT`),
    ]);
    return {
      domain,
      A: a.stdout ? a.stdout.split('\n') : [],
      AAAA: aaaa.stdout ? aaaa.stdout.split('\n') : [],
      MX: mx.stdout ? mx.stdout.split('\n') : [],
      NS: ns.stdout ? ns.stdout.split('\n') : [],
      TXT: txt.stdout ? txt.stdout.split('\n') : [],
    };
  }

  /**
   * Check if a URL is alive and measure response time.
   */
  async ping(url) {
    this._record('ping', url);
    const start = Date.now();
    const r = await this.recon(url);
    const elapsed = Date.now() - start;
    return { ...r, responseMs: elapsed };
  }

  /**
   * Find exposed files/dirs on a web server.
   */
  async probe(baseUrl, paths = ['.env', '.git/config', 'robots.txt', 'sitemap.xml', 'wp-admin', '.well-known/security.txt']) {
    this._record('probe', baseUrl);
    const found = [];
    for (const p of paths) {
      const url = baseUrl.replace(/\/$/, '') + '/' + p;
      const r = await this.recon(url);
      if (r.ok && r.status < 400) {
        found.push({ path: p, status: r.status });
      }
    }
    return { baseUrl, found, total: paths.length };
  }

  getLog() { return this.log; }
}

module.exports = LeftHand;
