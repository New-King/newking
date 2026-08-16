"""对话模块：实现"提问 → 检索 → 生成 → 流式返回"的核心链路。

媒体块（链接/视频）策略 —— 引用才输出：
    检索到的块带编号，prompt 指示模型：回答引用了哪块知识，就在句尾标注 [N]。
    生成结束后解析 [N]，只对被真正引用的块输出其媒体（links/video）；
    没有引用 → 不输出任何媒体块。
    这避免了"检索命中就塞一堆链接"的噪音。

SSE 事件协议（前端 AgentChat 按此渲染）：
    每行是 data: <json>，用空行分隔。
    事件类型：
      {"type": "thinking", "status": "running"}   思考中
      {"type": "tool", "name", "status": "running|done", "result"}  工具调用卡片
      {"type": "text", "delta": "..."}      流式文字片段
      {"type": "text_done"}                 文字结束
      {"type": "link", "url", "title"}      链接块
      {"type": "video", "title", "url"}     视频块
      {"type": "done"}                      本轮回复结束
"""
import json
import re

from fastapi.responses import StreamingResponse
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
from langchain_openai import ChatOpenAI

from .config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL
from .retrieval import search

# 系统提示：定义"数字分身"的人设和回答规则
SYSTEM_PROMPT = """你是这个网站的主人（即"本人"）的数字分身，负责代表网站主人回答访客的问题。

回答规则：
1. 只依据提供的"参考资料"回答，不要编造；资料里没有的就如实说不知道。
2. 回答要口语化、自然，像一个真实的人在对话，不要用"作为AI模型"这类口吻。
3. 提到博客/笔记/项目时，自然地给出标题和要点。
4. 参考资料每条都有编号 [1][2]...。回答里用到哪条资料的内容，就在对应句子的末尾标注它的编号。
   例如：我写过一篇关于 RAG 落地的博客[2]。没用到就不标。
5. 除非引用，不要在回复里主动罗列链接、视频或资源列表。"""


def _sse(data: dict) -> str:
    """把字典包装成一行 SSE 事件（data: <json> + 空行）。"""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _build_prompt(query, history, context):
    """用 LangChain 组装发给模型的 prompt。

    context：检索到的块列表，每条编号 [N]，供模型引用。
    """
    system = SystemMessagePromptTemplate.from_template(SYSTEM_PROMPT)
    ref = "\n\n".join(f"[{i+1}] {c['content']}" for i, c in enumerate(context))
    human = HumanMessagePromptTemplate.from_template(
        "参考资料：\n{ref}\n\n---\n\n访客的问题：{query}\n请根据参考资料回答。"
    )
    chat_prompt = ChatPromptTemplate.from_messages([system, human])

    messages = []
    for m in history or []:
        if m.get("role") == "user":
            messages.append({"role": "user", "content": m.get("content", "")})
        elif m.get("role") == "assistant":
            messages.append({"role": "assistant", "content": m.get("content", "")})

    formatted = chat_prompt.format_messages(ref=ref, query=query)
    messages.extend(
        [
            {"role": "system", "content": m.content}
            if m.type == "system"
            else {"role": "user", "content": m.content}
            for m in formatted
        ]
    )
    return messages


def _cited_media_blocks(context, full_text):
    """根据模型实际引用的编号，收集媒体块。

    full_text：模型生成的完整回复，含 [N] 标记。
    用正则找出所有被引用的编号，只对这些块输出 links / video。
    cover 是前端几何图形名，不是图片 URL，不作为图片输出。
    """
    cited = set(int(n) for n in re.findall(r"\[(\d+)\]", full_text))
    blocks = []
    for i, item in enumerate(context):
        if (i + 1) not in cited:
            continue
        md = item.get("metadata") or {}
        for link in md.get("links") or []:
            blocks.append({"type": "link", "url": link, "title": "相关链接"})
        video = md.get("video")
        if video:
            blocks.append({"type": "video", "title": "演示视频", "url": video})
    return blocks


def _stream_generator(query, history):
    """SSE 事件生成器：按顺序产出 思考/工具/文字/媒体/结束 事件。"""
    yield _sse({"type": "thinking", "status": "running"})

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

    # DeepSeek 流式生成（用 LangChain ChatOpenAI 走 OpenAI 兼容接口）
    llm = ChatOpenAI(
        model=DEEPSEEK_MODEL,
        api_key=DEEPSEEK_API_KEY,
        base_url=DEEPSEEK_BASE_URL,
        streaming=True,
    )
    messages = _build_prompt(query, history, context)
    full_text = ""
    stream = llm.stream(messages)
    for chunk in stream:
        delta = chunk.content or ""
        if delta:
            full_text += delta
            yield _sse({"type": "text", "delta": delta})
    yield _sse({"type": "text_done"})

    # 引用才输出的媒体块（cover 不是图片 URL，不输出 image）
    for block in _cited_media_blocks(context, full_text):
        yield _sse(block)

    yield _sse({"type": "done"})


def chat_stream(query: str, history=None):
    """对外入口：返回一个 SSE StreamingResponse。"""
    history = history or []
    return StreamingResponse(
        _stream_generator(query, history),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
