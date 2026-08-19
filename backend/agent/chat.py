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
1. 你有两个工具：
   - list_articles：访客问"有哪些/写过什么/最近（最新）写了什么"这类列清单问题时调用，直接返回全部文章清单。
   - search_knowledge：问某篇文章/某话题的具体内容、细节、观点时调用，检索知识库返回相关内容块。
2. 需要了解网站内容来回答时用工具，不要凭记忆编造网站没有的内容。但访客只是闲聊、问代码、问算法等与网站无关的问题时，不要调用工具，直接回答。
3. 检索结果的参考资料带编号 [1][2]...。回答里用到哪条的内容，就在对应句尾标注编号，
   如：我写过一篇关于 RAG 落地的博客[2]。没用到不标。
4. 口语化、自然，像一个真实的人在聊天，不要用"作为AI模型""我是一个AI"这类口吻，直接以"我"自称。
5. 谈到博客/笔记/项目时，自然地提到它们的标题和要点，显得了解自己的内容。
6. 除非引用，不要在回复里主动罗列链接列表。但当访客明确要"链接/文章地址/在哪看"时，直接给出检索结果里的 url。
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

# list_articles 工具定义：查"有哪些文章/最近写了什么"这类列表型问题。
# 不向量检索，直接返回全部文章（博客/笔记/项目）的标题+日期+链接，命中率 100%。
# 与 search_knowledge 互补：列表型问题用它，内容细节才用检索。
LIST_ARTICLES_TOOL = {
    "type": "function",
    "function": {
        "name": "list_articles",
        "description": "列出网站的文章/博客/笔记/项目清单（标题、日期、链接），不检索内容。"
        "当访客问'有哪些文章/博客/笔记/项目、最近/最新写了什么、写过什么'这类列表型问题时调用。",
        "parameters": {
            "type": "object",
            "properties": {},
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
    """把检索结果格式化，作为工具调用的返回消息。

    每条结果都带上文章的 url（唯一跳转链接），
    这样模型在访客要"链接/文章地址"时能直接给出，而不是说不知道。
    """
    if not context:
        return "知识库里没有找到与问题相关的内容。"
    parts = [f"知识库检索到 {len(context)} 条相关内容：\n"]
    for i, c in enumerate(context):
        md = c.get("metadata") or {}
        title = md.get("title", "未命名")
        url = md.get("url", "")
        line = f"[{i+1}] 《{title}》"
        if url:
            line += f"（链接：{url}）"
        line += f"：{c['content']}"
        parts.append(line)
    return "\n\n".join(parts)


def _list_articles_result():
    """list_articles 工具：返回全部文章（博客/笔记/项目）的标题+日期+链接。"""
    from .content import get_content

    data = get_content()
    lines = []
    sections = [("博客", data.get("posts") or []), ("笔记", data.get("notes") or []), ("项目", data.get("projects") or [])]
    for label, items in sections:
        if not items:
            continue
        lines.append(f"{label}（{len(items)} 个）：")
        for i in sorted(items, key=lambda x: x.get("date", ""), reverse=True):
            title = i.get("title", "未命名")
            date = i.get("date", "")
            url = i.get("url", "")
            link = f"（{url}）" if url else ""
            lines.append(f"- 《{title}》{date}{link}")
    if not lines:
        return "网站上暂时没有文章。"
    return "\n".join(lines)


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
        model_kwargs={"reasoning_effort": "low"},  # 思考模式：开启，强度最低（low）
    )
    llm_with_tools = llm.bind_tools([SEARCH_TOOL, LIST_ARTICLES_TOOL])

    messages = _build_messages(query, history)

    try:
        # 第一轮：模型决定是否调工具
        first = llm_with_tools.invoke(messages)
    except Exception as e:
        # 模型调用失败：发 error 事件，不崩
        yield _sse({"type": "error", "message": "模型服务暂时不可用，请稍后再试。"})
        yield _sse({"type": "done"})
        return

    context = []

    # 模型请求调用工具（可能一次性返回多个 tool_call，逐个执行并回填）
    if first.tool_calls:
        context = []
        for tool_call in first.tool_calls:
            name = tool_call.get("name")
            tool_id = tool_call["id"]

            if name == "list_articles":
                # 列表型问题：直接返回全部文章清单（不向量检索）
                yield _sse({"type": "tool", "name": "文章清单", "status": "running"})
                try:
                    tool_result = _list_articles_result()
                    result_msg = "已列出全部文章"
                    tool_ok = True
                except Exception:
                    tool_result = "文章清单暂时无法获取，请告知访客稍后再试。"
                    result_msg = "文章清单暂时无法获取"
                    tool_ok = False
                yield _sse(
                    {
                        "type": "tool",
                        "name": "文章清单",
                        "status": "done",
                        "ok": tool_ok,
                        "result": result_msg,
                        "related": [],
                    }
                )
                messages.append(AIMessage(content=first.content or "", tool_calls=[tool_call]))
                messages.append(ToolMessage(content=tool_result, tool_call_id=tool_id))
                continue

            if name != "search_knowledge":
                # 未知工具：占位回填，避免"assistant 带 tool_calls 必须有对应 tool message"报错
                messages.append(AIMessage(content=first.content or "", tool_calls=[tool_call]))
                messages.append(ToolMessage(content="（无此工具）", tool_call_id=tool_id))
                continue

            yield _sse({"type": "tool", "name": "知识库检索", "status": "running"})
            tool_query = (tool_call.get("args") or {}).get("query", query)
            try:
                found = search(tool_query, top_k=5)
                result_msg = f"命中 {len(found)} 条相关文章"
                tool_result = _format_tool_result(found)
                tool_ok = True
            except Exception:
                # 数据库/隧道不可用：工具标记失败（ok:false，前端显示 ×），降级为纯聊天，不崩
                found = []
                result_msg = "知识库暂时无法访问"
                tool_result = "知识库暂时无法访问（可能是服务连接问题），请告知访客稍后再试，本次无需调用知识库。"
                tool_ok = False
            yield _sse(
                {
                    "type": "tool",
                    "name": "知识库检索",
                    "status": "done",
                    "ok": tool_ok,
                    "result": result_msg,
                    "related": _related_articles(found),
                }
            )
            context.extend(found)
            # 把这一轮 tool_call 和工具结果追加进消息（每个 tool_call 都要有对应 ToolMessage）
            messages.append(AIMessage(content=first.content or "", tool_calls=[tool_call]))
            messages.append(ToolMessage(content=tool_result, tool_call_id=tool_id))
    else:
        # 模型没调工具：直接进入流式生成
        pass

    # 第二轮：流式生成最终回答
    # 兜底：若模型输出未格式化的 <tool_call> 文本（本方案只做一轮工具调用，
    # 模型想再查时可能会用文本模拟调用），把它过滤掉，不让它漏到前端变乱码。
    full_text = ""
    try:
        stream = llm.stream(messages)
        for chunk in stream:
            delta = chunk.content or ""
            if not delta:
                continue
            # 过滤模型用纯文本模拟的工具调用标签
            if re.search(r"<\s*tool_call", delta) or delta.lstrip().startswith("<"):
                continue
            full_text += delta
            yield _sse({"type": "text", "delta": delta})
    except Exception as e:
        # 生成失败：发 error 事件，不崩（已有部分内容保留，告知中断）
        yield _sse({"type": "error", "message": "回复生成中断，请重试。"})
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
