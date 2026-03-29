# Granger Bug Bounty Operation

## Status: ACTIVE
## Started: 2026-03-29

## Arsenal
- 20 Kali tools (nmap, sqlmap, nikto, hydra, gobuster, ffuf, etc.)
- Security Audit Toolkit (installed from ClawHub)
- GitHub Bounty Hunter (installed from ClawHub)
- SecLists (6,200+ wordlists)
- Eye sub-agent (recon)
- Left Hand sub-agent (offense)

## Target Selection Criteria
1. Recently launched programs (< 6 months)
2. Low participant count (< 100 hunters)
3. Good payouts ($200+ minimum)
4. Web/API scope (matches our tools)

## Platforms
- [ ] HackerOne — need account
- [ ] Bugcrowd — need account
- [ ] Immunefi — need account (crypto payouts)
- [ ] GitHub Issues with bounties — need GitHub token

## Workflow
1. Pick target program
2. Eye → passive recon (subdomains, DNS, whois)
3. Eye → active scan (ports, services)
4. Left Hand → web enum (directories, tech stack)
5. Left Hand → vuln scan (sqlmap, nikto, ffuf)
6. Manual testing (IDOR, auth bypass, logic flaws)
7. Write report → submit via platform

## Findings
- Stored in: /root/.openclaw/workspace/granger-eye/findings/
- Format: JSON per scan, markdown reports for submissions
