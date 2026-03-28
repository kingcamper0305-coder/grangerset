"""
Granger Vector Memory System
Uses ChromaDB's built-in embeddings for semantic search.
"""

import os
import json
from datetime import datetime, timezone

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
COLLECTION_NAME = "granger_memories"

_client = None
_collection = None


def _get_client():
    global _client
    if _client is None:
        import chromadb
        os.makedirs(DATA_DIR, exist_ok=True)
        _client = chromadb.PersistentClient(path=DATA_DIR)
    return _client


def _get_collection():
    global _collection
    if _collection is None:
        client = _get_client()
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )
    return _collection


def store_memory(text: str, category: str = "general", importance: int = 5) -> str:
    """Store a memory with embedding. Returns the memory ID."""
    collection = _get_collection()
    mem_id = f"mem_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    metadata = {
        "category": category,
        "importance": min(max(importance, 1), 10),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    collection.add(
        ids=[mem_id],
        documents=[text],
        metadatas=[metadata]
    )
    return mem_id


def search_memory(query: str, n_results: int = 5) -> list[dict]:
    """Semantic search across all memories."""
    collection = _get_collection()
    if collection.count() == 0:
        return []
    results = collection.query(query_texts=[query], n_results=min(n_results, collection.count()))
    memories = []
    for i in range(len(results["ids"][0])):
        memories.append({
            "id": results["ids"][0][i],
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i] if "distances" in results else None,
        })
    return memories


def get_recent(n: int = 10) -> list[dict]:
    """Get most recent memories by timestamp metadata."""
    collection = _get_collection()
    if collection.count() == 0:
        return []
    all_data = collection.get()
    items = []
    for i in range(len(all_data["ids"])):
        items.append({
            "id": all_data["ids"][i],
            "text": all_data["documents"][i],
            "metadata": all_data["metadatas"][i],
        })
    items.sort(key=lambda x: x["metadata"].get("timestamp", ""), reverse=True)
    return items[:n]


def get_important(n: int = 10) -> list[dict]:
    """Get highest importance memories."""
    collection = _get_collection()
    if collection.count() == 0:
        return []
    all_data = collection.get()
    items = []
    for i in range(len(all_data["ids"])):
        items.append({
            "id": all_data["ids"][i],
            "text": all_data["documents"][i],
            "metadata": all_data["metadatas"][i],
        })
    items.sort(key=lambda x: x["metadata"].get("importance", 0), reverse=True)
    return items[:n]


def get_stats() -> dict:
    """Return brain memory stats."""
    collection = _get_collection()
    count = collection.count()
    return {
        "total_memories": count,
        "data_dir": DATA_DIR,
        "collection": COLLECTION_NAME,
    }
