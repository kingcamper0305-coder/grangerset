/**
 * 🤖 BROWSER AUTOMATION ENGINE
 * Uses Browserless (cloud Chrome) for web automation
 * Can log into sites, fill forms, click buttons, scrape data
 */

const puppeteer = require('puppeteer-core');

const BROWSERLESS_URL = '`wss://production-sfo.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`';

class BrowserEngine {
  constructor() {
    this.browser = null;
    this.pages = new Map();
  }

  async connect() {
    if (this.browser) return this.browser;
    this.browser = await puppeteer.connect({
      browserWSEndpoint: BROWSERLESS_URL,
      defaultViewport: { width: 1280, height: 720 },
    });
    console.log('[Browser] ✅ Connected to Browserless');
    return this.browser;
  }

  async disconnect() {
    if (this.browser) {
      await this.browser.disconnect();
      this.browser = null;
      console.log('[Browser] Disconnected');
    }
  }

  async newPage(name = 'default') {
    const browser = await this.connect();
    const page = await browser.newPage();
    this.pages.set(name, page);
    return page;
  }

  async getPage(name = 'default') {
    return this.pages.get(name) || this.newPage(name);
  }

  /**
   * Navigate to a URL
   */
  async goto(url, pageName = 'default') {
    const page = await this.getPage(pageName);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log(`[Browser] Navigated to ${url}`);
    return page;
  }

  /**
   * Take screenshot
   */
  async screenshot(pageName = 'default', path = '/tmp/browser-screenshot.png') {
    const page = await this.getPage(pageName);
    await page.screenshot({ path, fullPage: false });
    console.log(`[Browser] Screenshot saved to ${path}`);
    return path;
  }

  /**
   * Get page content/text
   */
  async getText(pageName = 'default') {
    const page = await this.getPage(pageName);
    return page.evaluate(() => document.body.innerText);
  }

  /**
   * Get page title
   */
  async getTitle(pageName = 'default') {
    const page = await this.getPage(pageName);
    return page.title();
  }

  /**
   * Click an element
   */
  async click(selector, pageName = 'default') {
    const page = await this.getPage(pageName);
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.click(selector);
    console.log(`[Browser] Clicked: ${selector}`);
  }

  /**
   * Type text into an input
   */
  async type(selector, text, pageName = 'default') {
    const page = await this.getPage(pageName);
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.type(selector, text);
    console.log(`[Browser] Typed into ${selector}`);
  }

  /**
   * Fill a form field (clear first, then type)
   */
  async fill(selector, text, pageName = 'default') {
    const page = await this.getPage(pageName);
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.click(selector, { clickCount: 3 }); // select all
    await page.type(selector, text);
    console.log(`[Browser] Filled ${selector}`);
  }

  /**
   * Press a key
   */
  async press(key, pageName = 'default') {
    const page = await this.getPage(pageName);
    await page.keyboard.press(key);
  }

  /**
   * Wait for selector to appear
   */
  async waitFor(selector, pageName = 'default', timeout = 15000) {
    const page = await this.getPage(pageName);
    await page.waitForSelector(selector, { timeout });
  }

  /**
   * Evaluate JavaScript in the page
   */
  async evaluate(fn, pageName = 'default') {
    const page = await this.getPage(pageName);
    return page.evaluate(fn);
  }

  /**
   * Get all text content matching a selector
   */
  async queryText(selector, pageName = 'default') {
    const page = await this.getPage(pageName);
    return page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.innerText : null;
    }, selector);
  }

  /**
   * List all links on the page
   */
  async getLinks(pageName = 'default') {
    const page = await this.getPage(pageName);
    return page.evaluate(() => 
      Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.innerText.trim(),
        href: a.href,
      })).filter(a => a.text)
    );
  }

  /**
   * Close a page
   */
  async closePage(pageName = 'default') {
    const page = this.pages.get(pageName);
    if (page) {
      await page.close();
      this.pages.delete(pageName);
    }
  }
}

module.exports = BrowserEngine;

// Quick test if run directly
if (require.main === module) {
  (async () => {
    const engine = new BrowserEngine();
    await engine.goto('https://example.com');
    console.log('Title:', await engine.getTitle());
    console.log('Text:', (await engine.getText()).slice(0, 200));
    await engine.disconnect();
  })();
}
