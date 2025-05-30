from typing import List
import numpy as np
import requests
import hashlib
import logging

from config import current_config

logger = logging.getLogger("medical_ai_agent")


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    try:
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        dot_product = np.dot(v1, v2)
        norm_v1 = np.linalg.norm(v1)
        norm_v2 = np.linalg.norm(v2)
        if norm_v1 == 0 or norm_v2 == 0:
            return 0.0
        similarity = dot_product / (norm_v1 * norm_v2)
        return float(similarity)
    except Exception as e:
        logger.warning(f"计算相似度失败: {e}")
        return 0.0


def get_embedding(text: str) -> List[float]:
    """Call configured embedding API and return vector."""
    try:
        if current_config["embedding"]["type"] == "local-api":
            headers = {
                "Authorization": f"Bearer {current_config['embedding']['key']}",
                "Content-Type": "application/json",
            }
            model_name = current_config['embedding']['model']
            if model_name == "auto":
                try:
                    resp = requests.get(
                        f"{current_config['embedding']['url']}/models",
                        headers=headers,
                        timeout=10,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get('data'):
                            model_name = data['data'][0]['id']
                        elif data.get('models'):
                            model_name = data['models'][0]['id']
                        else:
                            model_name = "text-embedding-ada-002"
                except Exception:
                    model_name = "text-embedding-ada-002"

            payload = {"model": model_name, "input": [text]}
            response = requests.post(
                f"{current_config['embedding']['url']}/embeddings",
                headers=headers,
                json=payload,
                timeout=30,
            )
            if response.status_code == 200:
                result = response.json()
                if 'data' in result and result['data']:
                    if 'embedding' in result['data'][0]:
                        return result['data'][0]['embedding']
                elif 'embeddings' in result and result['embeddings']:
                    return result['embeddings'][0]
                elif 'embedding' in result:
                    return result['embedding']
                raise ValueError(f"无法解析embedding响应: {result}")
            raise ValueError(f"Embedding API调用失败: {response.status_code} - {response.text}")
        # Fallback fake embedding
        text_hash = hashlib.sha256(text.encode()).hexdigest()
        fake = [float(int(text_hash[i:i+2], 16)) / 255.0 - 0.5 for i in range(0, min(len(text_hash), 128), 2)]
        while len(fake) < 768:
            fake.extend(fake[:min(768 - len(fake), len(fake))])
        return fake[:768]
    except Exception as e:
        logger.error(f"Embedding生成失败: {e}")
        logger.warning(f"Embedding生成失败: {e}")
        return []
