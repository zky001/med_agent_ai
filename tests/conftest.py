import sys
from types import SimpleNamespace
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Provide minimal stubs for external packages if missing
if 'numpy' not in sys.modules:
    import math
    numpy_stub = SimpleNamespace(
        array=lambda x: x,
        dot=lambda a, b: sum(i*j for i, j in zip(a,b)),
        linalg=SimpleNamespace(norm=lambda v: math.sqrt(sum(i*i for i in v))),
        isscalar=lambda x: isinstance(x, (int, float)),
    )
    sys.modules['numpy'] = numpy_stub

if 'chardet' not in sys.modules:
    chardet_stub = SimpleNamespace(detect=lambda b: {'encoding': 'utf-8', 'confidence': 1.0})
    sys.modules['chardet'] = chardet_stub

if 'fastapi' not in sys.modules:
    class DummyHTTPException(Exception):
        def __init__(self, status_code=400, detail=''):
            self.status_code = status_code
            self.detail = detail
    class DummyFastAPI:
        def __init__(self, *a, **k):
            pass
        def add_middleware(self, *a, **k):
            pass
        def _route(self, *a, **k):
            def decorator(fn):
                return fn
            return decorator
        def post(self, *a, **k):
            return self._route()
        def get(self, *a, **k):
            return self._route()
        def delete(self, *a, **k):
            return self._route()
        def put(self, *a, **k):
            return self._route()
        def on_event(self, *a, **k):
            return self._route()
    cors_stub = SimpleNamespace(CORSMiddleware=object)
    fastapi_stub = SimpleNamespace(
        FastAPI=DummyFastAPI,
        HTTPException=DummyHTTPException,
        Form=lambda *a, **k: None,
        UploadFile=type('UploadFile', (), {}),
        File=lambda *a, **k: None,
        middleware=SimpleNamespace(cors=cors_stub),
    )
    sys.modules['fastapi'] = fastapi_stub
    sys.modules['fastapi.middleware'] = SimpleNamespace(cors=cors_stub)
    sys.modules['fastapi.middleware.cors'] = cors_stub

if 'pydantic' not in sys.modules:
    class BaseModel:
        def __init__(self, **data):
            for k,v in data.items():
                setattr(self,k,v)
    pydantic_stub = SimpleNamespace(BaseModel=BaseModel)
    sys.modules['pydantic'] = pydantic_stub

if 'requests' not in sys.modules:
    class DummyResp:
        status_code = 200
        text = ''
        def json(self):
            return {}
    def post(*a, **k):
        return DummyResp()
    def get(*a, **k):
        return DummyResp()
    requests_stub = SimpleNamespace(post=post, get=get)
    sys.modules['requests'] = requests_stub

if 'uvicorn' not in sys.modules:
    uvicorn_stub = SimpleNamespace(run=lambda *a, **k: None)
    sys.modules['uvicorn'] = uvicorn_stub
