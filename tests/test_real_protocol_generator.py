import pytest
from real_protocol_generator import RealProtocolGenerator


def dummy_llm(prompt: str, temp: float = 0.0):
    return "评分：85分"

async def dummy_search(query: str, top_k: int = 5):
    return {"success": True, "results": [{"content": "doc", "score": 1.0}]}


def test_keyword_based_extraction():
    gen = RealProtocolGenerator(dummy_llm, dummy_search)
    result = gen._keyword_based_extraction("设计一项TCR-T治疗肺癌的研究")
    assert result["drug_type"].startswith("TCR-T")
    assert result["disease"] == "肺癌"


def test_clean_and_format_content():
    gen = RealProtocolGenerator(dummy_llm, dummy_search)
    content = "line1\n\n\nline2"
    cleaned = gen._clean_and_format_content(content, "module")
    assert "\n\n\n" not in cleaned


def test_extract_quality_score():
    gen = RealProtocolGenerator(dummy_llm, dummy_search)
    assert gen._extract_quality_score("评分：90分") == 90
    assert gen._extract_quality_score("没有评分") in (70, 80)
