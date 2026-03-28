#!/usr/bin/env python3
"""
Granger Brain CLI
Usage: python3 brain/cli.py <command> [args]
"""

import sys
import os
import json

# Add brain directory to path
BRAIN_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BRAIN_DIR)


def cmd_store(args):
    from memory.vector_memory import store_memory
    text = args[0] if args else ""
    if not text:
        print("Usage: store <text> [--category cat] [--importance N]")
        return
    category = "general"
    importance = 5
    # Simple arg parsing
    if "--category" in args:
        idx = args.index("--category")
        category = args[idx + 1] if idx + 1 < len(args) else category
    if "--importance" in args:
        idx = args.index("--importance")
        importance = int(args[idx + 1]) if idx + 1 < len(args) else importance
    mem_id = store_memory(text, category, importance)
    print(f"Stored: {mem_id}")


def cmd_search(args):
    from memory.vector_memory import search_memory
    query = args[0] if args else ""
    if not query:
        print("Usage: search <query>")
        return
    results = search_memory(query)
    if not results:
        print("No memories found.")
        return
    for i, r in enumerate(results, 1):
        dist = f" (distance: {r['distance']:.4f})" if r.get('distance') is not None else ""
        print(f"\n--- Result {i}{dist} ---")
        print(f"Category: {r['metadata'].get('category', '?')} | Importance: {r['metadata'].get('importance', '?')}")
        print(r["text"][:300])


def cmd_decide(args):
    from engine.decision import decide
    context = args[0] if args else ""
    if not context:
        print("Usage: decide <situation>")
        return
    result = decide(context)
    print(f"\nDecision: {result['decision']}")
    print(f"Rule: {result['rule']}")
    print(f"Priority: {result['priority']}")
    if result["all_matches"]:
        print(f"\nAll matching rules ({len(result['all_matches'])}):")
        for m in result["all_matches"]:
            print(f"  [{m['priority']}] {m['rule']}: {m['action']}")


def cmd_status(args):
    from memory.vector_memory import get_stats
    from engine.decision import get_all_rules
    stats = get_stats()
    rules = get_all_rules()
    print("=== Granger Brain Status ===")
    print(f"Total memories: {stats['total_memories']}")
    print(f"Data directory: {stats['data_dir']}")
    print(f"Collection: {stats['collection']}")
    print(f"Decision rules loaded: {len(rules)}")
    for r in rules:
        print(f"  [{r['priority']}] {r['id']}: {r['condition'][:60]}")


def cmd_index(args):
    from tools.knowledge_indexer import index_workspace
    print("Indexing workspace...")
    result = index_workspace()
    print(f"Indexed: {result['indexed_chunks']} chunks")
    print(f"Skipped: {result['skipped_files']} files")
    print(f"Errors: {result['errors']}")


COMMANDS = {
    "store": cmd_store,
    "search": cmd_search,
    "decide": cmd_decide,
    "status": cmd_status,
    "index": cmd_index,
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help", "help"):
        print("Granger Brain CLI")
        print("Commands:")
        for cmd, fn in COMMANDS.items():
            print(f"  {cmd}")
        print("\nUse <command> --help for details")
        return

    cmd = sys.argv[1].lower()
    args = sys.argv[2:]

    if cmd not in COMMANDS:
        print(f"Unknown command: {cmd}")
        print(f"Available: {', '.join(COMMANDS.keys())}")
        sys.exit(1)

    COMMANDS[cmd](args)


if __name__ == "__main__":
    main()
