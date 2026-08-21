/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 深色模式：<html class="dark"> 切换（令牌为 CSS 变量，随主题换值）
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'system-ui',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      // 设计令牌（CSS 变量，支持 alpha）：深浅两套值定义在 index.css 的 :root / .dark
      colors: {
        page: 'rgb(var(--page) / <alpha-value>)', // 页面底色
        shell: 'rgb(var(--shell) / <alpha-value>)', // 顶栏 / 对话块（深色专用层）
        card: 'rgb(var(--card) / <alpha-value>)', // 卡片 / 输入框白
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
        },
      },
      // 柔和阴影（CSS 变量，深浅两套）
      boxShadow: {
        apple: 'var(--shadow-apple)',
        'apple-lg': 'var(--shadow-apple-lg)',
        'apple-input': 'var(--shadow-apple-input)',
      },
      // 整体圆角收小约 30%：卡片/气泡/面板统一 16px → 11px
      borderRadius: {
        '2xl': '11px',
      },
      transitionTimingFunction: {
        // 统一缓动曲线：快动缓停（ease-out）。设为 DEFAULT 后，
        // 所有 transition-* / transition-all 默认都使用它；如需显式引用可用 ease-smooth。
        DEFAULT: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
        smooth: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        eq: {
          '0%, 100%': { transform: 'scaleY(0.25)' },
          '50%': { transform: 'scaleY(1)' },
        },
        dot: {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.35' },
          '40%': { transform: 'translateY(-4px)', opacity: '1' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        blink: 'blink 1s step-end infinite',
        eq: 'eq 1s ease-in-out infinite',
        dot: 'dot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
