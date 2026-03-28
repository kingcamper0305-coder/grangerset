#!/usr/bin/env python3
"""
Botright CAPTCHA Solver Test
Uses Botright (undetected Playwright + hcaptcha_challenger) to solve CAPTCHAs.
"""
import asyncio
import sys
import os

async def test_botright():
    print("=" * 60)
    print("Botright CAPTCHA Solver Test")
    print("=" * 60)
    
    try:
        import botright
        print(f"✅ Botright imported successfully")
        print(f"   Location: {botright.__file__}")
    except ImportError as e:
        print(f"❌ Botright import failed: {e}")
        print("   Botright has complex dependency conflicts.")
        print("   Use NopeCHA or Playwright-based approaches instead.")
        return False
    
    try:
        print("\n🔧 Creating Botright browser instance...")
        botright_client = await botright.Botright()
        browser = await botright_client.new_browser()
        page = await browser.new_page()
        
        print("🔧 Navigating to hCaptcha demo...")
        await page.goto('https://nopecha.com/demo/hcaptcha', timeout=30000)
        await page.wait_for_timeout(3000)
        
        # Screenshot
        screenshot_path = '/root/.openclaw/workspace/empire/tools/botright_hcaptcha.png'
        await page.screenshot(path=screenshot_path)
        print(f"📸 Screenshot saved: {screenshot_path}")
        
        # Check for captcha
        content = await page.content()
        has_captcha = 'hcaptcha' in content.lower()
        print(f"hCaptcha detected: {has_captcha}")
        
        if has_captcha:
            print("\n🔧 Botright should auto-solve captchas on interaction...")
            print("   Attempting to find and click checkbox...")
            try:
                # Try to find hCaptcha checkbox in iframes
                for frame in page.frames:
                    if 'hcaptcha' in (frame.url or '').lower():
                        checkbox = await frame.query_selector('#checkbox')
                        if checkbox:
                            await checkbox.click()
                            print("   Clicked hCaptcha checkbox!")
                            break
                
                await page.wait_for_timeout(15000)
                await page.screenshot(path='/root/.openclaw/workspace/empire/tools/botright_after_solve.png')
                print("📸 After-solve screenshot saved")
                
                final = await page.content()
                solved = 'thank you' in final.lower() or 'solved' in final.lower()
                print(f"\n{'✅ CAPTCHA appears solved!' if solved else '❌ CAPTCHA not solved'}")
            except Exception as e:
                print(f"   Solve attempt error: {e}")
        
        await botright_client.close()
        return True
        
    except Exception as e:
        print(f"\n❌ Botright test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    result = asyncio.run(test_botright())
    sys.exit(0 if result else 1)
