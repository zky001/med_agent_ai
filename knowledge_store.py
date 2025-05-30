from typing import List, Optional
import logging
from fastapi import HTTPException

from config import embedded_documents
from embedding_utils import get_embedding, cosine_similarity

logger = logging.getLogger("medical_ai_agent")


async def search_knowledge_embedding(query: str, top_k: int = 5, types: Optional[List[str]] = None):
    """Search in-memory embeddings and return top_k results."""
    try:
        if not embedded_documents:
            return {"success": True, "results": []}
        query_embedding = get_embedding(query)
        results = []
        for doc in embedded_documents:
            if types and doc['knowledge_type'] not in types:
                continue
            similarity = cosine_similarity(query_embedding, doc['embedding'])
            if similarity > 0.1:
                results.append({
                    "knowledge_type": doc["knowledge_type"],
                    "content": doc["content"],
                    "metadata": doc["metadata"],
                    "score": similarity,
                })
        results.sort(key=lambda x: x['score'], reverse=True)
        return {"success": True, "results": results[:top_k]}
    except Exception as e:
        logger.error(f"向量搜索适配器失败: {e}")
        raise HTTPException(status_code=400, detail=f"向量搜索失败: {str(e)}")
