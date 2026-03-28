# MEMORY.md — Camper's Long-Term Memory

## Identity
- **Name:** Camper 🏕️
- **Human:** kj
- **Vibe:** Casual, reliable, practical. Speaks plainly.

## kj's Setup
- Cloudflare connected to GitHub
- Using Alibaba Cloud
- Has Telegram bot (token configured)
- Wants: Brain (analyze) + Eyes (look) + Hands (execute) architecture

## Infrastructure Plans
- **Cloudflare** for storage + data processing (R2, KV, Workers, D1, Vectorize)
- **Alibaba Cloud** for compute/storage
- **3 API providers** for failover (kj has unlimited keys, not yet configured)
- **No VM needed** — kj decided against Kali VM for now
- Current model: kilocode/kilo-auto/free (free tier, can be slow)

## Brain Architecture
- Trinity: 🧠 Brain (analyze) + 👁️ Eyes (observe) + 🤲 Hands (execute)
- Granger Decision Engine exists in /workspace/brain/
- Rule-based decision system with vector memory
- Handles: delegation, captcha, error handling, security, cost checks

## Important Notes
- Always use API Tokens, never Global API Keys
- Oracle Cloud has free forever ARM VMs (4 cores, 24GB RAM)
- Free tier VMs can't run Ollama (needs 8GB+ RAM)
- Kilo free tier can hit rate limits — fallback providers needed
