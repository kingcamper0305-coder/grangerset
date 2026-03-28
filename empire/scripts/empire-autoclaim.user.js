// ==UserScript==
// @name         Empire Auto-Claim Suite
// @namespace    empire
// @version      1.0
// @description  Auto-claim on FreeBitco.in, Cointiply, and other faucets
// @author       Granger 🏗️
// @match        https://freebitco.in/*
// @match        https://cointiply.com/*
// @match        https://timebucks.com/*
// @match        https://firefaucet.win/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        checkInterval: 60000,  // Check every 60 seconds
        clickDelay: 3000,      // Wait 3s after CAPTCHA before clicking
        maxRetries: 3,
    };

    // ===== FREEBITCO.IN =====
    function handleFreeBitcoin() {
        // Check if roll button is available
        const rollBtn = document.getElementById('free_play_form_button');
        if (rollBtn && rollBtn.offsetParent !== null) {
            const btnText = rollBtn.value || rollBtn.innerText || '';
            
            // Button says "ROLL!" - it's ready
            if (btnText.toLowerCase().includes('roll')) {
                console.log('[Empire] FreeBitco.in: Roll button found, waiting for CAPTCHA...');
                
                // Wait for CAPTCHA to be solved (if auto-solved or user solved it)
                setTimeout(() => {
                    if (rollBtn.offsetParent !== null) {
                        rollBtn.click();
                        console.log('[Empire] FreeBitco.in: Roll clicked!');
                    }
                }, CONFIG.clickDelay);
            }
        }
        
        // Check for timer (waiting period)
        const timer = document.getElementById('time_left');
        if (timer) {
            const timeText = timer.innerText;
            console.log('[Empire] FreeBitco.in: Timer -', timeText);
        }
        
        // Check balance
        const balance = document.getElementById('balance');
        if (balance) {
            console.log('[Empire] FreeBitco.in: Balance -', balance.innerText, 'BTC');
        }
    }

    // ===== COINTIPLY =====
    function handleCointiply() {
        // Look for claim/faucet button
        const claimBtn = document.querySelector('.btn-claim, .faucet-claim, button[data-action="claim"]');
        if (claimBtn && claimBtn.offsetParent !== null) {
            console.log('[Empire] Cointiply: Claim button found');
            setTimeout(() => {
                claimBtn.click();
                console.log('[Empire] Cointiply: Claim clicked!');
            }, CONFIG.clickDelay);
        }
        
        // Check for "already claimed" message
        const waitMsg = document.querySelector('.already-claimed, .wait-message');
        if (waitMsg) {
            console.log('[Empire] Cointiply: Already claimed -', waitMsg.innerText);
        }
    }

    // ===== TIMEBUCKS =====
    function handleTimeBucks() {
        // Look for "Start Earning" or task buttons
        const startBtn = document.querySelector('.start-earning, .task-start, button[class*="start"]');
        if (startBtn && startBtn.offsetParent !== null) {
            console.log('[Empire] TimeBucks: Start button found');
        }
        
        // Auto-watch video if present
        const video = document.querySelector('video');
        if (video && video.paused) {
            video.play();
            console.log('[Empire] TimeBucks: Auto-playing video');
        }
    }

    // ===== FIREFAUCET =====
    function handleFireFaucet() {
        const claimBtn = document.querySelector('.btn-claim, #claim-btn, button[data-action="autoClaim"]');
        if (claimBtn && claimBtn.offsetParent !== null) {
            console.log('[Empire] FireFaucet: Claim button found');
            setTimeout(() => {
                claimBtn.click();
                console.log('[Empire] FireFaucet: Claim clicked!');
            }, CONFIG.clickDelay);
        }
    }

    // ===== MAIN LOOP =====
    function run() {
        const url = window.location.href;
        
        if (url.includes('freebitco.in')) {
            handleFreeBitcoin();
        } else if (url.includes('cointiply.com')) {
            handleCointiply();
        } else if (url.includes('timebucks.com')) {
            handleTimeBucks();
        } else if (url.includes('firefaucet.win')) {
            handleFireFaucet();
        }
    }

    // Run on page load
    setTimeout(run, 5000);
    
    // Run periodically
    setInterval(run, CONFIG.checkInterval);

    // Add status indicator
    const indicator = document.createElement('div');
    indicator.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#00ff00;color:#000;padding:5px 10px;border-radius:5px;font-size:12px;z-index:99999;font-family:monospace;';
    indicator.innerText = '🏗️ Empire Auto-Claim: ACTIVE';
    document.body.appendChild(indicator);

    console.log('[Empire] Auto-Claim Suite loaded!');
})();
