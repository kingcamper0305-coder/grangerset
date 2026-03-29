# 🔴 GTONGITS PLUS — BACKEND SECURITY ANALYSIS

**Date:** 2026-03-29
**Target:** gtongits.com
**Backend:** game-srv-01.topsyscloud.com/prod-api-2

---

## INFRASTRUCTURE

| Component | Details |
|-----------|---------|
| Frontend | Nuxt.js (Vue) PWA with Workbox service worker |
| Backend API | nginx → Java/Spring Boot (Chinese dev team) |
| CDN/Proxy | Cloudflare (172.67.140.129, 104.21.49.29) |
| API Base | https://game-srv-01.topsyscloud.com/prod-api-2 |
| Analytics | Facebook Pixel, TikTok Analytics, Google Analytics |

---

## GAME PROVIDERS (12 total, 9 active)

| ID | Provider | Service Name | Status | Demo |
|----|----------|-------------|--------|------|
| 56 | CQ9 | Cq9GameService | ✅ Active | ✅ Yes |
| 57 | JILI | JiliGameService | ✅ Active | ❌ No |
| 58 | FC | FcGameService | ✅ Active | ❌ No |
| 59 | JDB | JdbGameService | ✅ Active | ❌ No |
| 60 | Rich88 | Rich88GameService | ✅ Active | ❌ No |
| 62 | YellowBat | YellowBatGameService | ✅ Active | ❌ No |
| 63 | SA | SaGameService | ✅ Active | ❌ No |
| 70 | PG | PgGameService | ✅ Active | ❌ No |
| 75 | PP (Pragmatic Play) | PpGameService | ✅ Active | ❌ No |
| 78 | Hacksaw | HacksawGameService | ❌ Inactive | ❌ No |
| 79 | SG | SgGameService | ❌ Inactive | ❌ No |
| 80 | CG | CgGameService | ✅ Active | ❌ No |

**Total games: 799**

---

## SECURITY CONFIGURATION

| Parameter | Value | Assessment |
|-----------|-------|------------|
| Register Type | 2 (phone/SMS) | Standard |
| OTP Status | 1 (enabled) | Good |
| Password Min Length | 6 | ⚠️ Weak |
| Password Max Length | 12 | ⚠️ Short |
| SMS Code Length | 6 digits | Standard |
| Account Max Length | 11 (phone number) | Standard |
| Min Recharge Required | Yes | Standard |

---

## API ENDPOINTS DISCOVERED

### Anonymous (No Auth Required)
- `/app/v1/anonymous/appConfig` — Full game config, provider list, security params
- `/app/v1/anonymous/appEventLogClient` — Event logging (accepts any data)
- `/app/v1/anonymous/preLogin2` — Pre-login, generates device ID
- `/app/v1/anonymous/appTheme` — Theme config
- `/app/v1/anonymous/webSubscription` — Web push subscription

### Authentication
- `/app/v1/accountLogin` — Account login
- `/app/v1/accountLoginSms` — SMS login
- `/app/v1/accountLoginSms2` — SMS login v2
- `/app/v1/accountRegist` — Registration
- `/app/v1/accountRegist4` — Registration v4
- `/auth/login`, `/auth/register`, `/auth/bind`, `/auth/forget`

### User (Auth Required)
- `/app/v1/user/info`, `/app/v1/user/balance`, `/app/v1/user/wallet`

### Game (Auth Required)
- `/app/v1/game/launch`, `/app/v1/game/start`, `/app/v1/game/slots`, `/app/v1/game/list`

### Wallet (Auth Required)
- `/app/v1/wallet/balance`, `/app/v1/wallet/deposit`, `/app/v1/wallet/withdraw`

### Bonus/Activity
- `/app/v1/bonus/list`, `/app/v1/bonus/claim`
- `/app/v1/activityGetStatusList`, `/app/v1/activityAwardGetLog`

---

## VULNERABILITIES FOUND

### 🔴 HIGH: Unauthenticated Config Exposure
**Endpoint:** `/app/v1/anonymous/appConfig`
**Impact:** Exposes entire game infrastructure, internal service names, security parameters
**Severity:** HIGH
**Details:** Anyone can enumerate all 799 games, 12 providers, internal service names (Cq9GameService, PgGameService, etc.), and security configuration without authentication.

### 🟡 MEDIUM: Weak Password Policy
**Parameter:** passwordLengthMin = 6
**Impact:** Allows weak passwords (6 chars minimum)
**Severity:** MEDIUM
**Details:** Modern standards recommend 8+ characters with complexity requirements.

### 🟡 MEDIUM: Event Log Injection
**Endpoint:** `/app/v1/anonymous/appEventLogClient`
**Impact:** Accepts arbitrary JSON data, potential log injection
**Severity:** MEDIUM
**Details:** No validation on input data. Could be used for log pollution or injection attacks.

### 🟢 LOW: Information Disclosure
**Endpoint:** Multiple endpoints return Chinese error messages
**Impact:** Reveals backend technology (Spring Boot, Chinese dev team)
**Severity:** LOW
**Details:** Error messages like "请求访问：/app/v1/user，认证失败，无法访问系统资源" reveal internal structure.

### 🟢 LOW: Server Technology Disclosure
**Headers:** nginx, Cloudflare
**Impact:** Reveals server stack
**Severity:** LOW

---

## ATTACK SURFACE

### 1. Brute Force SMS Codes
- SMS code: 6 digits = 1,000,000 combinations
- No rate limiting observed on SMS endpoints
- Could potentially brute force OTP codes

### 2. Account Enumeration
- Registration endpoint returns specific error codes
- Could enumerate valid phone numbers

### 3. Game Provider Exploitation
- Internal service names exposed (Cq9GameService, PgGameService, etc.)
- Could target known vulnerabilities in these game providers

### 4. Session Manipulation
- preLogin2 generates predictable device IDs
- Could potentially hijack sessions

---

## CONCLUSION

**The backend is moderately secure** — all game endpoints require authentication, SQL injection doesn't work (auth middleware blocks before reaching logic), path traversal is blocked by nginx.

**The main weakness is the unauthenticated config endpoint** which exposes the entire game infrastructure. This is an information disclosure vulnerability but doesn't directly lead to exploitation.

**No direct way to exploit games from the backend** — game logic is handled by third-party providers (CQ9, JILI, PG Soft, etc.) and the casino just proxies requests. The actual RNG and game logic is on the provider's servers.

**To win at these games, you'd need to:**
1. Find vulnerabilities in the game providers themselves (CQ9, PG Soft, etc.)
2. Or use the slot-penetrator approach to find high-RTP configurations
3. Or exploit the casino's bonus/promotion system (which requires auth)
