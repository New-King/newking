/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans SC',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'system-ui',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      // Apple 风色板：暖白底 + 墨黑文字 + Apple 蓝强调
      colors: {
        page: '#F5F5F7', // 页面底色（Apple 招牌暖白）
        card: '#FFFFFF', // 卡片 / 输入框白
        ink: {
          DEFAULT: '#1D1D1F', // 主文字（Apple 墨黑）
          soft: '#3A3A3C', // 次级文字
          muted: '#6E6E73', // 弱文字
          faint: '#86868B', // 更弱文字 / 占位
        },
        accent: {
          DEFAULT: '#171717', // 深灰强调（原设计的黑/深灰质感，替代蓝色）
          hover: '#404040',
          soft: '#F5F5F7', // 浅底（备用）
        },
      },
      // 柔和阴影：卡片 / 输入框 / 悬浮
      boxShadow: {
        apple: '0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'apple-lg': '0 12px 32px rgba(0,0,0,0.1)',
        'apple-input': '0 1px 2px rgba(0,0,0,0.04)',
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
