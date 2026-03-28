// Empire Bridge - Content Script
// Injected into every page. Executes DOM commands from the background script.

(function() {
  // Prevent double injection
  if (window.__empireBridge) return;
  window.__empireBridge = true;

  // Floating status indicator
  const indicator = document.createElement('div');
  indicator.id = 'empire-indicator';
  indicator.style.cssText = `
    position: fixed; bottom: 10px; right: 10px; z-index: 2147483647;
    background: rgba(233,69,96,0.9); color: #fff; padding: 4px 10px;
    border-radius: 20px; font-size: 11px; font-family: monospace;
    cursor: pointer; pointer-events: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transition: opacity 0.3s;
  `;
  indicator.textContent = '⚡ Empire';
  indicator.title = 'Empire Bridge Active';
  indicator.onclick = () => indicator.style.display = 'none';
  
  if (document.body) {
    document.body.appendChild(indicator);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(indicator));
  }

  // Flash indicator on command execution
  function flash(msg) {
    indicator.textContent = `⚡ ${msg}`;
    indicator.style.background = 'rgba(0,200,100,0.9)';
    setTimeout(() => {
      indicator.textContent = '⚡ Empire';
      indicator.style.background = 'rgba(233,69,96,0.9)';
    }, 2000);
  }

  // Command handlers
  const handlers = {
    // Evaluate arbitrary JavaScript
    eval(cmd) {
      const result = eval(cmd.code);
      return { ok: true, value: String(result).substring(0, 10000) };
    },

    // Click an element
    click(cmd) {
      const el = document.querySelector(cmd.sel || cmd.selector);
      if (!el) return { ok: false, error: `Element not found: ${cmd.sel || cmd.selector}` };
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      el.click();
      return { ok: true, tag: el.tagName, text: el.textContent?.substring(0, 100) };
    },

    // Focus and type into an element
    type(cmd) {
      const el = document.querySelector(cmd.sel || cmd.selector);
      if (!el) return { ok: false, error: `Element not found: ${cmd.sel || cmd.selector}` };
      el.focus();
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        // Use native input setter to trigger React/Vue change handlers
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        )?.set || Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        )?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, cmd.text);
        } else {
          el.value = cmd.text;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        el.textContent = cmd.text;
      }
      return { ok: true, value: el.value || el.textContent?.substring(0, 200) };
    },

    // Fill a form field (clears first, then types)
    fill(cmd) {
      const el = document.querySelector(cmd.sel || cmd.selector);
      if (!el) return { ok: false, error: `Element not found: ${cmd.sel || cmd.selector}` };
      el.focus();
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(el, cmd.text);
      } else {
        el.value = cmd.text;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, value: el.value };
    },

    // Read element text/content
    read(cmd) {
      if (!cmd.sel && !cmd.selector) {
        // Return page info
        return {
          ok: true,
          url: location.href,
          title: document.title,
          text: document.body?.innerText?.substring(0, 5000) || ''
        };
      }
      const el = document.querySelector(cmd.sel || cmd.selector);
      if (!el) return { ok: false, error: `Element not found: ${cmd.sel || cmd.selector}` };
      return {
        ok: true,
        text: el.innerText?.substring(0, 5000),
        value: el.value,
        html: el.innerHTML?.substring(0, 5000),
        href: el.href,
        src: el.src,
        tag: el.tagName
      };
    },

    // Get page HTML
    html(cmd) {
      if (cmd.sel || cmd.selector) {
        const el = document.querySelector(cmd.sel || cmd.selector);
        if (!el) return { ok: false, error: `Element not found: ${cmd.sel || cmd.selector}` };
        return { ok: true, html: el.outerHTML.substring(0, 10000) };
      }
      return { ok: true, html: document.documentElement.outerHTML.substring(0, 30000) };
    },

    // Scroll the page
    scroll(cmd) {
      if (cmd.sel || cmd.selector) {
        const el = document.querySelector(cmd.sel || cmd.selector);
        if (el) el.scrollIntoView({ behavior: 'instant', block: cmd.block || 'center' });
        return { ok: true };
      }
      if (cmd.to === 'top') window.scrollTo(0, 0);
      else if (cmd.to === 'bottom') window.scrollTo(0, document.body.scrollHeight);
      else if (cmd.x !== undefined || cmd.y !== undefined) window.scrollTo(cmd.x || 0, cmd.y || 0);
      else window.scrollBy(0, cmd.delta || 500);
      return { ok: true, scrollY: window.scrollY };
    },

    // Wait for an element to appear
    async wait(cmd) {
      const timeout = cmd.timeout || 5000;
      const sel = cmd.sel || cmd.selector;
      const start = Date.now();
      
      while (Date.now() - start < timeout) {
        const el = document.querySelector(sel);
        if (el) {
          return { ok: true, found: true, text: el.textContent?.substring(0, 200) };
        }
        await new Promise(r => setTimeout(r, 200));
      }
      return { ok: false, error: `Timeout waiting for: ${sel}` };
    },

    // Select a dropdown option
    select(cmd) {
      const el = document.querySelector(cmd.sel || cmd.selector);
      if (!el) return { ok: false, error: `Element not found: ${cmd.sel || cmd.selector}` };
      el.value = cmd.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, value: el.value };
    },

    // Check if element exists
    exists(cmd) {
      const el = document.querySelector(cmd.sel || cmd.selector);
      return { ok: true, exists: !!el, visible: el ? el.offsetParent !== null : false };
    },

    // Get all matching elements info
    query(cmd) {
      const els = document.querySelectorAll(cmd.sel || cmd.selector);
      return {
        ok: true,
        count: els.length,
        elements: Array.from(els).slice(0, 20).map(el => ({
          tag: el.tagName,
          id: el.id,
          classes: el.className,
          text: el.textContent?.substring(0, 100),
          href: el.href,
          value: el.value,
          rect: el.getBoundingClientRect()
        }))
      };
    },

    // Get current page info
    info(cmd) {
      return {
        ok: true,
        url: location.href,
        title: document.title,
        scrollY: window.scrollY,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        bodyText: document.body?.innerText?.substring(0, 3000) || ''
      };
    },

    // Press a key on an element
    keypress(cmd) {
      const el = cmd.sel ? document.querySelector(cmd.sel || cmd.selector) : document.activeElement;
      if (!el) return { ok: false, error: 'No target element' };
      
      const key = cmd.key || 'Enter';
      el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keypress', { key, bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
      return { ok: true, key };
    },

    // Submit a form
    submit(cmd) {
      const el = cmd.sel ? document.querySelector(cmd.sel || cmd.selector) : document.querySelector('form');
      if (!el) return { ok: false, error: 'No form found' };
      el.submit();
      return { ok: true };
    },

    // Screenshot - get page dimensions for screenshot context
    screenshot(cmd) {
      return {
        ok: true,
        url: location.href,
        title: document.title,
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        note: 'Use browser.tabs.captureVisibleTab for actual screenshot'
      };
    },

    // Set attribute on element
    attr(cmd) {
      const el = document.querySelector(cmd.sel || cmd.selector);
      if (!el) return { ok: false, error: `Element not found` };
      el.setAttribute(cmd.attr, cmd.value);
      return { ok: true, attr: cmd.attr, value: cmd.value };
    },

    // Get attribute from element  
    getattr(cmd) {
      const el = document.querySelector(cmd.sel || cmd.selector);
      if (!el) return { ok: false, error: `Element not found` };
      return { ok: true, value: el.getAttribute(cmd.attr) };
    }
  };

  // Listen for commands from background script
  browser.runtime.onMessage.addListener((cmd) => {
    return new Promise(async (resolve) => {
      const action = cmd.action;
      const handler = handlers[action];
      
      if (!handler) {
        resolve({ ok: false, error: `Unknown action: ${action}` });
        return;
      }

      try {
        flash(action);
        const result = await handler(cmd);
        resolve(result);
      } catch (e) {
        resolve({ ok: false, error: e.message, stack: e.stack });
      }
    });
  });

  console.log('[Empire Bridge] Content script loaded on', location.href);
})();
