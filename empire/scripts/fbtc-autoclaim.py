#!/usr/bin/env python3
"""
Empire FreeBitco.in Auto-Claimer
Uses Playwright with cookies to auto-roll every hour.
Based on fbtc-claimer and fbtcAutoclaim from GitHub.
"""

import json
import time
import hashlib
from datetime import datetime
from random import randint, choice
import string

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Install playwright: pip3 install playwright && playwright install chromium")
    exit(1)

# === CONFIG ===
COOKIES_FILE = '/root/.openclaw/workspace/empire/scripts/fbtc-cookies.json'
USER_ID = '56001344'
CHECK_INTERVAL = 3660  # 1 hour + 1 min buffer

def load_cookies():
    """Load cookies from exported JSON"""
    raw = json.load(open(COOKIES_FILE))
    cookies = []
    for c in raw:
        cookie = {
            'name': c['name'],
            'value': c['value'],
            'domain': c.get('domain', 'freebitco.in'),
            'path': c.get('path', '/'),
        }
        if 'expirationDate' in c:
            cookie['expires'] = c['expirationDate']
        cookies.append(cookie)
    return cookies

def log(msg):
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{ts}] {msg}")

def attempt_roll(page):
    """Try to roll once"""
    try:
        # Navigate to home
        page.goto("https://freebitco.in/?op=home", wait_until="networkidle", timeout=30000)
        time.sleep(3)
        
        # Check if logged in
        logout = page.query_selector('a[href*=" logout"]')
        if not logout:
            log("❌ Not logged in - cookies may have expired")
            return False
        
        log("✅ Logged in!")
        
        # Get balance
        balance_el = page.query_selector('#balance')
        if balance_el:
            log(f"💰 Balance: {balance_el.text_content()} BTC")
        
        # Check if roll is available
        roll_btn = page.query_selector('#free_play_form_button')
        if not roll_btn:
            log("❌ Roll button not found")
            return False
        
        btn_text = roll_btn.get_attribute('value') or roll_btn.text_content()
        log(f"🎰 Button: {btn_text}")
        
        if 'ROLL' not in btn_text.upper() and 'PLAY' not in btn_text.upper():
            log("⏳ Not ready to roll yet")
            # Try to get countdown
            cd = page.evaluate("() => { try { return title_countdown; } catch(e) { return null; } }")
            if cd:
                log(f"⏱️ Next roll in ~{cd} seconds")
            return True  # Not an error, just waiting
        
        # Click "Play Without Captchas" if available
        nocaptcha = page.query_selector('#play_without_captchas_button')
        if nocaptcha:
            log("🔓 Clicking 'Play Without Captchas'...")
            nocaptcha.click()
            time.sleep(2)
        
        # Click roll
        log("🎰 Clicking ROLL...")
        roll_btn.click()
        time.sleep(5)
        
        # Check result
        page.reload(wait_until="networkidle")
        time.sleep(2)
        
        balance_el = page.query_selector('#balance')
        if balance_el:
            log(f"💰 New balance: {balance_el.text_content()} BTC")
        
        log("✅ Roll completed!")
        return True
        
    except Exception as e:
        log(f"❌ Error: {e}")
        return False

def main():
    log("🏗️ Empire FreeBitco.in Auto-Claimer starting...")
    
    cookies = load_cookies()
    log(f"🍪 Loaded {len(cookies)} cookies")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        # Add cookies
        context.add_cookies(cookies)
        page = context.new_page()
        
        roll_count = 0
        while True:
            log(f"--- Roll #{roll_count + 1} ---")
            success = attempt_roll(page)
            
            if success:
                roll_count += 1
            
            log(f"💤 Sleeping {CHECK_INTERVAL}s until next roll...")
            time.sleep(CHECK_INTERVAL)

if __name__ == '__main__':
    main()
