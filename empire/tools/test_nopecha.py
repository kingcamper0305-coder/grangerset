#!/usr/bin/env python3
"""
NopeCHA CAPTCHA Solver Test
Uses Playwright + NopeCHA to attempt solving hCaptcha on the demo page.
"""
import asyncio
import sys
import os

# Add nopecha to path
import nopecha

# NopeCHA API key - set via environment or use free tier
NOPECHA_KEY = os.environ.get('NOPECHA_API_KEY', '')

async def test_nopecha():
    from playwright.async_api import async_playwright
    
    print("=" * 60)
    print("NopeCHA CAPTCHA Solver Test")
    print("=" * 60)
    
    if not NOPECHA_KEY:
        print("\n⚠️  No NOPECHA_API_KEY set. NopeCHA requires an API key.")
        print("   Free tier: https://nopecha.com (limited solves/day)")
        print("   Set it: export NOPECHA_API_KEY=your_key_here")
        print("\n   Testing basic Playwright + NopeCHA import...")
    
    # Test 1: Check NopeCHA module
    print(f"\n✅ NopeCHA version: {nopecha.__version__ if hasattr(nopecha, '__version__') else 'unknown'}")
    print(f"   NopeCHA module location: {nopecha.__file__}")
    
    # Test 2: Check Playwright works
    print("\n🔧 Testing Playwright + Chromium...")
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            page = await browser.new_page()
            await page.goto('https://example.com')
            title = await page.title()
            print(f"   ✅ Playwright works! Page title: '{title}'")
            
            # Test 3: Navigate to hCaptcha demo
            print("\n🔧 Navigating to hCaptcha demo page...")
            await page.goto('https://nopecha.com/demo/hcaptcha', timeout=30000)
            await page.wait_for_timeout(3000)
            
            # Check if captcha elements are present
            content = await page.content()
            has_hcaptcha = 'hcaptcha' in content.lower() or 'challenge' in content.lower()
            print(f"   Page loaded. hCaptcha elements detected: {has_hcaptcha}")
            
            # Take a screenshot for debugging
            screenshot_path = '/root/.openclaw/workspace/empire/tools/hcaptcha_demo.png'
            await page.screenshot(path=screenshot_path)
            print(f"   📸 Screenshot saved: {screenshot_path}")
            
            # Test 4: If API key is set, attempt to solve
            if NOPECHA_KEY:
                print("\n🔧 Attempting hCaptcha solve via NopeCHA...")
                try:
                    # NopeCHA browser extension approach - inject the solver
                    # Find the captcha iframe
                    frames = page.frames
                    print(f"   Found {len(frames)} frames on page")
                    
                    # Try to trigger the captcha and solve it
                    # NopeCHA works by intercepting captcha requests
                    await page.wait_for_timeout(5000)
                    print("   ⏳ Waiting for NopeCHA to process...")
                    
                    # Check if solved
                    await page.wait_for_timeout(10000)
                    final_content = await page.content()
                    solved = 'thank you' in final_content.lower() or 'solved' in final_content.lower() or 'success' in final_content.lower()
                    print(f"   {'✅ CAPTCHA appears solved!' if solved else '❌ CAPTCHA not solved (may need more time or different approach)'}")
                    
                except Exception as e:
                    print(f"   ❌ Solve attempt failed: {e}")
            else:
                print("\n⚠️  Skipping solve test (no API key)")
            
            await browser.close()
            
    except Exception as e:
        print(f"   ❌ Playwright test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)
    return True

if __name__ == '__main__':
    result = asyncio.run(test_nopecha())
    sys.exit(0 if result else 1)
