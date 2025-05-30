from pathlib import Path

# Global configuration for LLM and embedding services
current_config = {
    "llm": {
        "type": "local",
        "url": "https://v1.voct.top/v1",
        "model": "gpt-4.1-mini",
        "key": "EMPTY",
        "temperature": 0.3,
    },
    "embedding": {
        "type": "local-api",
        "url": "http://192.168.196.151:9998/v1",
        "key": "EMPTY",
        "model": "bge-large-zh-v1.5",
        "dimension": 1024,
    },
}

# In-memory data stores
embedded_documents = []
uploaded_files = []
knowledge_stats = {
    "临床试验方案示例": {"document_count": 5},
    "肿瘤临床指南": {"document_count": 8},
    "医学文献": {"document_count": 12},
    "CGT药物研发资料": {"document_count": 6},
    "Excel数据表": {"document_count": 3},
    "用户上传文档": {"document_count": 0},
}

generation_history = []

# Ensure upload directory exists
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
