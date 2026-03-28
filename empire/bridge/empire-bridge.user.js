// ==UserScript==
// @name         Empire Bridge
// @namespace    empire
// @version      1.1
// @description  Remote browser control - polls Empire server for commands
// @author       Granger
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const SERVER = 'https://poor-suggesting-dealers-involving.trycloudflare.com';

    // Show indicator
    const indicator = document.createElement('div');
    indicator.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#e94560;color:#fff;padding:5px 10px;border-radius:5px;font-size:12px;z-index:999999;font-family:monospace;opacity:0.8';
    indicator.textContent = '⚡ Empire';
    document.body.appendChild(indicator);

    function http(method, url, data) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: url,
                data: data ? JSON.stringify(data) : undefined,
                headers: data ? {'Content-Type': 'application/json'} : {},
                onload: (r) => { try { resolve(JSON.parse(r.responseText)); } catch(e) { resolve({}); } },
                onerror: () => resolve({})
            });
        });
    }

    async function poll() {
        try {
            const cmd = await http('GET', SERVER + '/poll');
            if (cmd && cmd.action) {
                indicator.textContent = '⚡ ' + cmd.action;
                const result = await execute(cmd);
                await http('POST', SERVER + '/result', result);
                indicator.textContent = '⚡ Empire';
            }
        } catch(e) { indicator.textContent = '⚡ err'; }
        setTimeout(poll, 2000);
    }

    async function execute(cmd) {
        try {
            switch(cmd.action) {
                case 'info':
                    return {ok: true, url: location.href, title: document.title, body: document.body.innerText.substring(0, 3000)};
                case 'eval':
                    return {ok: true, value: String(eval(cmd.code)).substring(0, 5000)};
                case 'click':
                    const el = document.querySelector(cmd.sel);
                    if (el) { el.click(); return {ok: true}; }
                    return {ok: false, error: 'not found'};
                case 'type':
                case 'fill':
                    const inp = document.querySelector(cmd.sel);
                    if (inp) { inp.focus(); inp.value = cmd.text; inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); return {ok: true}; }
                    return {ok: false, error: 'not found'};
                case 'read':
                    if (cmd.sel) { const r = document.querySelector(cmd.sel); return r ? {ok:true, text:r.innerText} : {ok:false}; }
                    return {ok:true, text: document.body.innerText.substring(0,3000)};
                case 'goto':
                    location.href = cmd.url; return {ok: true};
                case 'html':
                    if (cmd.sel) { const h = document.querySelector(cmd.sel); return h ? {ok:true, html:h.outerHTML.substring(0,5000)} : {ok:false}; }
                    return {ok:true, html: document.documentElement.outerHTML.substring(0,5000)};
                case 'scroll':
                    if (cmd.sel) { const s = document.querySelector(cmd.sel); if(s){s.scrollIntoView();return{ok:true}} }
                    window.scrollTo(0, cmd.y||0); return {ok:true};
                case 'exists':
                    return {ok:true, exists:!!document.querySelector(cmd.sel)};
                case 'wait':
                    const t0=Date.now();
                    while(Date.now()-t0<(cmd.timeout||5000)){if(document.querySelector(cmd.sel))return{ok:true};await new Promise(r=>setTimeout(r,200))}
                    return{ok:false,error:'timeout'};
                case 'select':
                    const se=document.querySelector(cmd.sel);if(se){se.value=cmd.value;se.dispatchEvent(new Event('change',{bubbles:true}));return{ok:true}}return{ok:false};
                case 'submit':
                    const f=document.querySelector(cmd.sel||'form');if(f){f.submit();return{ok:true}}return{ok:false};
                case 'query':
                    const all=document.querySelectorAll(cmd.sel);return{ok:true,count:all.length,texts:Array.from(all).slice(0,20).map(e=>e.innerText?.substring(0,100))};
                default:
                    return {ok:false, error:'unknown: '+cmd.action};
            }
        } catch(e) { return {ok:false, error:e.message}; }
    }

    poll();
    console.log('[Empire Bridge] Active');
})();
