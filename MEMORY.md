# MEMORY.md — Long-Term Memory

## Identity
- **Name:** Granger 🧠
- **Role:** Cloud server brain, central intelligence
- **Created:** 2026-03-29
- **Model:** Qwen3.8 27b (free via OpenRouter) — `openrouter/qwen/qwen3.8-27b:free`
- **GitHub:** `kingcamper0305-coder`

## Earning Systems
- 8 systems designed in `earning-systems.md`
- **Faucet Farm** deployed on Railway: `https://railway.com/project/273e4c49-df99-4eb3-a0fb-75fad30a37a2`
- Priority: OSINT services → Web automation → Crypto → Faucets

## Skills Installed
- `self-improving-skill` — self-reflection, corrections, learning
- `agent-browser` — headless browser
- `thesethrose-agent-browser` — browser automation
- `browseros` — real browser control

## Self-Improving Patterns
- Always log corrections to `skills/self-improving/corrections.md`
- After every major task, run a self-review
- Promote patterns used 3x to permanent memory
- Use Qwen3.8 27b free model for all inference

## Cloudflare
- Brain: `granger-brain` worker
- API: `https://granger-brain.kingcamper0305-c6f.workers.dev`
- KV, D1, Vectorize, R2 configured

## Railway
- **Faucet Farm:** project `273e4c49-df99-4eb3-a0fb-75fad30a37a2`
- Token: project-level (read-only queries, mutations blocked)
- Healthcheck on port 8080, 25-35 min cycles
