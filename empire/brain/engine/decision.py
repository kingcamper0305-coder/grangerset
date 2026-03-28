"""
Granger Decision Engine
Simple rule-based decision system loaded from rules.json.
"""

import os
import json
import re

RULES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rules.json")

_rules = None


def _load_rules():
    global _rules
    if _rules is None:
        with open(RULES_PATH, "r") as f:
            _rules = json.load(f)
    return _rules


def reload_rules():
    """Force reload rules from disk."""
    global _rules
    _rules = None
    return _load_rules()


def _normalize(text: str) -> str:
    """Lowercase and strip punctuation for matching."""
    return re.sub(r'[^\w\s]', ' ', text.lower())


def match(context: str) -> list[dict]:
    """Match context against rules. Returns applicable rules sorted by priority."""
    rules = _load_rules()
    ctx = _normalize(context)
    ctx_words = set(ctx.split())
    matched = []
    for rule in rules:
        condition_words = set(_normalize(rule["condition"]).split())
        # Filter stopwords
        stopwords = {"the", "a", "an", "is", "are", "to", "of", "in", "for", "and", "or",
                     "if", "has", "been", "that", "this", "it", "on", "at", "be", "with",
                     "task", "user", "explicitly", "involves", "no", "after"}
        significant = {w for w in condition_words if len(w) > 3 and w not in stopwords}

        # Word overlap with stem matching
        overlap = 0
        for cw in significant:
            stems = [cw]
            if cw.endswith("ing"):
                stems.append(cw[:-3])
            if cw.endswith("ed"):
                stems.append(cw[:-2])
            if cw.endswith("s") and not cw.endswith("ss"):
                stems.append(cw[:-1])
            if any(s in ctx_words or s in ctx for s in stems if len(s) > 3):
                overlap += 1

        # Key phrase matching
        phrases = _extract_key_phrases(rule)
        phrase_hit = any(phrase in ctx for phrase in phrases)

        if overlap >= 2 or phrase_hit:
            matched.append(rule)

    matched.sort(key=lambda r: r.get("priority", 0), reverse=True)
    return matched


def _extract_key_phrases(rule: dict) -> list[str]:
    """Extract trigger phrases from a rule for context matching."""
    # Use rule ID to determine specific trigger phrases
    phrase_map = {
        "rule_delegate_build": ["build a", "create a", "write a", "code a", "make a", "develop", "implement"],
        "rule_captcha_blocked": ["captcha", "bot detection", "blocked", "anti-bot"],
        "rule_same_error_twice": ["same error", "error again", "keeps failing", "failed again"],
        "rule_user_says_stop": ["don't build", "stop building", "cancel that", "halt", "abort", "nevermind"],
        "rule_research_first": ["don't know", "unfamiliar", "never used", "new technology", "what is"],
        "rule_cost_check": ["buy", "purchase", "subscribe", "pay for", "premium", "cost", "price", "spend"],
        "rule_security_risk": ["password", "api key", "credential", "secret", "private key", "token"],
        "rule_no_progress": ["not working", "still failing", "can't figure out", "stuck"],
    }
    return phrase_map.get(rule.get("id", ""), [])


def decide(context: str) -> dict:
    """Return the best action for a given context."""
    matched = match(context)
    if not matched:
        return {
            "decision": "No specific rule matched. Use best judgment and proceed cautiously.",
            "rule": None,
            "priority": 0,
            "all_matches": []
        }
    best = matched[0]
    return {
        "decision": best["action"],
        "rule": best["id"],
        "priority": best["priority"],
        "all_matches": [{"rule": r["id"], "action": r["action"], "priority": r["priority"]} for r in matched]
    }


def get_all_rules() -> list[dict]:
    """Return all loaded rules."""
    return _load_rules()
