#!/usr/bin/env node
// 🌉 Browser Bridge — Connects Granger to kj's browser
// Streams screenshots + accepts commands via WebSocket

const http = require('http');
const { chromium } = require('playwright');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const PORT = 3092;
let browser = null;
let page = null;
let clients = new Set();

async function initBrowser() {
  browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  page = await context.newPage();
  await page.goto('https://google.com');
  console.log('🌉 Browser ready');
  return page;
}

async function takeScreenshot() {
  if (!page) return null;
  try {
    return await page.screenshot({ type: 'jpeg', quality: 60 });
  } catch { return null; }
}

async function broadcastScreenshot() {
  const screenshot = await takeScreenshot();
  if (!screenshot) return;
  const base64 = screenshot.toString('base64');
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'screenshot', data: base64 }));
    }
  }
}

async function handleCommand(cmd) {
  if (!page) return { error: 'Browser not ready' };
  try {
    switch (cmd.action) {
      case 'goto':
        await page.goto(cmd.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        return { success: true, url: page.url() };
      
      case 'click':
        await page.mouse.click(cmd.x, cmd.y);
        return { success: true };
      
      case 'type':
        await page.keyboard.type(cmd.text, { delay: 30 });
        return { success: true };
      
      case 'press':
        await page.keyboard.press(cmd.key);
        return { success: true };
      
      case 'scroll':
        await page.mouse.wheel(0, cmd.deltaY || 300);
        return { success: true };
      
      case 'back':
        await page.goBack();
        return { success: true, url: page.url() };
      
      case 'forward':
        await page.goForward();
        return { success: true, url: page.url() };
      
      case 'screenshot':
        await broadcastScreenshot();
        return { success: true };
      
      case 'eval':
        const result = await page.evaluate(cmd.code);
        return { success: true, result: String(result).slice(0, 1000) };
      
      case 'fill':
        await page.fill(cmd.selector, cmd.value);
        return { success: true };
      
      case 'hover':
        await page.hover(cmd.selector);
        return { success: true };
      
      case 'select':
        await page.selectOption(cmd.selector, cmd.value);
        return { success: true };
      
      default:
        return { error: `Unknown action: ${cmd.action}` };
    }
  } catch(e) {
    return { error: e.message };
  }
}

// HTTP server for API + UI
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/' || url.pathname === '/bridge') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(fs.readFileSync(path.join(__dirname, 'bridge.html')));
  }

  if (url.pathname === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: browser ? 'ready' : 'loading',
      url: page?.url() || 'about:blank',
      clients: clients.size
    }));
  }

  res.writeHead(404);
  res.end('Not found');
});

// WebSocket for real-time control
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`Client connected (${clients.size} total)`);
  
  // Send initial screenshot
  broadcastScreenshot();
  
  ws.on('message', async (data) => {
    try {
      const cmd = JSON.parse(data);
      const result = await handleCommand(cmd);
      ws.send(JSON.stringify({ type: 'result', ...result }));
      // Send updated screenshot after action
      if (cmd.action !== 'screenshot') {
        setTimeout(broadcastScreenshot, 500);
      }
    } catch(e) {
      ws.send(JSON.stringify({ type: 'error', error: e.message }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client disconnected (${clients.size} total)`);
  });
});

// Periodic screenshot streaming
setInterval(() => {
  if (clients.size > 0) broadcastScreenshot();
}, 2000);

// Start
initBrowser().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌉 Browser Bridge on http://0.0.0.0:${PORT}`);
  });
}).catch(e => {
  console.error('Failed to start browser:', e.message);
  process.exit(1);
});
