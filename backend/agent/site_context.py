"""网站背景：动态生成系统提示词里的"网站信息"部分。

结构（分两块）：
1. 人格底座（每次对话都注入）：
   - 个人信息（关于我 / 联系方式）—— 来自 content 或常驻兜底，
     不依赖检索（短身份问题检索效果差，业界标准是把身份信息做成常驻上下文）。
2. 内容索引（供检索参考）：
   - 博客：数量 + 近期 3 篇标题（博客是常被点名的，给近期标题有助模型定位）
   - 笔记：只数量（笔记少被点名，标题占 token 且价值低）
   - 作品：数量 + 全部标题（数量少且常被问"做过哪些作品"）

从 content/ 读取真实数据，数据变了提示词自动更新。
"""
from .content import get_content

# 原 content/about.md、contact.md 已并入概览页，不再作为独立页面存在。
# 这里保留一份常驻身份信息，保证 AI 仍能回答“你是谁 / 怎么联系”。
_DEFAULT_ABOUT = (
    "主要关注 AI Agent 与工程落地：Agent 循环、记忆与上下文、RAG 检索，"
    "以及 LangGraph / LlamaIndex 这些框架的取舍。喜欢把想法直接做成能用的产品。"
)
_DEFAULT_CONTACT = {"email": "hello@example.com", "phone": "138-0000-0000"}


def _clean(text):
    """去掉 markdown 注释（<!-- -->）和空行，压缩成一段。"""
    import re
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    return " ".join(line.strip() for line in text.splitlines() if line.strip())


def _latest_titles(items, n=3):
    """取近期 n 篇的标题（按日期降序）。"""
    sorted_items = sorted(items, key=lambda i: i.get("date", ""), reverse=True)
    return "、".join(i.get("title", "") for i in sorted_items[:n]) or "（暂无）"


def build_site_context():
    """返回网站背景文本（注入到系统提示词）。"""
    data = get_content()
    posts = data.get("posts") or []
    notes = data.get("notes") or []
    projects = data.get("projects") or []
    about = data.get("about") or {}
    contact = data.get("contact") or _DEFAULT_CONTACT
    about_text = (about.get("content") or _DEFAULT_ABOUT).strip()

    lines = []

    # 网站定位（一句话）
    lines.append("【关于这个网站】")
    lines.append(
        "这是一个内容优先的个人网站：左侧目录用于浏览博客/笔记/作品，"
        "右下角的 AI 浮层负责回答访客问题。你代表网站主人回答访客的问题。"
    )

    # 人格底座：个人信息常驻
    if about_text:
        lines.append(f"\n【关于我】\n{_clean(about_text)}")
    if contact:
        parts = []
        if contact.get("email"):
            parts.append(f"邮箱：{contact['email']}")
        if contact.get("phone"):
            parts.append(f"电话：{contact['phone']}")
        if parts:
            lines.append(f"\n【联系方式】\n{'；'.join(parts)}")

    # 内容索引：数量 + 适量标题（不占太多 token）
    lines.append("\n【网站内容（你的知识库）】")
    lines.append(f"- 博客：共 {len(posts)} 篇（近期：《{_latest_titles(posts, 3)}》）")
    lines.append(f"- 笔记：共 {len(notes)} 篇")
    lines.append(f"- 作品：共 {len(projects)} 个，包括：{'、'.join(i.get('title', '') for i in projects)}")
    lines.append("访客常问：你是谁、你的经历、写过什么、做过哪些作品、对某技术怎么看等。")
    lines.append("博客/笔记/作品的具体内容以检索到的资料为准；个人身份与联系方式直接以【关于我】【联系方式】为准。")
    return "\n".join(lines)
