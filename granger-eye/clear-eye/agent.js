#!/usr/bin/env node
// 👁️ CLEAR EYE — Opportunity Hunter
// Watches the clear web for money-making opportunities 24/7

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3093;
const FINDINGS_DIR = path.join(__dirname, '..', 'findings');

// Clear Web Intelligence Sources
const SOURCES = {
  // Bug bounty platforms
  bugBounties: {
    hackerone: 'https://hackerone.com/directory/programs',
    bugcrowd: 'https://bugcrowd.com/programs',
    immunefi: 'https://immunefi.com/bounty/',
    intigriti: 'https://intigriti.com/programs',
  },
  
  // Crypto opportunities
  crypto: {
    airdrops_io: 'https://airdrops.io/latest/',
    drops_bot: 'https://drops.bot/airdrops/upcoming',
    coingecko_airdrops: 'https://www.coingecko.com/learn/new-crypto-airdrop-rewards',
  },
  
  // Freelance opportunities
  freelance: {
    fiverr_security: 'https://www.fiverr.com/search/gigs?query=security%20audit',
    upwork_security: 'https://www.upwork.com/search/jobs/?q=penetration%20testing',
  },
  
  // Vulnerability databases
  vulnDB: {
    nvd: 'https://nvd.nist.gov/vuln/search/results?form_type=Advanced&results_type=overview&search_type=all&isCpeNameSearch=false&cvss_version=3&cvss_v3_severity=CRITICAL',
    cve_org: 'https://www.cve.org/Downloads/CVERecordDownloadPage',
  },
  
  // Paste sites for leaked data
  pasteSites: {
    pastebin_recent: 'https://pastebin.com/archive',
    dpaste: 'https://dpaste.org/',
  }
};

// Scan for new bug bounty programs
async function scanBugBounties() {
  const results = [];
  try {
    // HackerOne - newest programs
    const h1 = execSync(`curl -s "https://hackerone.com/graphql" -H "Content-Type: application/json" -d '{"query":"{ search(type: TEAM, query: \\\"\\\", first: 20) { nodes { ... on Team { name handle url(offer_bounties: true) offers_bounties offers_swag } } } }"}' 2>/dev/null`, { timeout: 15000 }).toString();
    try {
      const data = JSON.parse(h1);
      if (data?.data?.search?.nodes) {
        results.push(...data.data.search.nodes.map(n => ({
          platform: 'HackerOne',
          name: n.name,
          handle: n.handle,
          bounties: n.offers_bounties,
          url: `https://hackerone.com/${n.handle}`
        })));
      }
    } catch {}
  } catch {}
  
  return results;
}

// Scan for crypto airdrops
async function scanAirdrops() {
  const results = [];
  try {
    // Check drops.bot
    const drops = execSync(`curl -sL "https://drops.bot/api/airdrops" 2>/dev/null | head -200`, { timeout: 15000 }).toString();
    results.push({ source: 'drops.bot', raw: drops.slice(0, 500) });
  } catch {}
  
  return results;
}

// Scan for leaked credentials and data breaches
async function scanBreaches() {
  const results = [];
  
  // Check recent pastebin dumps
  try {
    const pastes = execSync(`curl -s "https://scrape.pastebin.com/api_scraping.php?limit=5" 2>/dev/null`, { timeout: 10000 }).toString();
    try {
      const items = JSON.parse(pastes);
      for (const item of items) {
        // Look for sensitive keywords
        const title = (item.title || '').toLowerCase();
        if (title.match(/leak|dump|breach|password|database|hack|exploit|credential/)) {
          results.push({
            source: 'pastebin',
            title: item.title,
            key: item.key,
            date: item.date,
            url: `https://pastebin.com/${item.key}`
          });
        }
      }
    } catch {}
  } catch {}
  
  // Check NVD for new critical CVEs
  try {
    const nvd = execSync(`curl -s "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=5&cvssV3Severity=CRITICAL" 2>/dev/null`, { timeout: 15000 }).toString();
    try {
      const data = JSON.parse(nvd);
      if (data?.vulnerabilities) {
        for (const v of data.vulnerabilities.slice(0, 5)) {
          const cve = v.cve;
          results.push({
            source: 'NVD',
            cve: cve.id,
            description: cve.descriptions?.[0]?.value?.slice(0, 200),
            published: cve.published,
            score: cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore
          });
        }
      }
    } catch {}
  } catch {}
  
  return results;
}

// Scan for freelance security work
async function scanFreelance() {
  const results = [];
  // This would require authenticated API access
  // For now, track keywords
  return results;
}

// Threat intelligence gathering
async function gatherThreatIntel() {
  const intel = {};
  
  // Check our server for indicators
  try {
    intel.failed_logins = execSync(`grep "Failed password" /var/log/auth.log 2>/dev/null | tail -5 | awk '{print $11}' | sort -u`, { timeout: 5000 }).toString().trim().split('\n').filter(Boolean);
  } catch { intel.failed_logins = []; }
  
  // Check for suspicious outbound connections
  try {
    intel.outbound = execSync(`ss -tnp | grep ESTAB | awk '{print $5}' | cut -d: -f1 | sort -u | head -10`, { timeout: 5000 }).toString().trim().split('\n').filter(Boolean);
  } catch { intel.outbound = []; }
  
  return intel;
}

// Main scan cycle
async function fullScan() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Running Clear Eye scan...`);
  
  const results = {
    timestamp,
    bugBounties: await scanBugBounties(),
    airdrops: await scanAirdrops(),
    breaches: await scanBreaches(),
    freelance: await scanFreelance(),
    threatIntel: await gatherThreatIntel(),
  };
  
  // Save findings
  const file = path.join(FINDINGS_DIR, 'clear-eye', `scan_${timestamp.replace(/[:.]/g, '-')}.json`);
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

  if (url.pathname === '/api/bounties') {
    const results = await scanBugBounties();
    return res.end(JSON.stringify(results));
  }

  if (url.pathname === '/api/airdrops') {
    const results = await scanAirdrops();
    return res.end(JSON.stringify(results));
  }

  if (url.pathname === '/api/breaches') {
    const results = await scanBreaches();
    return res.end(JSON.stringify(results));
  }

  if (url.pathname === '/api/threats') {
    const results = await gatherThreatIntel();
    return res.end(JSON.stringify(results));
  }

  if (url.pathname === '/api/status') {
    return res.end(JSON.stringify({
      agent: 'clear-eye',
      port: PORT,
      sources: Object.keys(SOURCES),
      uptime: process.uptime(),
    }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`👁️ CLEAR EYE running on http://127.0.0.1:${PORT}`);
  console.log('Watching: Bug bounties, airdrops, breaches, freelance, threats');
});
