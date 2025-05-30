import pytest
from file_utils import chunk_text, extract_text_from_file


def test_chunk_text_basic():
    text = "这是一句。那也是一句！这是第三句？"
    chunks = chunk_text(text, chunk_size=6, overlap=2)
    assert len(chunks) >= 2
    assert chunks[0].startswith("这是一句")


def test_chunk_text_short():
    text = "短句"
    assert chunk_text(text, chunk_size=10) == ["短句"]


def test_extract_text_from_file_txt():
    content = b"abc\n\n123"
    paragraphs = extract_text_from_file(content, "test.txt")
    assert paragraphs == ["abc", "123"]
