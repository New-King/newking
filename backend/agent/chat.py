"""对话模块：实现"提问 → 模型自主决定是否检索 → 生成 → 流式返回"的 agentic loop。

架构（对标 OpenClaw / deepseek-harness 的"工具是一等公民"理念）：
  知识库检索是一个**工具（search_knowledge）**，模型通过 function calling 自主决定调不调：
  - 需要查知识库（"你写过 RAG 博客吗"）→ 模型返回 tool_call
  - 不需要（"写个快速排序"）→ 模型直接回答，不调工具
  执行工具后把结果回填，模型基于结果生成最终回答。

SSE 事件协议（前端 AgentChat 按此渲染）：
    每行是 data: <json>，用空行分隔。
    事件类型：
      {"type": "thinking", "status": "running"}   思考中
      {"type": "tool", "name", "status": "running|done", "result"}  工具调用卡片
      {"type": "text", "delta": "..."}      流式文字片段
      {"type": "text_done"}                 文字结束
      {"type": "image", "src", "caption"}   图片块
      {"type": "link", "url", "title"}      链接块
      {"type": "done"}                      本轮回复结束
"""
import json
import re

from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI

from .config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL
from .retrieval import search
from .site_context import build_site_context

# 上下文窗口：保留最近多少轮对话（避免历史无限膨胀）
MAX_HISTORY_TURNS = 8

# 系统提示：定义"数字分身"的人设 + 回答规则 + 网站背景（动态注入）
def _build_system_prompt():
    site = build_site_context()
    return f"""你是「New-King」个人网站的对话助手，是这个网站主人（即"本人"）的数字分身，负责代表网站主人回答访客的问题。

{site}

【回答规则】
1. 当你需要了解网站内容（博客/笔记/项目/博主看法）来回答问题，或问题涉及网站里可能有的内容时，
   使用 search_knowledge 工具检索知识库。不要凭记忆编造网站没有的内容。
2. 问题与网站无关（写代码、算法、闲聊、常识问题）时，不要调用工具，直接凭你的能力回答。
3. 检索结果的参考资料带编号 [1][2]...。回答里用到哪条的内容，就在对应句尾标注编号，
   如：我写过一篇关于 RAG 落地的博客[2]。没用到不标。
4. 口语化、自然，像一个真实的人在聊天，不要用"作为AI模型""我是一个AI"这类口吻，直接以"我"自称。
5. 谈到博客/笔记/项目时，自然地提到它们的标题和要点，显得了解自己的内容。
6. 除非引用，不要在回复里主动罗列链接列表。
7. 访客没提知识库/网站内容时，正常聊天即可，不必每次都提网站。"""


# search_knowledge 工具定义（JSON Schema，DeepSeek 支持 OpenAI 兼容 function calling）
SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "search_knowledge",
        "description": "检索网站的知识库（博客/笔记/项目内容），返回与问题最相关的内容块。"
        "当问题涉及网站内容、或需要确认网站是否写过相关内容时调用。",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "要检索的问题或关键词，尽量简洁（如：RAG 博客、warp 终端）",
                }
            },
            "required": ["query"],
        },
    },
}


def _sse(data: dict) -> str:
    """把字典包装成一行 SSE 事件（data: <json> + 空行）。"""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _build_messages(query, history):
    """组装发给模型的 messages（系统 + 历史 + 当前问题）。

    注意：此时还不知道是否检索，所以当前问题不带参考资料——
    由模型决定是否调 search_knowledge，工具结果在第二轮回填。
    """
    messages = [SystemMessage(content=_build_system_prompt())]
    # 历史对话：滑动窗口
    history = history or []
    if len(history) > MAX_HISTORY_TURNS * 2:
        history = history[-MAX_HISTORY_TURNS * 2 :]
    for m in history:
        if m.get("role") == "user":
            messages.append(HumanMessage(content=m.get("content", "")))
        elif m.get("role") == "assistant":
            messages.append(AIMessage(content=m.get("content", "")))
    messages.append(HumanMessage(content=query))
    return messages


def _cited_inline_links(context, full_text):
    """收集"被引用块的正文内嵌链接"，作为底部链接块。"""
    cited = set(int(n) for n in re.findall(r"\[(\d+)\]", full_text))
    blocks = []
    seen = set()
    for i, item in enumerate(context):
        if (i + 1) not in cited:
            continue
        md = item.get("metadata") or {}
        for link in md.get("links") or []:
            if link not in seen:
                seen.add(link)
                blocks.append({"type": "link", "url": link, "title": "相关链接"})
        for text, url in re.findall(r"(?<!!)\[([^\]]+)\]\((https?://[^)\s]+)\)", item["content"]):
            if url not in seen:
                seen.add(url)
                blocks.append({"type": "link", "url": url, "title": text[:40] or "相关链接"})
    return blocks


