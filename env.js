/**
 * Load environment variables from .env file.
 * Call this once at the entry point of your app.
 */
require('dotenv').config();

console.log('[Env] Loaded environment variables');
console.log('[Env] BROWSERLESS_URL:', process.env.BROWSERLESS_URL ? '✅ set' : '❌ missing');
console.log('[Env] CF_ACCOUNT_ID:', process.env.CF_ACCOUNT_ID ? '✅ set' : '❌ missing');
console.log('[Env] CLOUDFLARE_EMAIL:', process.env.CLOUDFLARE_EMAIL ? '✅ set' : '❌ missing');
console.log('[Env] CLOUDFLARE_API_KEY:', process.env.CLOUDFLARE_API_KEY ? '✅ set' : '❌ missing');
console.log('[Env] CF_WORKER_URL:', process.env.CF_WORKER_URL ? '✅ set' : '❌ missing');
console.log('[Env] CF_AI_GATEWAY_TOKEN:', process.env.CF_AI_GATEWAY_TOKEN ? '✅ set' : '❌ missing');
