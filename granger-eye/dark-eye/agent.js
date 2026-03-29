#!/usr/bin/env node
// 🕶️ DARK EYE — Dark Web Intelligence
// Watches the dark web for opportunities, leaks, and threats

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3094;
const FINDINGS_DIR = path.join(__dirname, '..', 'findings');
const TOR_PROXY = 'socks5h://127.0.0.1:9050';

// Helper: curl via Tor
function torCurl(url, timeout = 20000) {
  try {
    return execSync(
      `curl -s --socks5-hostname 127.0.0.1:9050 --max-time ${Math.floor(timeout/1000)} "${url}" 2>/dev/null`,
      { timeout: timeout + 2000 }
    ).toString();
  } catch { return ''; }
}

// Helper: curl clearnet (no Tor)
function curl(url, timeout = 10000) {
  try {
    return execSync(`curl -s --max-time ${Math.floor(timeout/1000)} "${url}" 2>/dev/null`, { timeout: timeout + 2000 }).toString();
  } catch { return ''; }
}

// Dark Web Sources
const DARK_SOURCES = {
  // Search engines (clearnet mirrors)
  ahmia: 'https://ahmia.fi/search/?q=',
  onionland: 'https://onionlandsearchengine.com/search?q=',
  
  // Leak databases (clearnet)
  haveibeenpwned: 'https://haveibeenpwned.com/api/v3/breaches',
  
  // Paste monitoring
  pastebin: 'https://scrape.pastebin.com/api_scraping.php?limit=10',
  
  // .onion leak forums (via Tor)
  onionSearches: [
    'exploit', 'database', 'leak', 'ransomware', 'zero-day',
    'credential', 'ransom', 'breach', 'hack', 'darknet'
  ]
};

// Scan Ahmia (dark web search engine)
async function scanAhmia(keywords) {
  const results = [];
  for (const keyword of keywords.slice(0, 3)) {
    try {
      const html = curl(`https://ahmia.fi/search/?q=${encodeURIComponent(keyword)}`, 15000);
      const links = html.match(/\/address\/[a-z0-9]+/g) || [];
      results.push({
        keyword,
        onionLinks: [...new Set(links)].slice(0, 5).map(l => l.replace('/address/', ''))
      });
    } catch {}
  }
  return results;
}

// Scan for leaked data via paste sites
async function scanPasteSites() {
  const findings = [];
  
  try {
    const pastes = curl('https://scrape.pastebin.com/api_scraping.php?limit=10', 10000);
    try {
      const items = JSON.parse(pastes);
      for (const item of items) {
        const title = (item.title || '').toLowerCase();
        const suspicious = title.match(/leak|dump|breach|password|database|hack|exploit|credential|admin|root|ssh|ftp|smtp/);
        if (suspicious) {
          findings.push({
            source: 'pastebin',
            title: item.title,
            key: item.key,
            date: item.date,
            size: item.size,
            url: `https://pastebin.com/${item.key}`,
            risk: 'POTENTIAL_LEAK'
          });
        }
      }
    } catch {}
  } catch {}
  
  return findings;
}

// Scan breach databases
async function scanBreaches() {
  const findings = [];
  
  // Check HIBP for recent breaches (public list, no API key needed)
  try {
    const breaches = curl('https://haveibeenpwned.com/api/v3/breaches', 15000);
    try {
      const data = JSON.parse(breaches);
      const recent = Object.values(data)
        .filter(b => {
          const date = new Date(b.BreachDate);
          const daysAgo = (Date.now() - date) / (1000 * 60 * 60 * 24);
          return daysAgo < 30; // Last 30 days
        })
        .slice(0, 10)
        .map(b => ({
          name: b.Name,
          date: b.BreachDate,
          accounts: b.PwnedCount,
          data: b.DataClasses?.join(', '),
          description: b.Description?.slice(0, 200)
        }));
      findings.push(...recent);
    } catch {}
  } catch {}
  
  return findings;
}

// Scan dark web via Tor for intelligence
async function scanDarkWeb() {
  const results = [];
  
  // Check if Tor is ready
  const torCheck = curl('http://127.0.0.1:9051', 2000);
  
  // Search via Ahmia (clearnet, indexes .onion)
  const ahmiaResults = await scanAhmia(DARK_SOURCES.onionSearches);
  results.push({ source: 'ahmia', data: ahmiaResults });
  
  // Search via dark.fail (known darknet market uptime checker)
  try {
    const darkfail = curl('https://dark.fail/', 10000);
    if (darkfail) {
      const links = darkfail.match(/[a-z0-9]{56}\.onion/g) || [];
      results.push({ source: 'dark.fail', onionLinks: [...new Set(links)].slice(0, 10) });
    }
  } catch {}
  
  return results;
}

// Threat intelligence from dark web
async function gatherDarkIntel() {
  const intel = {};
  
  // Search for our own data exposure
  intel.selfCheck = {
    email: 'Kingcamper0305@gmail.com',
    note: 'Check HIBP for breaches (manual - needs API key for email-specific check)'
  };
  
  // Monitor for zero-day discussions
  intel.keywords = [
    'zero-day', '0day', 'exploit', 'ransomware', 'APT',
    'data breach', 'credential stuffing', 'darknet market'
  ];
  
  // Recent ransomware groups activity
  try {
    const ransomwatch = curl('https://raw.githubusercontent.com/joshhighet/ransomwatch/main/posts.json', 10000);
    try {
      const posts = JSON.parse(ransomwatch);
      intel.recentRansomware = posts
        .sort((a, b) => new Date(b.discovered) - new Date(a.discovered))
        .slice(0, 10)
        .map(p => ({
          group: p.group_name,
          victim: p.post_title,
          date: p.discovered,
          url: p.claim_url
        }));
    } catch {}
  } catch {}
  
  return intel;
}

// Full scan
async function fullScan() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Running Dark Eye scan...`);
  
  const results = {
    timestamp,
    pasteSites: await scanPasteSites(),
    breaches: await scanBreaches(),
    darkWeb: await scanDarkWeb(),
    darkIntel: await gatherDarkIntel(),
  };
  
  // Save
  const file = path.join(FINDINGS_DIR, 'dark-eye', `scan_${timestamp.replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(results, null, 2));
  
  return results;
}

// HTTP API
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader('Content-Type', 'application/json');

  if (url.pathname === '/api/scan') {
    const results = await fullScan();
    return res.end(JSON.stringify(results));
  }

  if (url.pathname === '/api/pastes') {
    const results = await scanPasteSites();
    return res.end(JSON.stringify(results));
  }

  if (url.pathname === '/api/breaches') {
    const results = await scanBreaches();
    return res.end(JSON.stringify(results));
  }

  if (url.pathname === '/api/darkweb') {
    const results = await scanDarkWeb();
    return res.end(JSON.stringify(results));
  }

  if (url.pathname === '/api/intel') {
    const results = await gatherDarkIntel();
    return res.end(JSON.stringify(results));
  }

  if (url.pathname === '/api/status') {
    return res.end(JSON.stringify({
      agent: 'dark-eye',
      port: PORT,
      tor: fs.existsSync('/var/run/tor/tor.pid') ? 'running' : 'unknown',
      sources: Object.keys(DARK_SOURCES),
      uptime: process.uptime(),
    }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🕶️ DARK EYE running on http://127.0.0.1:${PORT}`);
  console.log('Watching: Dark web, leaks, breaches, ransomware, threat intel');
});
