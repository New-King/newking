---
title: 用 React 与 Vite 搭建现代前端
date: 2026-07-12
description: Vite 冷启动与 React 工程化的取舍，以及项目结构的演进。
image: https://picsum.photos/seed/react-vite/800/450
---

## 为什么选 Vite

更详细的对比可以参考 [Vite 官方文档](https://vite.dev/guide/why.html)，里面解释了冷启动优化的原理。


## 工程化的取舍

- Tailwind CSS：原子化样式，避免维护大量组件样式文件
- react-router-dom：路由即结构，页面组织清晰
- 纯前端起步，数据用本地 mock，后续再平滑接入后端

## 项目结构演进

从单文件起步，随着功能增加逐步拆出 components、pages、data 三层，保持"数据与渲染分离"。
