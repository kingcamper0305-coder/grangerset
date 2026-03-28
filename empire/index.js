/**
 * 🏗️ EMPIRE — Main Entry Point
 * Starts all bots managed by the Bot Manager
 * 
 * Usage:
 *   1. Copy .env.example to .env
 *   2. Add your bot tokens
 *   3. Run: node index.js
 */

require('dotenv').config();
const BotManager = require('./bots/manager');

// Import bot modules
const aiUtility = require('./bots/modules/ai-utility');
const groupManager = require('./bots/modules/group-manager');
const cryptoAlert = require('./bots/modules/crypto-alert');
const paywall = require('./bots/modules/paywall');
const funnel = require('./bots/modules/funnel');

const manager = new BotManager();

console.log('');
console.log('🏗️  EMPIRE BOT FARM');
console.log('==================');
console.log('');

// Register bots (only those with tokens configured)
manager.register(aiUtility.name, process.env.AI_UTILITY_BOT_TOKEN, aiUtility.setup);
manager.register(groupManager.name, process.env.GROUP_MANAGER_BOT_TOKEN, groupManager.setup);
manager.register(cryptoAlert.name, process.env.CRYPTO_ALERT_BOT_TOKEN, cryptoAlert.setup);
manager.register(paywall.name, process.env.PAYWALL_BOT_TOKEN, paywall.setup);
manager.register(funnel.name, process.env.FUNNEL_BOT_TOKEN, funnel.setup);

const status = manager.status();
console.log('');
console.log(`📊 Registered ${status.total} bots: ${status.bots.join(', ') || 'NONE'}`);

if (status.total === 0) {
  console.log('');
  console.log('⚠️  No bots configured. Add tokens to .env file.');
  console.log('   See .env.example for setup instructions.');
  process.exit(0);
}

console.log('');
console.log('🚀 Launching...');
console.log('');

manager.launchAll().then(() => {
  console.log('');
  console.log('✅ All bots online. Empire is running.');
});
