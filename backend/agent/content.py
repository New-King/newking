"""内容 API 模块：把 content/*.md 解析成结构化 JSON，供前端页面展示。

作用：前端博客/笔记/项目页面，以及导航栏"最新内容"，都从这里拿数据。
不再用前端写死的 mockData，内容变更后实时反映。

返回结构（按类型分组）：
{
  "posts":    [...],   # 博客列表
  "notes":    [...],   # 笔记列表
  "projects": [...],   # 项目列表
  "about":    {...},   # 关于
  "contact":  {...},   # 联系方式
  "resume":   {...}    # 个人简介
}
每个列表项：{ id, title, date, description, cover, video, links }
"""
from .config import CONTENT_DIR
from .indexer import parse_md, json_safe

# 目录名 → 内容类型
_TYPE_BY_DIR = {"posts": "posts", "notes": "notes", "projects": "projects"}


def _load_all():
    """读一遍 content/ 下所有 md，返回按类型分组的字典。"""
    result = {"posts": [], "notes": [], "projects": [], "about": None, "contact": None, "resume": None}

    for path in sorted(CONTENT_DIR.rglob("*.md")):
        rel = path.relative_to(CONTENT_DIR)
        text = path.read_text(encoding="utf-8")
        meta, body = parse_md(text)

        if len(rel.parts) == 1:
            # 顶层文件（about.md / contact.md / resume.md）：单独存
            name = rel.stem
            if name in result:
                item = json_safe({**meta, "id": name, "content": body})
                if name == "contact":
                    # 从正文里提取 email / phone（供导航"联系方式"下拉使用）
                    import re as _re
                    email = _re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", body)
                    phone = _re.search(r"1[3-9][\d-]{8,11}", body)
                    item["email"] = email.group(0) if email else None
                    item["phone"] = phone.group(0) if phone else None
                result[name] = item
            continue

        # 子目录文件（posts/ notes/ projects/）：进对应列表
        dirname = rel.parts[0]
        type_name = _TYPE_BY_DIR.get(dirname)
        if not type_name:
            continue
        item = {
            "id": rel.stem,
            **meta,
            "content": body,
            # 前端兼容字段：
            #   description 和 excerpt 同义（页面有的用 description、有的用 excerpt）
            "excerpt": meta.get("description"),
            # to：列表项的跳转路由（目前列表页自身；未来详情页再细化）
            "to": f"/{type_name}",
        }
        result[type_name].append(json_safe(item))

    return result


def get_content():
    """返回全部内容（按类型分组）。供 GET /api/content 使用。"""
    return _load_all()
