---
title: box-newking — 文件快传
date: 2026-08-24
description: 像取快递一样取文件：无需注册，上传获码、输码即取，部署于 box.new-king.com。
cover: triangle
url: https://box.new-king.com
---

## 概览

基于 [FileCodeBox](https://github.com/vastsa/FileCodeBox) 的自托管文件快传服务。发件人上传文件或文本后获得取件码，收件人输入 5 位码即可下载，适合内网传文件、临时分享。

## 核心能力

- 文件 / 文本双模式发送，支持拖拽、粘贴上传
- 取件码提取，支持 curl / wget 终端下载
- 发件 / 取件记录本地持久化，顶部 History 可交叉查看
- 深色模式与 newking 站点色板统一

## 技术要点

Vue 3 + FastAPI monorepo；前端改造含全局历史抽屉、morphicons 图标变形动画；日常通过 GitHub Actions 快速部署到自有服务器。
