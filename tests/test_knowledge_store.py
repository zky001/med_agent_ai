import asyncio
from knowledge_store import search_knowledge_embedding


def test_search_knowledge_embedding(monkeypatch):
    docs = [{
        "knowledge_type": "test",
        "content": "hello world",
        "metadata": {},
        "embedding": [1.0, 0.0]
    }]
    monkeypatch.setattr('knowledge_store.embedded_documents', docs, raising=False)
    monkeypatch.setattr('knowledge_store.get_embedding', lambda text: [1.0, 0.0])

    result = asyncio.run(search_knowledge_embedding("hello", top_k=1))
    assert result["success"]
    assert len(result["results"]) == 1
