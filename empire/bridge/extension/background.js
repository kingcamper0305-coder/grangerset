// Empire Bridge - Background Service Worker (Firefox MV3)
// Polls the Empire server for commands and dispatches them to content scripts

const SERVER = 'https://poor-suggesting-dealers-involving.trycloudflare.com';
const POLL_INTERVAL = 1000; // 1 second

let pollTimer = null;
let isActive = false;

function log(msg) {
  console.log(`[Empire Bridge] ${msg}`);
}

// Start polling
function startPolling() {
  if (pollTimer) return;
  isActive = true;
  log('Starting poll loop');
  poll();
}

function stopPolling() {
  isActive = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  log('Stopped polling');
}

async function poll() {
  if (!isActive) return;
  
  try {
    const resp = await fetch(`${SERVER}/poll`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
    const cmd = await resp.json();
    
    if (cmd && cmd.action) {
      log(`Got command: ${cmd.action}`);
      await handleCommand(cmd);
    }
  } catch (e) {
    log(`Poll error: ${e.message}`);
  }
  
  if (isActive) {
    pollTimer = setTimeout(poll, POLL_INTERVAL);
  }
}

async function handleCommand(cmd) {
  let result;
  
  try {
    // Commands that don't need a content script
    if (cmd.action === 'tabs') {
      const tabs = await browser.tabs.query({});
      result = {
        ok: true,
        tabs: tabs.map(t => ({ id: t.id, url: t.url, title: t.title, active: t.active }))
      };
    }
    else if (cmd.action === 'goto') {
      // Navigate the active tab or a specific tab
      let tabId = cmd.tabId;
      if (!tabId) {
        const [active] = await browser.tabs.query({ active: true, currentWindow: true });
        tabId = active.id;
      }
      await browser.tabs.update(tabId, { url: cmd.url });
      result = { ok: true, url: cmd.url };
    }
    else if (cmd.action === 'newtab') {
      const tab = await browser.tabs.create({ url: cmd.url || 'about:blank', active: cmd.active !== false });
      result = { ok: true, tabId: tab.id, url: tab.url };
    }
    else if (cmd.action === 'status') {
      result = { ok: true, active: isActive, server: SERVER };
    }
    // Commands that need a content script - dispatch to tab
    else {
      result = await dispatchToTab(cmd);
    }
  } catch (e) {
    result = { ok: false, error: e.message };
  }
  
  // Send result back
  try {
    await fetch(`${SERVER}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    });
    log(`Sent result: ${JSON.stringify(result).substring(0, 100)}`);
  } catch (e) {
    log(`Result send error: ${e.message}`);
  }
}

async function dispatchToTab(cmd) {
  let tabId = cmd.tabId;
  
  // If no tabId specified, use active tab
  if (!tabId) {
    const [active] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!active) return { ok: false, error: 'no active tab' };
    tabId = active.id;
  }
  
  try {
    // Ensure content script is injected (re-inject if needed)
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    }).catch(() => {}); // May already be injected, that's fine
    
    // Send message to content script
    const response = await browser.tabs.sendMessage(tabId, cmd);
    return response;
  } catch (e) {
    return { ok: false, error: `Tab dispatch error: ${e.message}` };
  }
}

// Listen for messages from content scripts or popup
browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'start') startPolling();
  if (msg.type === 'stop') stopPolling();
  if (msg.type === 'status') return Promise.resolve({ active: isActive });
});

// Auto-start polling on install
startPolling();

log('Background script loaded');
