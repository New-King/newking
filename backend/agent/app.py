from fastapi import FastAPI

from .indexer import index_all

app = FastAPI(title="newking-agent")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/index/index")
def run_index():
    changed = index_all()
    return {"ok": True, "changed": changed}
