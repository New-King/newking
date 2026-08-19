---
title: 为什么我的 Agent 会输出 `<tool_call>` 乱码？记一次函数调用的坑
date: 2026-08-19
description: 访客问我问题，我的 Agent 却回了一段 `<tool_call>` 乱码。一开始以为是模型的问题，排查到最后发现根因在我自己的代码架构。
url: https://new-king.com/blog/p3-tool-call-garbled
---

## 起因：访客问了一句很正常的话

今天有个访客可以问我"最近有什么新博客"。这本来是最简单的问题——用 `query_articles` 工具拉一下文章清单就能答。

结果访客收到的回复里，夹了一段这样的东西：

```
抱歉，系统里确实没找到任何记录。我再仔细查一遍。
<｜tool_calls>
<｜invoke name="query_articles">
</｜invoke>
```

对，就是那种半截的工具调用标签，混在正常文字里，看着像"输出到一半断了"。而且不是每次都这样，是**偶发**——有时正常，有时冒出来，最气人。

## 第一反应：是不是模型太笨？

我的第一反应是怪模型。"DeepSeek 怎么这么不靠谱，把内部格式都打出来了。"

但我冷静了一下，想起一个矛盾：**我用过很多别的 Agent，从来没见它们这样过。** 要是模型本身就爱乱输出，其他 Agent 也该中招。所以更可能是我这边用法的问题，不是模型的问题。

## 先复现，再谈根因

调试这种事，靠"偶尔冒出来"没法定位。我把触发条件猜出来，写了个脚本反复跑：

场景是：第一轮模型调了工具，但检索返回 0 条（"没找到"）。然后模型对这个结果不满意，**还想再查一次**。

我拿这个场景连跑几轮，很快稳定复现：

```python
# 场景：第一轮检索 0 条 → 模型还想再查一次
msgs = [
  SystemMessage(content="你是网站助手。有工具 query_articles。"),
  HumanMessage(content="我最近有哪些博客"),
  # 模型第一轮调了工具，但返回 0 条
  AIMessage(content="", tool_calls=[{"name": "query_articles", "args": {}, "id": "c1"}]),
  ToolMessage(content="没有找到符合条件的内容。", tool_call_id="c1"),
  HumanMessage(content="那再仔细查查，我真的写过博客"),
]

for ch in llm.stream(msgs):   # 这里！第二轮没绑工具
    ...
```

跑几次就看到了 `<tool_call>` 标签。复现成功。

## 根因：不是模型，是我的 loop 设计

问题出在**我第二轮没绑工具**。看代码：

```python
# 第一轮：绑了工具，模型能结构化返回 tool_call
llm_with_tools = llm.bind_tools([SEARCH_TOOL])
first = llm_with_tools.invoke(messages)
# 执行工具、回填结果...

# 第二轮：⚠️ 用的是没绑工具的 llm
stream = llm.stream(messages)   # 问题在这
```

第一轮我绑了工具，模型知道"这轮对话有工具可用"。它调了一次，但结果不满意，**还想再查一次**。可是到第二轮，我用的是**没绑工具**的 `llm`，模型没法结构化返回 `tool_calls` 了。

结果就是：模型知道有工具、想用，但 API 这轮没给它工具通道，它就只能**把 `<tool_call>` 标签当普通文字打出来**。

**换句话说，是我把模型逼到了"用文本模拟工具调用"的境地。** 它想再查一次——这是合理的自主行为——是我这个不完整的 loop 不让他结构化地查。

## 试了 DeepSeek 建议的方案：没用

我去翻了 [DeepSeek 的 Tool Calls 文档](https://api-docs.deepseek.com/zh-cn/guides/tool_calls)，也问了官方建议。官方给的方案是：

> 第二轮不是"关闭工具"，而是用 `tool_choice="none"` 显式禁用。保留 tools 定义，但强制告诉模型"本轮只能纯文字回复"。

我照做了：

```python
llm_none = llm.bind_tools([tool_def], tool_choice="none")
```

结果很打脸：**5 次里 3 次还是乱码**。因为 `tool_choice="none"` 只是"命令"模型别调工具，但模型上下文里**仍然知道有工具**。当它"想再查"的念头上来，这个命令不一定拦得住——它还是会把标签当文字打出来。

## 真正有效的方案：让模型"不知道有工具"

思路反转了一下：与其命令它"别调"，不如让它**根本不知道有工具**。

做法是，在第二轮生成前，把消息里所有工具调用痕迹——assistant 的 `tool_calls` 和 tool 的返回结果——**脱敏成纯文本**：

```python
def sanitize(messages):
    cleaned = []
    for m in messages:
        if isinstance(m, AIMessage) and getattr(m, "tool_calls", None):
            # 把"调用了工具"替换成一句纯文本
            cleaned.append(AIMessage(content="（我查询了相关资料。）"))
        elif isinstance(m, ToolMessage):
            # 工具结果并成一段"查询到的信息"
            tool_texts.append(m.content)
        else:
            cleaned.append(m)
    return cleaned
```

这样发给模型的消息里**没有任何"工具"的概念**，它就只会纯文字回复，压根不会冒出调工具的念头。

实证结果：之前 `tool_choice="none"` 是 5 次乱 3 次；这个脱敏方案，**15 次测试 0 乱码**。

## 一点思考

这个坑让我明白两件事：

一是，**"偶发的诡异输出"，十有八九不是模型随机抽风，而是某个触发条件没复现**。把那条件找出来，才能谈修复，靠"加一句提示词别乱输出"是治标。

二是，**命令模型"不要做什么"，不如让它"不知道那件事"**。`tool_choice="none"` 是前者，脱敏是后者。后者从上下文层面根除，不依赖模型自觉，换个模型也不用重新适配。

当然，更标准的做法是干脆上完整的 agentic loop——模型想查就查，循环到它不想查为止。但对我这个场景（问题类型有限、单次调用够用），脱敏已经足够，就不为了"标准"而把架构改复杂了。
