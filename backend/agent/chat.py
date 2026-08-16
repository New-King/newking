"""对话模块：实现"提问 → 检索 → 生成 → 流式返回"的核心链路。

SSE 事件协议（前端 AgentChat 按此渲染）：
    每行是 data: <json>，用空行分隔。
    事件类型：
      {"type": "thinking", "status": "running"}   思考中（前端显示"正在思考"）
      {"type": "tool", "name", "status": "running|done", "result"}  工具调用卡片
      {"type": "text", "delta": "..."}      流式文字片段（前端逐字追加）
      {"type": "text_done"}                 文字结束
      {"type": "image", "src", "caption"}   图片块
      {"type": "link", "url", "title"}      链接块
      {"type": "video", "title", "duration"} 视频块
      {"type": "done"}                      本轮回复结束
"""
import json

from fastapi.responses import StreamingResponse
from openai import OpenAI

from .config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL
from .retrieval import search

# 系统提示：定义"数字分身"的人设和回答规则
SYSTEM_PROMPT = """你是这个网站的主人（即"本人"）的数字分身，负责代表网站主人回答访客的问题。

回答规则：
1. 只依据提供的"知识库内容"回答，不要编造；知识库里没有的就如实说不知道。
2. 回答要口语化、自然，像一个真实的人在对话，不要用"作为AI模型"这类口吻。
3. 提到博客/笔记/项目时，自然地给出标题和要点。
4. 如果访客问"你是谁/怎么联系你/做过什么项目"等，优先用知识库里关于主人的内容回答。
"""


def _sse(data: dict) -> str:
    """把字典包装成一行 SSE 事件（data: <json> + 空行）。"""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _build_messages(query, history, context):
    """组装发给 DeepSeek 的消息列表。

    history：前端传来的历史对话 [{role, content}]，保持上下文连续。
    context：检索到的知识块文本，作为"参考资料"。
    """
    ref = "\n\n".join(f"[知识{i+1}] {c['content']}" for i, c in enumerate(context))
    user_prompt = (
        f"参考资料：\n{ref}\n\n---\n\n访客的问题：{query}\n"
        "请根据参考资料回答。"
    )
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history or [])
    messages.append({"role": "user", "content": user_prompt})
    return messages


def _media_blocks(context):
    """从检索命中的元数据里收集媒体块（命中知识库就发图/链接/视频）。

    返回一个列表，每项是 {"type", ...} 字典。
    合并所有命中块的 cover/video/links，去重后按 image → link → video 顺序产出。
    """
    seen = set()
    blocks = []

    def once(value, make):
        if value and value not in seen:
            seen.add(value)
            blocks.append(make(value))

    for item in context:
        md = item.get("metadata") or {}
        once(md.get("cover"), lambda v: {"type": "image", "src": v, "caption": md.get("title")})
        for link in md.get("links") or []:
            once(link, lambda v: {"type": "link", "url": v, "title": "相关链接"})
        once(md.get("video"), lambda v: {"type": "video", "title": "演示视频", "duration": "01:00"})
    return blocks


def _stream_generator(query, history):
    """SSE 事件生成器：按顺序产出 思考/工具/文字/媒体/结束 事件。"""
    # 1. 思考中
    yield _sse({"type": "thinking", "status": "running"})

    # 2. 工具调用：检索知识库
    yield _sse({"type": "tool", "name": "知识库检索", "status": "running"})
    context = search(query, top_k=5)
    yield _sse(
        {
            "type": "tool",
            "name": "知识库检索",
            "status": "done",
            "result": f"命中 {len(context)} 条相关内容",
        }
    )

    # 3. DeepSeek 流式生成
    client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
    messages = _build_messages(query, history, context)
    stream = client.chat.completions.create(
        model=DEEPSEEK_MODEL,
        messages=messages,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            yield _sse({"type": "text", "delta": delta})
    yield _sse({"type": "text_done"})

    # 4. 媒体块（命中知识库就发）
    for block in _media_blocks(context):
        yield _sse(block)

    # 5. 结束
    yield _sse({"type": "done"})


def chat_stream(query: str, history=None):
    """对外入口：返回一个 SSE StreamingResponse。

    FastAPI 会把生成器吐出的每一段文本，按 text/event-stream 发给前端。
    """
    history = history or []
    return StreamingResponse(
        _stream_generator(query, history),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
