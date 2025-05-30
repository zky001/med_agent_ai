import json
import logging
import requests

from config import current_config

logger = logging.getLogger("medical_ai_agent")


def call_local_llm(message: str, temperature: float = 0.3) -> str:
    """Call local LLM synchronously."""
    try:
        headers = {
            "Authorization": f"Bearer {current_config['llm']['key']}",
            "Content-Type": "application/json",
        }
        data = {
            "model": current_config["llm"]["model"],
            "messages": [
                {"role": "system", "content": "你是一个专业的医学AI助手，专门帮助用户处理临床试验方案相关的问题。请用中文回复。"},
                {"role": "user", "content": message},
            ],
            "temperature": temperature,
            "max_tokens": 1000,
        }
        response = requests.post(
            f"{current_config['llm']['url']}/chat/completions",
            headers=headers,
            json=data,
            timeout=60,
        )
        if response.status_code == 200:
            result = response.json()
            return result["choices"][0]["message"]["content"]
        return f"API调用失败: {response.status_code} - {response.text}"
    except Exception as e:
        logger.error(f"LLM调用失败: {e}")
        return f"抱歉，LLM调用失败: {str(e)}"


def call_local_llm_stream(message: str, system_prompt: str | None = None, temperature: float = 0.3):
    """Stream response from local LLM."""
    headers = {
        "Authorization": f"Bearer {current_config['llm']['key']}",
        "Content-Type": "application/json",
    }
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    else:
        messages.append({"role": "system", "content": "你是一个专业的医学AI助手，专门帮助用户处理临床试验方案相关的问题。请用中文回复。"})
    messages.append({"role": "user", "content": message})

    payload = {
        "model": current_config["llm"]["model"],
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 2000,
        "stream": True,
    }

    try:
        with requests.post(
            f"{current_config['llm']['url']}/chat/completions",
            headers=headers,
            json=payload,
            stream=True,
            timeout=60,
        ) as r:
            if r.status_code != 200:
                raise ValueError(f"API调用失败: {r.status_code} - {r.text}")
            for line in r.iter_lines():
                if not line:
                    continue
                if line.startswith(b'data:'):
                    payload = line[5:].strip()
                    if payload == b"[DONE]":
                        break
                    try:
                        event = json.loads(payload.decode())
                        delta = event.get("choices", [{}])[0].get("delta", {}).get("content")
                        if delta:
                            yield delta
                    except json.JSONDecodeError:
                        continue
    except Exception as e:
        logger.error(f"LLM流式调用失败: {e}")
        raise
