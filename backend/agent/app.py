"""FastAPI 入口：把索引管线包成 HTTP 接口，供外部调用。

先搞懂几个概念：
- HTTP 接口（API）：一个网址+方法，别人可以通过网络请求它来触发功能。
  比如 POST /api/index/index 就是一个接口，请求它就会执行索引。
- FastAPI：Python 的一个 Web 框架，负责"接收 HTTP 请求 → 调用你的函数 → 返回结果"。
  装饰器 @app.get(...) / @app.post(...) 就是注册接口：请求来了就调用下面的函数。

本文件职责：定义两个对外接口。
1. GET /health      → 健康检查，确认服务活着。
2. POST /api/index/index → 触发知识库索引（增量幂等）。

启动方式（在 backend/ 目录下）：
    ../.venv/bin/uvicorn agent.app:app --reload --port 8000
拆开解释：
    uvicorn           Python 的 Web 服务器程序，负责真正跑起来 FastAPI
    agent.app:app     "agent 包里的 app 文件里的 app 对象"（我们的 FastAPI 实例）
    --reload          改代码自动重启（开发期方便）
    --port 8000       服务监听本机 8000 端口
"""
from fastapi import FastAPI

from .indexer import index_all  # 从 indexer 模块导入索引函数

# 创建 FastAPI 应用实例。title 只是给它起个名字（会显示在自动生成的文档里）。
app = FastAPI(title="newking-agent")


@app.get("/health")
def health():
    """健康检查接口。

    作用：确认服务活着、能响应请求。
    用法：浏览器访问 http://127.0.0.1:8000/health，返回 {"status": "ok"}。
    部署后监控/CI 常用来探活。
    """
    return {"status": "ok"}


@app.post("/api/index/index")
def run_index():
    """触发知识库索引的接口。

    作用：调 indexer.py 的 index_all()，把 content/ 里的内容同步进数据库。
    增量幂等：内容没变的文档会跳过，重复调用不会重复插入。
    返回：{"ok": true, "changed": 变更文档数}。

    以后 CI/CD 部署完内容后，用 curl 调这个接口，
    就能实现"我 push 新文章 → 知识库自动更新"。
    调用方式：
        curl -X POST http://127.0.0.1:8000/api/index/index
    """
    changed = index_all()  # 执行真正的索引逻辑，拿到本次变更的文档数
    return {"ok": True, "changed": changed}