def _related_articles(context):
    """收集检索到的相关文章列表（供工具卡片展开显示）。"""
    seen = set()
    items = []
    for c in context:
        md = c.get("metadata") or {}
        url = md.get("url")
        title = md.get("title") or "未命名文章"
        if url and url not in seen:
            seen.add(url)
            items.append({"url": url, "title": title})
    return items


def _cited_inline_images(context, full_text):
    """收集被引用块的正文内嵌图片（markdown ![alt](url)），作为图片块。"""
    cited = set(int(n) for n in re.findall(r"\[(\d+)\]", full_text))
    blocks = []
    seen = set()
    for i, item in enumerate(context):
        if (i + 1) not in cited:
            continue
        for alt, url in re.findall(r"!\[([^\]]*)\]\((https?://[^)\s]+)\)", item["content"]):
            if url not in seen:
                seen.add(url)
                blocks.append({"type": "image", "src": url, "caption": alt or (item.get("metadata") or {}).get("title")})
    return blocks


def _format_tool_result(context):
    """把检索结果格式化，作为工具调用的返回消息。"""
    if not context:
        return "知识库里没有找到与问题相关的内容。"
    parts = [f"知识库检索到 {len(context)} 条相关内容：\n"]
    for i, c in enumerate(context):
        md = c.get("metadata") or {}
        title = md.get("title", "未命名")
        parts.append(f"[{i+1}] 《{title}》：{c['content']}")
    return "\n\n".join(parts)


def _stream_generator(query, history):
    """SSE 事件生成器（agentic loop 最小形态）。

    流程：
      1. 发问题给模型（带 search_knowledge 工具定义）
      2. 模型自主决定：
         - 需要检索 → 返回 tool_call → 执行检索 → 回填工具结果
         - 不需要 → 直接进入生成
      3. 模型基于（可能有的）检索结果流式生成最终回答
    """
    yield _sse({"type": "thinking", "status": "running"})

    llm = ChatOpenAI(
        model=DEEPSEEK_MODEL,
        api_key=DEEPSEEK_API_KEY,
        base_url=DEEPSEEK_BASE_URL,
        temperature=0.7,
    )
    llm_with_tools = llm.bind_tools([SEARCH_TOOL])

    messages = _build_messages(query, history)

    # 第一轮：模型决定是否调工具
    first = llm_with_tools.invoke(messages)
    context = []

    # 模型请求调用工具
    if first.tool_calls:
        yield _sse({"type": "tool", "name": "知识库检索", "status": "running"})
        tool_call = first.tool_calls[0]
        tool_query = (tool_call.get("args") or {}).get("query", query)
        try:
            context = search(tool_query, top_k=5)
            result_msg = f"命中 {len(context)} 条相关文章"
            tool_result = _format_tool_result(context)
        except Exception:
            # 数据库/隧道不可用：优雅降级，不让 SSE 流崩溃（否则界面空白）
            context = []
            result_msg = "知识库暂时无法访问"
            tool_result = "知识库暂时无法访问（可能是服务连接问题），请告知访客稍后再试，本次无需调用知识库。"
        yield _sse(
            {
                "type": "tool",
                "name": "知识库检索",
                "status": "done",
                "result": result_msg,
                "related": _related_articles(context),
            }
        )
        # 把模型第一轮的 tool_call 和工具结果追加进消息
        messages.append(AIMessage(content=first.content or "", tool_calls=[tool_call]))
        messages.append(ToolMessage(content=tool_result, tool_call_id=tool_call["id"]))
    else:
        # 模型没调工具：第一轮结果直接作为回答的一部分（但第一轮没流式，这里重新流式生成）
        # 为保持流式体验，用普通 llm 流式生成
        pass

    # 第二轮：流式生成最终回答
    full_text = ""
    stream = llm.stream(messages)
    for chunk in stream:
        delta = chunk.content or ""
        if delta:
            full_text += delta
            yield _sse({"type": "text", "delta": delta})
    yield _sse({"type": "text_done"})

    # 底部：被引用块的图片 + 正文内嵌链接
    if context:
        for block in _cited_inline_images(context, full_text):
            yield _sse(block)
        for block in _cited_inline_links(context, full_text):
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
