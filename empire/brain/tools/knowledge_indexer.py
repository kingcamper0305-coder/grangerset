"""
Granger Knowledge Indexer
Scans workspace files and indexes them into vector memory.
"""

import os
import glob

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

INDEX_PATHS = [
    "MEMORY.md",
    "memory/*.md",
    "empire/reports/*.md",
]


def index_workspace() -> dict:
    """Scan workspace files and index into vector memory. Returns stats."""
    # Import here to avoid circular imports
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from memory.vector_memory import store_memory, _get_collection

    indexed = 0
    skipped = 0
    errors = 0

    for pattern in INDEX_PATHS:
        full_pattern = os.path.join(WORKSPACE, pattern)
        for filepath in glob.glob(full_pattern):
            try:
                with open(filepath, "r", errors="replace") as f:
                    content = f.read().strip()
                if not content or len(content) < 10:
                    skipped += 1
                    continue

                # Chunk large files
                chunks = _chunk_text(content, max_len=2000)
                rel_path = os.path.relpath(filepath, WORKSPACE)
                category = _categorize_path(rel_path)

                for i, chunk in enumerate(chunks):
                    store_memory(
                        text=f"[{rel_path}]\n{chunk}",
                        category=category,
                        importance=_importance_for(category)
                    )
                    indexed += 1

            except Exception as e:
                errors += 1
                print(f"Error indexing {filepath}: {e}")

    return {
        "indexed_chunks": indexed,
        "skipped_files": skipped,
        "errors": errors,
    }


def _chunk_text(text: str, max_len: int = 2000) -> list[str]:
    """Split text into chunks at paragraph boundaries."""
    if len(text) <= max_len:
        return [text]
    chunks = []
    paragraphs = text.split("\n\n")
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 2 > max_len and current:
            chunks.append(current.strip())
            current = para
        else:
            current = current + "\n\n" + para if current else para
    if current.strip():
        chunks.append(current.strip())
    return chunks


def _categorize_path(rel_path: str) -> str:
    if "MEMORY" in rel_path.upper():
        return "long-term-memory"
    elif "memory/" in rel_path:
        return "daily-memory"
    elif "empire/reports" in rel_path:
        return "empire-report"
    return "knowledge"


def _importance_for(category: str) -> int:
    return {
        "long-term-memory": 8,
        "daily-memory": 5,
        "empire-report": 7,
        "knowledge": 4,
    }.get(category, 3)
