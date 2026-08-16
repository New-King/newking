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
      {"type": "image", "src", "caption"}   图片块
      {"type": "link", "url", "title"}      链接块
      {"type": "video", "title", "url"}     视频块
      {"type": "done"}                      本轮回复结束
"""
import json
import re

from fastapi.responses import StreamingResponse
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
1. 参考资料（带编号 [1][2]...）只是"可能的参考"，供你在回答有关网站/博主本人的内容时引用。
   重点判断：资料与问题是否真正相关。
   - 相关（问博客/笔记/项目/博主看法）→ 依据资料回答，并在用到处标注编号，如：我写过一篇 RAG 落地的博客[2]。
   - 不相关（问代码、算法、闲聊、或资料覆盖不到的事）→ 忽略资料，按你的常识和能力正常回答，不要硬套资料，也不要因为资料无关就拒绝回答。
2. 口语化、自然，像一个真实的人在聊天，不要用"作为AI模型""我是一个AI"这类口吻，直接以"我"自称。
3. 谈到博客/笔记/项目时，自然地提到它们的标题和要点，显得了解自己的内容。
4. 只有真正依据了某条资料时，才标注它的编号 [N]；依据常识/能力回答的内容不标注编号。
5. 除非引用，不要在回复里主动罗列链接列表。
6. 访客没提知识库/网站内容时，正常聊天即可，不必每次都提网站。"""


def _sse(data: dict) -> str:
    """把字典包装成一行 SSE 事件（data: <json> + 空行）。"""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _build_prompt(query, history, context):
    """用 LangChain 组装发给模型的 prompt。

    context：检索到的块列表，每条编号 [N]，供模型引用。
    history：历史对话，只保留最近 MAX_HISTORY_TURNS 轮（滑动窗口，防上下文膨胀）。
    """
    system_text = _build_system_prompt()
    # 检索到相关内容才注入参考资料；否则纯聊天（避免空参考资料干扰）
    if context:
        ref = "\n\n".join(f"[{i+1}] {c['content']}" for i, c in enumerate(context))
        human_text = f"以下是知识库检索到的参考资料（仅供需要时参考，不一定与问题相关）：\n\n{ref}\n\n---\n\n访客的问题：{query}"
    else:
        human_text = query

    # 系统提示放最前
    messages = [{"role": "system", "content": system_text}]

    # 历史对话：滑动窗口，只保留最近 N 轮
    history = history or []
    if len(history) > MAX_HISTORY_TURNS * 2:
        history = history[-MAX_HISTORY_TURNS * 2 :]
    for m in history:
        if m.get("role") in ("user", "assistant"):
            messages.append({"role": m["role"], "content": m.get("content", "")})

    # 当前问题（带检索资料）放最后
    messages.append({"role": "user", "content": human_text})
    return messages


def _cited_inline_links(context, full_text):
    """收集"被引用块的正文内嵌链接"，作为底部链接块。

    职责区分：
    - 相关文章（frontmatter url）→ 由工具卡片展开显示，不进底部。
    - 正文内嵌链接 → 只有回答引用了带链接的块时，底部才输出。
      来源：正文 markdown 里的 [text](url)，以及 frontmatter 的 links 字段。

    full_text：模型生成的完整回复，含 [N] 标记。
    返回：链接块列表（去重）。
    """
    cited = set(int(n) for n in re.findall(r"\[(\d+)\]", full_text))
    blocks = []
    seen = set()

    for i, item in enumerate(context):
        if (i + 1) not in cited:
            continue
        md = item.get("metadata") or {}
        # frontmatter links 字段（正文附带的参考链接）
        for link in md.get("links") or []:
            if link not in seen:
                seen.add(link)
                blocks.append({"type": "link", "url": link, "title": "相关链接"})
        # 正文 markdown 里的 [text](url)（排除 ![图](url) 图片）
        for text, url in re.findall(r"(?<!!)\[([^\]]+)\]\((https?://[^)\s]+)\)", item["content"]):
            if url not in seen:
                seen.add(url)
                blocks.append({"type": "link", "url": url, "title": text[:40] or "相关链接"})
    return blocks


def _related_articles(context):
    """收集检索到的相关文章列表（供工具卡片展开显示）。

    返回：按 url 去重后的 [{url, title}] 列表。
    """
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
    """收集被引用块的正文内嵌图片（markdown ![alt](url)），作为图片块。

    职责：只有回答实际引用了带图的块时，才输出图片。
    """
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


def _stream_generator(query, history):
    """SSE 事件生成器。

    查询路由：
      检索有相关内容（经过相关性阈值过滤）→ 触发"知识库检索"工具 + 注入参考 + 生成。
      检索不到相关内容（闲聊/乱码/与知识库无关）→ 纯聊天，不触发工具、不注入参考。
    """
    yield _sse({"type": "thinking", "status": "running"})

    context = search(query, top_k=5)

    # 只有检索到相关内容，才展示工具卡片并注入参考资料
    if context:
        yield _sse({"type": "tool", "name": "知识库检索", "status": "running"})
        yield _sse(
            {
                "type": "tool",
                "name": "知识库检索",
                "status": "done",
                "result": f"命中 {len(context)} 条相关文章",
                "related": _related_articles(context),
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
