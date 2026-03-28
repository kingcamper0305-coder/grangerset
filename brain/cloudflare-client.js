/**
 * ☁️ Cloudflare Brain Client
 * Connects local VPS to Cloudflare Brain Worker
 *
 * Required env vars:
 *   CF_ACCOUNT_ID   — Cloudflare account ID
 *   CF_API_TOKEN     — Cloudflare API token (not Global API Key)
 *   CF_WORKER_URL    — Worker URL (e.g. https://granger-brain.<account>.workers.dev)
 */

const https = require('https');

class CloudflareBrain {
  constructor() {
    this.accountId = process.env.CF_ACCOUNT_ID;
    this.apiToken = process.env.CF_API_TOKEN;
    this.workerUrl = process.env.CF_WORKER_URL;

    if (!this.workerUrl) {
      throw new Error('Missing CF_WORKER_URL environment variable');
    }
  }

  async _request(path, method = 'GET', body = null) {
    const url = this.workerUrl + path;
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Brain ${method} ${path} failed (${r.status}): ${text}`);
    }
    return r.json();
  }

  async think(input) {
    return this._request('/think', 'POST', { input });
  }

  async remember(text, category = 'general', importance = 5) {
    return this._request('/memory', 'POST', { text, category, importance });
  }

  async recall(query) {
    return this._request('/memory?q=' + encodeURIComponent(query));
  }

  async setState(key, value) {
    return this._request('/state/' + key, 'PUT', { value });
  }

  async getState(key) {
    return this._request('/state/' + key);
  }

  async status() {
    return this._request('/');
  }
}

module.exports = CloudflareBrain;
