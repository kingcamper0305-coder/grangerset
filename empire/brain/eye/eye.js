/**
 * 👁️ EYE - Visual Perception System
 * Takes screenshots, reads what's on screen, understands UI
 */

const puppeteer = require('puppeteer-core');

const BROWSERLESS_URL = 'wss://production-sfo.browserless.io?token=2UE6kEHUkn0qLKta2cb1e095955529b68f7312b55184677d6';

class Eye {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async connect() {
    if (this.browser) return;
    this.browser = await puppeteer.connect({ browserWSEndpoint: BROWSERLESS_URL });
    this.page = await this.browser.newPage();
    console.log('[Eye] Connected to Browserless');
  }

  async disconnect() {
    if (this.browser) {
      await this.browser.disconnect();
      this.browser = null;
      this.page = null;
    }
  }

  async see(url) {
    await this.connect();
    if (url) await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    
    const screenshot = await this.page.screenshot({ path: '/tmp/eye-see.png' });
    const title = await this.page.title();
    const currentUrl = this.page.url();
    
    // Get all visible elements
    const elements = await this.page.evaluate(() => {
      const els = document.querySelectorAll('input, button, a, select, textarea');
      return Array.from(els).filter(e => e.offsetParent !== null).map(e => ({
        tag: e.tagName,
        type: e.type || '',
        id: e.id || '',
        name: e.name || '',
        text: (e.innerText || e.value || '').substring(0, 100),
        placeholder: e.placeholder || '',
        visible: true
      }));
    });
    
    return {
      url: currentUrl,
      title,
      screenshot: '/tmp/eye-see.png',
      elements,
      bodyText: await this.page.evaluate(() => document.body.innerText.substring(0, 2000))
    };
  }

  async findText(text) {
    await this.connect();
    return await this.page.evaluate((t) => {
      const body = document.body.innerText;
      return body.includes(t) ? { found: true, index: body.indexOf(t) } : { found: false };
    }, text);
  }

  async clickAt(selector) {
    await this.connect();
    const el = await this.page.$(selector);
    if (el) { await el.click(); return { ok: true }; }
    return { ok: false, error: 'not found' };
  }

  async typeAt(selector, text) {
    await this.connect();
    const el = await this.page.$(selector);
    if (el) {
      await el.click({ clickCount: 3 });
      await el.type(text, { delay: 30 });
      return { ok: true };
    }
    return { ok: false, error: 'not found' };
  }

  async getCurrentState() {
    await this.connect();
    return {
      url: this.page.url(),
      title: await this.page.title(),
      elements: await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('input, button, a')).filter(e => e.offsetParent !== null).length;
      })
    };
  }
}

module.exports = Eye;

if (require.main === module) {
  (async () => {
    const eye = new Eye();
    const vision = await eye.see('https://example.com');
    console.log('URL:', vision.url);
    console.log('Title:', vision.title);
    console.log('Elements:', vision.elements.length);
    console.log('Screenshot:', vision.screenshot);
    await eye.disconnect();
  })();
}
