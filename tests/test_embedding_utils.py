import pytest
from embedding_utils import cosine_similarity, get_embedding
import importlib


def test_cosine_similarity_basic():
    assert pytest.approx(1.0, rel=1e-6) == cosine_similarity([1, 0], [1, 0])


def test_cosine_similarity_orthogonal():
    assert pytest.approx(0.0, abs=1e-6) == cosine_similarity([1, 0], [0, 1])


def test_get_embedding_fallback(monkeypatch):
    from config import current_config
    monkeypatch.setitem(current_config, "embedding", {"type": "none"})
    emb = get_embedding("test text")
    assert isinstance(emb, list)
    assert len(emb) == 768
