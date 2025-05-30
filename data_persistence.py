import json
from pathlib import Path
from typing import List, Dict, Any, Tuple

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
VECTOR_STORE_FILE = DATA_DIR / "embedded_documents.json"
UPLOADED_FILES_FILE = DATA_DIR / "uploaded_files.json"

def load_data() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    embedded = []
    uploaded = []
    if VECTOR_STORE_FILE.exists():
        try:
            with open(VECTOR_STORE_FILE, "r", encoding="utf-8") as f:
                embedded = json.load(f)
        except Exception:
            embedded = []
    if UPLOADED_FILES_FILE.exists():
        try:
            with open(UPLOADED_FILES_FILE, "r", encoding="utf-8") as f:
                uploaded = json.load(f)
        except Exception:
            uploaded = []
    return embedded, uploaded

def save_data(embedded: List[Dict[str, Any]], uploaded: List[Dict[str, Any]]) -> None:
    with open(VECTOR_STORE_FILE, "w", encoding="utf-8") as f:
        json.dump(embedded, f, ensure_ascii=False, indent=2)
    with open(UPLOADED_FILES_FILE, "w", encoding="utf-8") as f:
        json.dump(uploaded, f, ensure_ascii=False, indent=2)
