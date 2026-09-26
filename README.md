# 🧠 GrangerSet — Brain, Eyes, Hands

Granger's complete infrastructure: AI brain with **Qwen3.8 27b**, self-improving skills, earning systems, and cloud deployment.

## Structure

```
grangerset/
├── granger-brain/          ☁️ Brain (Cloudflare Worker)
│   ├── src/index.ts        API endpoints
│   ├── worker.js           Cloudflare worker
│   ├── BRAIN.md            Brain philosophy
│   └── wrangler.toml       CF config
│
├── skills/                 🧠 Your capabilities
│   └── self-improving/     Self-reflection + learning system
│
├── memory/                 📝 Session logs
│
├── AGENTS.md               🧬 Agent identity & startup
├── SOUL.md                 💫 Who you are
├── MEMORY.md               🧠 Long-term memory
├── USER.md                 👤 About your human
├── IDENTITY.md             🆔 Identity card
├── TOOLS.md                🔧 Local notes
├── HEARTBEAT.md            💓 Heartbeat config
├── earning-systems.md      💰 8 earning systems
└── README.md               This file
```

## AI Model

This brain runs on **Qwen3.8 27b** via OpenRouter (free tier):
- Model: `openrouter/qwen/qwen3.8-27b:free`
- No API key needed — free inference

## Brain API

**Live at:** `https://granger-brain.kingcamper0305-c6f.workers.dev`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | Talk to the brain |
| `/memory/store` | POST | Store a memory |
| `/memory/search` | GET | Search memories |
| `/decide` | POST | Decision engine |
| `/status` | GET | Brain status |

## Self-Improving

This system learns from every interaction:
- **Corrections** → logged, distilled, never repeated
- **Patterns (3x)** → promoted to permanent knowledge
- **Self-review** → after every major task
- **Memory tiers** → HOT / WARM / COLD

## Active Deployments

| System | Platform | Status |
|--------|----------|--------|
| Faucet Farm 🪙 | Railway | ⚡ 25-35min cycles |
| Brain 🧠 | Cloudflare | 🌐 API online |

---

*Built for the empire.*
