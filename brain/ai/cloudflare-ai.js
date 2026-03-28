/**
 * 🧠 Cloudflare AI Service
 * Uses free AI models on Cloudflare Workers AI
 */

const https = require('https');

const CF_EMAIL = 'kingcamper0305@gmail.com';
const CF_KEY = 'cfk_79bE6kC5s8J4X9uubXB13eKv4Wc3kZEePtLb9ticdbe22eb7';
const ACCOUNT_ID = 'c6fffd6f6f9a1df66caa886fb07fd07d';

const MODELS = {
  'llama-3.1-8b': '@cf/meta/llama-3.1-8b-instruct-fp8',
  'llama-3.2-3b': '@cf/meta/llama-3.2-3b-instruct',
  'llama-3-8b': '@cf/meta/llama-3-8b-instruct',
  'mistral-7b': '@cf/mistral/mistral-7b-instruct-v0.2-lora',
  'gpt-oss-120b': '@cf/openai/gpt-oss-120b',
  'tinyllama': '@cf/tinyllama/tinyllama-1.1b-chat-v1.0',
};

async function chat(prompt, model = 'llama-3.1-8b', system = 'You are a helpful assistant.') {
  const modelId = MODELS[model] || model;
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ]
    });

    const options = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${ACCOUNT_ID}/ai/run/${modelId}`,
      method: 'POST',
      headers: {
        'X-Auth-Key': CF_KEY,
        'X-Auth-Email': CF_EMAIL,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const d = JSON.parse(body);
          if (d.success) {
            resolve({ text: d.result.response, usage: d.result.usage });
          } else {
            reject(new Error(d.errors?.[0]?.message || 'API error'));
          }
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function listModels() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${ACCOUNT_ID}/ai/models/search`,
      method: 'GET',
      headers: {
        'X-Auth-Key': CF_KEY,
        'X-Auth-Email': CF_EMAIL,
      }
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body).result || []); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = { chat, listModels, MODELS };

// Test if run directly
if (require.main === module) {
  (async () => {
    console.log('Testing Cloudflare AI...');
    const result = await chat('What is 2+2? Answer in one word.');
    console.log('Response:', result.text);
    console.log('Usage:', result.usage);
  })();
}
