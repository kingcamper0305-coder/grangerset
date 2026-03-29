# Granger System Architecture

## The Trinity

```
                    🏕️ GRANGER (Architect)
                          │
            ┌─────────────┼─────────────┐
            │             │             │
         👁️ EYE      🖐️ LEFT       🖐️ RIGHT
       (Observer)   (Offense)      (Defense)
            │             │             │
     - Recon Scan    - Kali Tools   - Deploy
     - Monitor       - Exploit      - Patch
     - Alert         - Enumerate    - Harden
     - Screenshot    - Pivot        - Build
```

## Sub-Agents

### 👁️ Eye — Observer Agent
- Port scanning & service enumeration
- Web app reconnaissance
- Continuous monitoring & alerting
- Screenshot capture via browser
- Log analysis

### 🖐️ Left Hand — Offense Agent (Kali Arsenal)
- **Recon:** nmap, masscan, amass, subfinder, theHarvester
- **Web:** nikto, sqlmap, gobuster, ffuf, wpscan, nuclei
- **Exploit:** metasploit framework, searchsploit, exploitdb
- **Password:** hydra, john, hashcat, crackmapexec
- **Network:** responder, bettercap, ettercap, tcpdump
- **Wireless:** aircrack-ng suite (if adapter available)
- **Forensics:** binwalk, foremost, volatility, strings

### 🖐️ Right Hand — Defense Agent
- Deploy & patch systems
- Harden configurations
- Build infrastructure
- Manage certs & secrets
- Incident response

## Data Flow
1. Eye scans target → findings.json
2. Left Hand receives findings → exploit_plan.md
3. Left Hand executes → results.json
4. Right Hand patches/remediates → report.md
5. Granger orchestrates all three
