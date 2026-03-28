#!/usr/bin/env node
/**
 * Map crypto earning platforms - scout the terrain
 */
const BrowserEngine = require('./browser-engine');
const fs = require('fs');

const SITES = [
  { name: 'freecash', url: 'https://freecash.com', signupUrl: 'https://freecash.com/register' },
  { name: 'cointiply', url: 'https://cointiply.com', signupUrl: 'https://cointiply.com/register' },
  { name: 'freebitco', url: 'https://freebitco.in', signupUrl: null },
  { name: 'timebucks', url: 'https://timebucks.com', signupUrl: null },
];

(async () => {
  const engine = new BrowserEngine();
  const results = {};

  for (const site of SITES) {
    console.log(`\n========== MAPPING: ${site.name} ==========`);
    results[site.name] = {};

    try {
      // Main page
      console.log(`Navigating to ${site.url}...`);
      await engine.goto(site.url, site.name);
      await new Promise(r => setTimeout(r, 3000)); // let page settle

      const title = await engine.getTitle(site.name);
      console.log(`Title: ${title}`);

      const text = await engine.getText(site.name);
      const links = await engine.getLinks(site.name);

      await engine.screenshot(site.name, `/tmp/${site.name}-main.png`);

      // Find signup/register links
      const signupLinks = links.filter(l =>
        /sign\s*up|register|create.*account|join|get\s*started/i.test(l.text + ' ' + l.href)
      );

      results[site.name].title = title;
      results[site.name].mainText = text.slice(0, 3000);
      results[site.name].signupLinks = signupLinks;
      results[site.name].navLinks = links.filter(l => l.text.length > 0 && l.text.length < 50).slice(0, 40);

      console.log(`Signup links found: ${signupLinks.length}`);
      signupLinks.forEach(l => console.log(`  - ${l.text} -> ${l.href}`));

      // Try signup page
      const signupUrl = site.signupUrl || (signupLinks.length > 0 ? signupLinks[0].href : null);
      if (signupUrl) {
        console.log(`Navigating to signup: ${signupUrl}`);
        await engine.goto(signupUrl, site.name);
        await new Promise(r => setTimeout(r, 3000));

        const signupText = await engine.getText(site.name);
        await engine.screenshot(site.name, `/tmp/${site.name}-signup.png`);

        // Find form fields
        const formFields = await engine.evaluate(() => {
          const inputs = document.querySelectorAll('input, select, textarea');
          return Array.from(inputs).map(el => ({
            tag: el.tagName,
            type: el.type || '',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            label: el.labels?.[0]?.innerText || '',
            required: el.required,
          }));
        }, site.name);

        // Check for CAPTCHAs
        const captchaCheck = await engine.evaluate(() => {
          const html = document.documentElement.innerHTML;
          const checks = {
            recaptcha: /recaptcha|g-recaptcha/i.test(html),
            hcaptcha: /hcaptcha/i.test(html),
            turnstile: /turnstile|cf-turnstile/i.test(html),
            captcha: /captcha/i.test(html),
            cloudflare: /cloudflare|cf-browser-verification/i.test(html),
          };
          // Also check for iframes
          const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
          checks.iframes = iframes.filter(s => /captcha|recaptcha|hcaptcha/i.test(s));
          return checks;
        }, site.name);

        results[site.name].signupUrl = signupUrl;
        results[site.name].signupText = signupText.slice(0, 3000);
        results[site.name].formFields = formFields;
        results[site.name].captchaCheck = captchaCheck;

        console.log(`Form fields: ${JSON.stringify(formFields, null, 2)}`);
        console.log(`CAPTCHA check: ${JSON.stringify(captchaCheck, null, 2)}`);
      }

    } catch (err) {
      console.error(`Error mapping ${site.name}: ${err.message}`);
      results[site.name].error = err.message;
      try {
        await engine.screenshot(site.name, `/tmp/${site.name}-error.png`);
      } catch(e) {}
    }
  }

  // Write raw results
  fs.writeFileSync('/tmp/platform-map-results.json', JSON.stringify(results, null, 2));
  console.log('\n✅ Raw results saved to /tmp/platform-map-results.json');

  await engine.disconnect();
})();
