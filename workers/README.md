# Granger Workers — Cloudflare Infrastructure

## Brain Worker

**URL:** https://granger-brain.kingcamper0305-c6f.workers.dev

### Architecture
```
┌─────────────────────────────────────────────┐
│ BRAIN (Cloudflare Workers)                  │
├─────────────────────────────────────────────┤
│ 🧠 Decision Engine ← D1 rules table        │
│ 🧠 Memory (Vector) ← Vectorize DB          │
│ 🧠 State ← KV Store                        │
│ 🧠 Data ← D1 Database                      │
│ 🧠 Knowledge Base ← R2 + Vectorize         │
│ 🧠 API Gateway ← Worker routing            │
└─────────────────────────────────────────────┘
```

### Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Health check |
| `/think` | POST | Decision engine + AI |
| `/memory` | POST/GET | Store/search memories |
| `/state/:key` | GET/PUT | Session state (KV) |
| `/status` | GET | Brain stats |

### Resources
- D1: granger-data (5GB free)
- KV: granger-state (1GB free)
- R2: granger-knowledge (10GB free)
- Vectorize: granger-memories (768 dims)
- AI: Llama 3.1 8B (free)

### Deploy
```bash
cd workers/
wrangler deploy
```
