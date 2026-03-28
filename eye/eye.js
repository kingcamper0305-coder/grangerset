/**
 * 👁️ EYE — Visual Perception System
 * Takes screenshots, reads what's on screen, understands UI
 *
 * Required env vars:
 *   BROWSERLESS_URL — WebSocket endpoint for browserless/puppeteer
 */

const puppeteer = require('puppeteer-core');

class Eye {
  constructor() {
    this.browser = null;
    this.page = null;
    this.endpoint = process.env.BROWSERLESS_URL;
    if (!this.endpoint) {
      throw new Error('Missing BROWSERLESS_URL environment variable');
    }
  }

  async connect() {
    if (this.browser) return;
    this.browser = await puppeteer.connect({ browserWSEndpoint: this.endpoint });
    this.page = await this.browser.newPage();
    console.log('[Eye] Connected to browser');
  }

  async disconnect() {
    if (this.browser) {
      await this.browser.disconnect();
      this.browser = null;
      this.page = null;
    }
  }

  async _ensure() {
    if (!this.page) await this.connect();
  }

  /**
   * Take a screenshot and extract page info.
   * @param {string} [url] — Navigate to this URL first
   * @param {object} [opts] — Options
   * @param {string} [opts.screenshotPath] — Where to save screenshot
   * @param {number} [opts.timeout] — Navigation timeout in ms
   */
  async see(url, opts = {}) {
    await this._ensure();
    const screenshotPath = opts.screenshotPath || '/tmp/eye-see.png';
    const timeout = opts.timeout || 20000;

    if (url) await this.page.goto(url, { waitUntil: 'networkidle2', timeout });

    const screenshot = await this.page.screenshot({ path: screenshotPath });
    const title = await this.page.title();
    const currentUrl = this.page.url();

    const elements = await this.page.evaluate(() => {
      const els = document.querySelectorAll('input, button, a, select, textarea, [role="button"]');
      return Array.from(els)
        .filter(e => e.offsetParent !== null)
        .map(e => ({
          tag: e.tagName,
          type: e.type || '',
          id: e.id || '',
          name: e.name || '',
          text: (e.innerText || e.value || '').substring(0, 100),
          placeholder: e.placeholder || '',
          href: e.href || '',
          visible: true,
        }));
    });

    const bodyText = await this.page.evaluate(() => document.body.innerText.substring(0, 3000));

    return { url: currentUrl, title, screenshot: screenshotPath, elements, bodyText };
  }

  async findText(text) {
    await this._ensure();
    return this.page.evaluate((t) => {
      const body = document.body.innerText;
      return body.includes(t) ? { found: true, index: body.indexOf(t) } : { found: false };
    }, text);
  }

  async clickAt(selector) {
    await this._ensure();
    const el = await this.page.$(selector);
    if (el) { await el.click(); return { ok: true }; }
    return { ok: false, error: 'Element not found: ' + selector };
  }

  async typeAt(selector, text) {
    await this._ensure();
    const el = await this.page.$(selector);
    if (el) {
      await el.click({ clickCount: 3 });
      await el.type(text, { delay: 30 });
      return { ok: true };
    }
    return { ok: false, error: 'Element not found: ' + selector };
  }

  async waitFor(selector, timeout = 10000) {
    await this._ensure();
    try {
      await this.page.waitForSelector(selector, { timeout });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Timed out waiting for: ' + selector };
    }
  }

  async getCurrentState() {
    await this._ensure();
    return {
      url: this.page.url(),
      title: await this.page.title(),
      elementCount: await this.page.evaluate(() =>
        Array.from(document.querySelectorAll('input, button, a'))
          .filter(e => e.offsetParent !== null).length
      ),
    };
  }
}

module.exports = Eye;

if (require.main === module) {
  (async () => {
    const eye = new Eye();
    try {
      const vision = await eye.see(process.argv[2] || 'https://example.com');
      console.log('URL:', vision.url);
      console.log('Title:', vision.title);
      console.log('Elements:', vision.elements.length);
      console.log('Screenshot:', vision.screenshot);
    } finally {
      await eye.disconnect();
    }
  })();
}
