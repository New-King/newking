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
posts / notes / projects 列表按 date 倒序返回（新 → 旧）。
"""
from .config import CONTENT_DIR
from .indexer import parse_md, json_safe

# 目录名 → 内容类型 + 前端路由前缀
_TYPE_BY_DIR = {"posts": "posts", "notes": "notes", "projects": "projects"}
_ROUTE_BY_DIR = {"posts": "/blog", "notes": "/notes", "projects": "/projects"}


def _sort_by_date_desc(items):
    """列表按 frontmatter date 倒序（新 → 旧）。"""
    return sorted(items, key=lambda item: item.get("date", ""), reverse=True)


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
            # to：列表项的详情页路由（前端新增对应详情路由）
            "to": f"{_ROUTE_BY_DIR[dirname]}/{rel.stem}",
        }
        result[type_name].append(json_safe(item))

    for key in ("posts", "notes", "projects"):
        result[key] = _sort_by_date_desc(result[key])

    return result


def get_content():
    """返回全部内容（按类型分组）。供 GET /api/content 使用。"""
    return _load_all()
