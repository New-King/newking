---
title: 换掉手写切块：一次"该不该用现成组件"的纠结
date: 2026-08-19
description: 起因是我问了一句"我们这么写是不是主流"，结果从查证到对比到换掉自研实现，折腾了一轮。记录下真实的经过。
url: https://new-king.com/blog/p2-splitting-choice
---

## 起因是一句质疑

我的知识库索引是自己写的切块函数，按 markdown 标题切。那天看代码时我提了个问题：我们这种方式，是主流吗？还是自己觉得这样合适，很少有人这样拼？

潜台词其实是：frontmatter 拆出来当 metadata、拼到每个 chunk 上的做法，到底合不合常规。

结果一查，发现 LangChain 本来就有切块组件，于是决定换掉自研实现——反正文章会越来越多，早晚要面对这个问题。

## 查证：思路主流，实现是自研

查证之后确认了两点。

一是把 metadata 挂到 chunk 上的思路本身是主流的。RAG 基本都这么干，来源信息必须跟着块走，否则检索到一段话，根本不知道它来自哪篇。

二是实现方式确实是我们自研的——手写的 `split_by_headings`，没有用 LangChain 的现成组件。本质上是当初图省事，没去查官方有没有对应实现。

## 三种切法的对比

后来我翻了 LangChain 的文档，一个是 [RAG 教程里的 RecursiveCharacterTextSplitter](https://docs.langchain.com/oss/python/deepagents/rag#split-documents)，另一个是 [ExperimentalMarkdownSyntaxTextSplitter 的参考文档](https://reference.langchain.org.cn/python/langchain_text_splitters/#langchain_text_splitters.ExperimentalMarkdownSyntaxTextSplitter)。加上我们自研的，一共三种方式，我用同一篇文章各切了一遍：

- 自研 `split_by_headings`：按标题切，标题带在正文里。
- `MarkdownHeaderTextSplitter`：同样按标题切，但标题会单独放进 metadata。
- `ExperimentalMarkdownSyntaxTextSplitter`：除了标题，代码块、表格、引用也会单独成块。

对比下来，纯文字文章三种差别不大；但一旦出现代码块，第三种明显更合理——代码不会被拦腰切断，metadata 里还会标出语言。

中间我还确认了几个细节：这些组件只处理正文标题，frontmatter 还是得自己解析；数据库表结构不用动；metadata 只是字段内容略有变化。

## 一个差点翻车的地方

真正换上去之后，对比数据库里的数据才发现问题：**标题不见了**。

`ExperimentalMarkdownSyntaxTextSplitter` 默认会把标题从内容里剥掉，只放进 metadata。也就是说，块的正文里不再有 `## 标题` 这种开头，而是变成了一个 `Header 2` 字段躺在 metadata 里。

我当时还在琢磨这个 `Header 2` 到底有什么用——检索只看向量相似度，不查这个字段；模型引用时也只看正文。等于标题被剥掉，信息丢了，而那个字段我用不上。

后来翻源码，看到构造参数里有个 `strip_headers`，默认 `True`，作用就是把标题从 chunk 里剥除。改成 `False` 之后，标题就留在正文里了。

这一下就通了：标题还在内容里（和原来一致），代码块又能智能分块，metadata 里还有 `Header 2` 兜底。于是全量重建了索引，自研的切块函数留了备份，万一要回退还能用。

## 一点总结

整个过程是被"我们是不是不够主流"这一问带起来的。最后得到的结论是：该用现成组件的时候还是得用，但用之前要把它的参数看清楚——尤其是那些带默认值、又影响输出结构的参数，别上来就用默认配置，那个 `strip_headers` 的坑，其实文档里都写了，就是当时没细看。以后的文章暂时按这种方式索引，后续文章多一点，再考虑加分类或标签。
