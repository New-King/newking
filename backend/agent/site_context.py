"""网站背景：动态生成系统提示词里的"网站信息"部分。

结构（分两块）：
1. 人格底座（每次对话都注入）：
   - 个人信息（about / resume / contact）—— 回答"你是谁/经历/技能/怎么联系"的基础，
     不依赖检索（短身份问题检索效果差，业界标准是把身份信息做成常驻上下文）。
2. 内容索引（供检索参考）：
   - 博客/笔记/项目列表（几篇、分别是什么）—— 让模型知道知识库有什么。

从 content/ 读取真实数据，数据变了提示词自动更新。
"""
from .content import get_content


def _clean(text):
    """去掉 markdown 注释（<!-- -->）和空行，压缩成一段。"""
    import re
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    return " ".join(line.strip() for line in text.splitlines() if line.strip())


def build_site_context():
    """返回网站背景文本（注入到系统提示词）。"""
    data = get_content()
    posts = data.get("posts") or []
    notes = data.get("notes") or []
    projects = data.get("projects") or []
    about = data.get("about") or {}
    resume = data.get("resume") or {}
    contact = data.get("contact") or {}

    def titles(items):
        return "、".join(i.get("title", "") for i in items) or "（暂无）"

    lines = []
    lines.append("【关于这个网站】")
    lines.append("这是一个以「对话」为入口的个人网站，你是它的对话助手，代表网站主人回答访客问题。")

    # 人格底座：个人信息常驻
    if about.get("content"):
        lines.append(f"\n【关于我】\n{_clean(about['content'])}")
    if resume.get("content"):
        lines.append(f"\n【我的经历与技能】\n{_clean(resume['content'])}")
    if contact:
        parts = []
        if contact.get("email"):
            parts.append(f"邮箱：{contact['email']}")
        if contact.get("phone"):
            parts.append(f"电话：{contact['phone']}")
        if parts:
            lines.append(f"\n【联系方式】\n{'；'.join(parts)}")

    # 内容索引：知识库有什么
    lines.append("\n【网站内容（你的知识库）】")
    lines.append(f"- 博客：共 {len(posts)} 篇，包括：{titles(posts)}")
    lines.append(f"- 笔记：共 {len(notes)} 篇，包括：{titles(notes)}")
    lines.append(f"- 项目：共 {len(projects)} 个，包括：{titles(projects)}")
    lines.append("访客常问：你是谁、你的经历、你写过什么、做过哪些项目、对某技术怎么看等。")
    lines.append("博客/笔记/项目的具体内容以检索到的资料为准；关于你个人（身份、经历、联系方式）直接以【关于我】为准。")
    return "\n".join(lines)
