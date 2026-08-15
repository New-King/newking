---
title: 用 React 与 Vite 搭建现代前端
date: 2026-07-12
description: Vite 冷启动与 React 工程化的取舍，以及项目结构的演进。
---

## 为什么选 Vite

Vite 的冷启动速度和 HMR 体验明显优于传统打包器，开发期的反馈循环更短。

## 工程化的取舍

- Tailwind CSS：原子化样式，避免维护大量组件样式文件
- react-router-dom：路由即结构，页面组织清晰
- 纯前端起步，数据用本地 mock，后续再平滑接入后端

## 项目结构演进

从单文件起步，随着功能增加逐步拆出 components、pages、data 三层，保持"数据与渲染分离"。
