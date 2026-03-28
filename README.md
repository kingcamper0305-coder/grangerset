# GrangerSet 🧠🖐️🤘

The empire's infrastructure. Brain, hands, identity.

## Structure

```
grangerset/
├── granger-brain/          ☁️ Brain (Cloudflare Worker)
│   ├── src/index.ts        API: /chat, /analyze, /solve, /decide, /memory, /grow
│   ├── BRAIN.md            Brain philosophy & design
│   └── wrangler.toml       Cloudflare config (KV, D1, Vectorize, AI)
│
├── empire/                 🏗️ Granger Engine
│   ├── bridge/             Browser bridge (extension + server)
│   ├── scripts/            Automation scripts
│   ├── tools/              Utilities & dashboards
│   └── webapp/             Web interface
│
├── infra/                  🖥️ Server docs
│   └── alibaba-cloud.md    Alibaba ECS specs
│
├── memory/                 💾 Daily logs
│
├── SOUL.md                 Who we are
├── BODY.md                 Full architecture
├── HEART.md                The drive
├── MEMORY.md               Long-term memory
├── IDENTITY.md             Identity
├── AGENTS.md               Workspace conventions
├── TOOLS.md                Environment & tools
├── USER.md                 About kj
└── HEARTBEAT.md            Periodic checks
```

## Brain API

Live at: `https://granger-brain.kingcamper0305-c6f.workers.dev`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | Talk to the brain (Llama 3.1 Fast) |
| `/think` | POST | Rule-based fast responses |
| `/analyze` | POST | Deep analysis, patterns, root causes |
| `/calculate` | POST | Numbers, metrics, estimation |
| `/identify` | POST | Find key elements, leverage points |
| `/dissect` | POST | Break down and examine anything |
| `/solve` | POST | Outside-the-box problem solving |
| `/decide` | POST | Decision engine |
| `/grow` | POST | Store lessons, brain grows stronger |
| `/memory` | GET/POST | Search and store memories |
| `/state/:key` | GET/PUT/DELETE | Session state (KV) |
| `/data/query` | POST | SQL queries (D1) |
| `/data/init` | POST | Initialize database tables |
| `/rules` | GET/POST | Decision rules |

### Example

```bash
# Talk to the brain
curl -X POST https://granger-brain.kingcamper0305-c6f.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I scale this system?"}'

# Solve a problem
curl -X POST https://granger-brain.kingcamper0305-c6f.workers.dev/solve \
  -H "Content-Type: application/json" \
  -d '{"problem": "API is slow after deploy", "constraints": ["no rollback"]}'

# Store a lesson
curl -X POST https://granger-brain.kingcamper0305-c6f.workers.dev/grow \
  -H "Content-Type: application/json" \
  -d '{"lesson": "Always profile before deploying", "category": "ops"}'
```

## Infra

- **Brain:** Cloudflare Workers (edge AI)
- **Server:** Alibaba Cloud ECS (Ubuntu 22.04, 2 vCPU, 2GB)
- **Control UI:** OpenClaw Gateway on port 3001

## Deploy

```bash
cd granger-brain
wrangler login
wrangler deploy
```

## Philosophy

The brain analyzes, calculates, identifies, dissects, solves, and grows.
No limits. Always evolving. Always in charge.

---

*Built by Camper 🏕️ for kj's empire.*
