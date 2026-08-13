# 项目约定（Agent 必读）

## 技术栈
- React 18 + Vite 5 + Tailwind CSS 3 + react-router-dom 6（纯前端，无后端，数据全部为本地 mock）。

## UI 风格（硬性要求）
- 全站必须遵循 **`docs/设计规范.md`** 的「深灰极简 · Apple 质感」设计系统。
- 颜色 / 阴影 / 圆角一律使用其中定义的令牌（`tailwind.config.js` 是令牌唯一来源，值为 CSS 变量），**禁止自行新造色值，禁止引入彩色强调（蓝 / 紫 / 绿等）**。
- **深色模式（html.dark）**：新增组件必须同时提供 `dark:` 变体；禁止使用不跟随主题的硬编码中性色（`bg-neutral-*`、`text-neutral-*`、`border-black/*`、`bg-white`），确需使用必须配 `dark:` 变体。详见 `docs/设计规范.md` §4.1。
- 新增页面 / 组件时先读 `docs/设计规范.md` 的组件规范，照已有组件样式实现。

## 文案（硬性要求）
- 用户可见文案（占位符、按钮文字、页面内容、导航、错误提示等）**一律不得擅自增删改**。
- 确需改动文案时，先向用户说明并征得同意后再改。

## 开发注意
- 修改 `tailwind.config.js` 后，**Vite dev server 不会热载入新配置**，需要手动重启（否则出现 CSS 500 / 类不存在的报错）。
- 设计令牌集中管理，勿在组件里写死十六进制色值。

## 常用命令
- `npm run dev` / `npm run build` / `npm run preview`

## 项目页数据模型（新增项目的固定流程）
用户提供 → Agent 实现，`src/data/mockData.js` 的 `projects` 数组：

```js
{
  id: 'j6',
  title: '项目名称',          // 用户提供
  date: '2026-08-10',        // 用户提供或按当前日期填（YYYY-MM-DD）
  description: '一句话描述',   // 用户提供
  cover: 'ring',             // 封面缩略图：内置几何图形模板（ring/square/triangle/dots/cross）
  preview: {                 // 悬停预览：专属场景动画（示意即可，不放真实图片）
    scene: 'terminal',       // 模板：terminal / chat / form / list，新形态再新增模板
    ...场景配置               // 按场景模板的参数传入（lines / question / answer / modules 等）
  },
  to: '/projects',
}
```

- `SCENES` 注册表在 `src/pages/ProjectsPage.jsx`，新增场景 = 新增一个组件并注册。
- 预览是「示意动画」而非真实截图/视频：轻量、零素材、统一风格，访客想看详情自行点击进入。
- 用户若提供真实封面图，需先与用户确认后扩展 `cover` 支持图片。`
