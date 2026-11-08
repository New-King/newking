---
title: "SDD"
date: 2026-11-03
description: "规范驱动开发：先写可维护的 spec，再让实现与验证围绕它进行。"
url: https://new-king.com/notes/n15-sdd
series: "AI 学习笔记"
seriesOrder: 15
---
**SSD-Spec-Driven Development 规范驱动开发**
就是一种在写代码之前，先建立一份可维护，有设计、规则约束、任务、实现与验证的开发文档，一般是md格式。

**解决什么问题**
方便交接协作、让每一步结果可验证、防止大模型失忆跑偏

**特点**
根据自身项目（spec/）
可自行划分多个不同职责的文档，开发与设计规范、架构规范、环境与部署、验收标准...
并做好目录索引如 README.md / CLAUDE.md

**需求变更或者出bug**
需求、设计、任务、实现、验证（哪一层出问题，就从哪一层依次向下修改）
