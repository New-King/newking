"""FastAPI 入口：全站后端服务的 HTTP 接口集合。

启动（开发期）：cd backend && ../.venv/bin/uvicorn agent.app:app --reload --port 8000
前端 Vite 已配置代理，浏览器请求 /api/* 会转发到这里。
"""
from fastapi import FastAPI
from pydantic import BaseModel

from . import config
from .content import get_content
from .indexer import index_all
from .chat import chat_stream

# 启用 LangSmith 全链路追踪（有 LANGSMITH_API_KEY 才启用；LangChain 自动读取这些环境变量）
if config.LANGSMITH_API_KEY:
    import os

    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGSMITH_API_KEY", config.LANGSMITH_API_KEY)
    os.environ.setdefault("LANGSMITH_ENDPOINT", config.LANGSMITH_ENDPOINT)
    os.environ.setdefault("LANGSMITH_PROJECT", config.LANGSMITH_PROJECT)

app = FastAPI(title="newking-agent")


# ---------- 请求体模型（FastAPI 自动校验 JSON） ----------

class ChatRequest(BaseModel):
    query: str  # 用户本次的问题
    history: list | None = None  # 历史对话 [{role, content}]


class IndexRequest(BaseModel):
    pass


# ---------- 接口 ----------

@app.get("/health")
def health():
    """健康检查：确认服务活着。"""
    return {"status": "ok"}


@app.post("/api/index/index")
def run_index():
    """触发知识库索引（增量幂等）。

    返回本次变更（新增/更新）的文档数。
    以后 CI/CD push 后用 curl 调它，实现"内容变更自动进知识库"。
    """
    changed = index_all()
    return {"ok": True, "changed": changed}


@app.post("/api/chat/stream")
def chat(req: ChatRequest):
    """对话接口（SSE 流式）。

    前端用 fetch 读这个接口的流，按事件类型渲染思考/工具/文字/媒体块。
    """
    return chat_stream(req.query, req.history)


@app.get("/api/content")
def content():
    """返回全站内容（博客/笔记/项目/about/contact/resume）。

    前端博客/笔记/项目页面 + 导航"最新内容"都从这拉。
    """
    return get_content()
