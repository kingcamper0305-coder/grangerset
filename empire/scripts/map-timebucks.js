#!/usr/bin/env node
const BrowserEngine = require('./browser-engine');

(async () => {
  const engine = new BrowserEngine();

  // TimeBucks
  console.log('=== TIMEBUCKS ===');
  await engine.goto('https://timebucks.com', 'tb');
  await new Promise(r => setTimeout(r, 3000));

  // Click the Sign Up link to open modal
  try {
    await engine.click('a[href*="void"]', 'tb');
    await new Promise(r => setTimeout(r, 2000));
  } catch(e) {
    console.log('Click failed, trying other selectors...');
    // Try clicking any sign up button
    await engine.evaluate(() => {
      const links = document.querySelectorAll('a, button');
      for (const l of links) {
        if (/sign\s*up/i.test(l.innerText)) {
          l.click();
          return true;
        }
      }
      return false;
    }, 'tb');
    await new Promise(r => setTimeout(r, 2000));
  }

  await engine.screenshot('tb', '/tmp/timebucks-modal.png');

  const formFields = await engine.evaluate(() => {
    const inputs = document.querySelectorAll('input, select, textarea');
    return Array.from(inputs).map(el => ({
      tag: el.tagName,
      type: el.type || '',
      name: el.name || '',
      id: el.id || '',
      placeholder: el.placeholder || '',
      label: el.labels?.[0]?.innerText || '',
      visible: el.offsetParent !== null,
    }));
  }, 'tb');

  console.log('Form fields:', JSON.stringify(formFields.filter(f => f.visible), null, 2));

  const captchaCheck = await engine.evaluate(() => {
    const html = document.documentElement.innerHTML;
    return {
      recaptcha: /recaptcha|g-recaptcha/i.test(html),
      hcaptcha: /hcaptcha/i.test(html),
      turnstile: /turnstile/i.test(html),
      captcha: /captcha/i.test(html),
    };
  }, 'tb');
  console.log('CAPTCHA:', JSON.stringify(captchaCheck));

  // Get all text on page
  const text = await engine.getText('tb');
  console.log('Page text (first 2000):', text.slice(0, 2000));

  // FreeBitco.in - check the Free BTC page
  console.log('\n=== FREEBITCO FREE BTC PAGE ===');
  await engine.goto('https://freebitco.in/', 'fb');
  await new Promise(r => setTimeout(r, 3000));

  const fbLinks = await engine.getLinks('fb');
  const freeBtcLinks = fbLinks.filter(l => /free\s*btc|roll|faucet|play/i.test(l.text + ' ' + l.href));
  console.log('Free BTC / Roll links:', JSON.stringify(freeBtcLinks, null, 2));

  // Look for the roll/free btc button
  const rollInfo = await engine.evaluate(() => {
    const elements = document.querySelectorAll('a, button, [onclick]');
    const matches = [];
    for (const el of elements) {
      const text = el.innerText || el.textContent || '';
      const onclick = el.getAttribute('onclick') || '';
      if (/roll|free\s*btc|play|claim|faucet/i.test(text + onclick)) {
        matches.push({
          tag: el.tagName,
          text: text.trim().slice(0, 100),
          href: el.href || '',
          onclick: onclick.slice(0, 200),
          id: el.id || '',
          class: el.className?.slice?.(0, 100) || '',
        });
      }
    }
    return matches;
  }, 'fb');
  console.log('Roll/Free BTC elements:', JSON.stringify(rollInfo, null, 2));

  await engine.disconnect();
})();
