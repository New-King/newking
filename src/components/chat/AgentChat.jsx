import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  DEMO_AUDIO,
  DEMO_CODE,
  DEMO_IMAGE,
  DEMO_TEXT,
  DEMO_TOOLS,
  DEMO_VIDEO,
} from '../../data/mockData';
import { IconArrowDown, IconBubble, IconPause, IconSend } from '../icons';
import MessageItem from './MessageItem';
import TurnRail from './TurnRail';
import BgGrid from './BgGrid';

let uid = 0;
const nextId = () => ++uid;

// 首页预设提问：10 条，初始态时间轴轮播展示（每次 4 条，自动向上滚动，点击直接发送）
const SUGGESTIONS = [
  '做下自我介绍',
  '看下你的作品集',
  '介绍一下这个网站',
  '你的技术栈是什么',
  '你最近在做什么',
  '你的职业经历是怎样的',
  '怎么联系你',
  '你在读什么书',
  '你的学习路径是什么',
  '介绍一下你的项目',
];

// 把元素从旧位置平滑"滑"到新位置（transform 动画，避免布局跳动）
function runSlide(el, fromTop) {
  if (!el) return;
  const toTop = el.getBoundingClientRect().top;
  const dy = fromTop - toTop;
  if (Math.abs(dy) < 1) return;
  el.style.transition = 'none';
  el.style.transform = `translateY(${dy}px)`;
  el.getBoundingClientRect(); // 强制回流
  el.style.transition = 'transform 0.7s cubic-bezier(0.22, 0.61, 0.36, 1)';
  el.style.transform = 'translateY(0)';
  // transitionend 会从子元素冒泡上来（如输入框容器的 max-width 过渡），
  // 必须只认本元素自身 transform 的结束事件，否则动画会被提前打断、瞬移到底。
  const onTransitionEnd = (e) => {
    if (e.propertyName !== 'transform' || e.target !== el) return;
    el.style.transition = '';
    el.style.transform = '';
    el.removeEventListener('transitionend', onTransitionEnd);
  };
  el.addEventListener('transitionend', onTransitionEnd);
}

export default function AgentChat() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(0);
  const [paused, setPaused] = useState(false);
  const [input, setInput] = useState('');
  const [atBottom, setAtBottom] = useState(true);
  const [navHidden, setNavHidden] = useState(false);
  const [nearTop, setNearTop] = useState(true);
  const [keyboardGap, setKeyboardGap] = useState(0); // 移动端键盘遮挡高度（输入框聚焦时上移）

  /* 预设问题轮播：每次完整显示 4 条，上下各露出半行残影（渐隐过渡），
     每 3.5s 向上滚动一条，10 条后无缝循环。
     列表渲染 S9 + 10×2 + S0（前后各多一条残影行），step 0..10 无缝回跳。 */
  const CAROUSEL_ROW_H = 42; // 每条固定高度（间距紧凑）
  const [carouselStep, setCarouselStep] = useState(0);
  const carouselListRef = useRef(null);
  const carouselPrevStepRef = useRef(0);
  // 前后各多一条：顶部残影 = 最后一条，底部残影 = 第一条
  const CAROUSEL_ITEMS = [
    SUGGESTIONS[SUGGESTIONS.length - 1],
    ...SUGGESTIONS,
    ...SUGGESTIONS,
    SUGGESTIONS[0],
  ];

  useEffect(() => {
    const id = setInterval(() => setCarouselStep((s) => (s + 1) % 11), 3500);
    return () => clearInterval(id);
  }, []);

  /* step 10 → 0 时为无缝回跳：禁用过渡直接归零（两处显示内容相同，视觉无感） */
  useEffect(() => {
    const el = carouselListRef.current;
    if (!el) return;
    const isJump = carouselPrevStepRef.current === 10 && carouselStep === 0;
    el.style.transition = isJump ? 'none' : 'transform 0.9s cubic-bezier(0.22, 0.61, 0.36, 1)';
    el.style.transform = `translateY(${-carouselStep * CAROUSEL_ROW_H}px)`;
    carouselPrevStepRef.current = carouselStep;
  }, [carouselStep]);

  const formRef = useRef(null);
  const inputElRef = useRef(null);
  const scrollRef = useRef(null);
  const turnRefs = useRef([]);

  const stuckRef = useRef(true);
  const forceScrollRef = useRef(false); // 发送后强制置底（即使之前滚到了上方）
  const mountedRef = useRef(true);
  const pendingRef = useRef(0);
  const pausedRef = useRef(false);
  const pauseWakeRef = useRef(null);
  const pendingSlideRef = useRef(null);
  const doneResolversRef = useRef({});

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* 首页为全屏固定布局（页面本身不可滚动，聊天区内部滚动）。
     挂载时给 body 标记 chat-page：禁用浏览器橡皮筋弹性滚动，
     与微信 WebView 行为对齐（内容不溢出时手指滑动页面不应移动）。 */
  useEffect(() => {
    document.body.classList.add('chat-page');
    return () => document.body.classList.remove('chat-page');
  }, []);

  /* 按 Tab 始终聚焦输入框（无论当前焦点在哪） */
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      inputElRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /* 消息按轮次分组：一条用户消息 + 其后的回复为一轮 */
  const turns = useMemo(() => {
    const list = [];
    let cur = null;
    for (const m of messages) {
      if (m.role === 'user') {
        cur = [m];
        list.push(cur);
      } else if (cur) {
        cur.push(m);
      }
    }
    return list;
  }, [messages]);

  /* 每轮摘要：问题 + 回复片段，供左侧定位条预览 */
  const turnSummaries = useMemo(() => {
    const kindNames = {
      thinking: '思考',
      tool: '工具调用',
      image: '图片',
      code: '代码',
      audio: '音频',
      video: '视频',
    };
    return turns.map((turn) => {
      const question = turn[0]?.text ?? '新对话';
      const assistant = turn.find((m) => m.role === 'assistant');
      let reply = '回复生成中…';
      if (assistant) {
        const textBlock = assistant.blocks.find((b) => b.type === 'text');
        if (textBlock) {
          reply = textBlock.content.replace(/\s+/g, ' ').trim().slice(0, 64);
        } else {
          const kinds = assistant.blocks.map((b) => kindNames[b.type]).filter(Boolean);
          reply = kinds.length ? `包含${kinds.join('、')}` : '…';
        }
      }
      return { question, reply };
    });
  }, [turns]);

  /* 无对话时导航常显（禁用自动隐藏）；开始对话后启用自动隐藏。
     注意：轮次变化 effect 不能带 cleanup——cleanup 会在每次变化前派发 off，
     把发送消息刚触发的 nav-hide（隐藏）又顶回去。卸载时恢复常显单独用空依赖 effect。 */
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(turns.length > 0 ? 'nav-autohide-on' : 'nav-autohide-off'));
  }, [turns.length]);

  /* 通知背景网格当前是否为对话模式（对话展开后，中间对话列暂停动画） */
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('bg-grid-mode', { detail: { started } }));
  }, [started]);

  useEffect(() => {
    return () => window.dispatchEvent(new CustomEvent('nav-autohide-off'));
  }, []);

  /* 导航显示/隐藏：仅记录状态，预留条高度据此塌缩/恢复（不操作滚动，不与自动滚动冲突） */
  useEffect(() => {
    const onNavVisibility = (e) => setNavHidden(e.detail.hidden);
    window.addEventListener('nav-visibility', onNavVisibility);
    return () => window.removeEventListener('nav-visibility', onNavVisibility);
  }, []);

  /* 发送后：输入框从页面中央平滑移动到页面底部 */
  useLayoutEffect(() => {
    if (!started) return;
    const from = pendingSlideRef.current;
    pendingSlideRef.current = null;
    if (from == null) return;
    runSlide(formRef.current, from);
  }, [started]);

  /* 滚动到底部；instant=true 时瞬间跳底（发送后置底不需要动画） */
  const scrollToBottom = (instant = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: instant ? 'auto' : 'smooth' });
  };

  /* 移动端浏览器：键盘弹出时 visualViewport 高度缩小，但 layout viewport 不变，
     底部输入框会被键盘盖住（微信 WebView 会压缩视口所以没这问题）。
     策略（兼容不同浏览器/系统版本）：
     - resize 事件触发（iOS 16.4+ 等）：输入框聚焦时 form/聊天区上移 gap（键盘遮挡高度），
       页面不滚动、顶部不动；
     - resize 不触发（旧 iOS/部分浏览器）：聚焦后延迟重算仍是 0，退化为滚到底部
       保证输入框可见（顶部会被顶起，键盘收起后自动恢复顶部）。 */
  useEffect(() => {
    const vv = window.visualViewport;
    const inputEl = inputElRef.current;
    const calcGap = () => (vv ? Math.max(0, window.innerHeight - vv.height) : 0);

    const applyGap = () => {
      const focused = document.activeElement === inputElRef.current;
      setKeyboardGap(focused ? calcGap() : 0);
    };

    const onFocus = () => {
      // 等键盘弹出动画稳定后重算：resize 若触发，gap > 0 走"上移贴键盘"；
      // 若未触发（旧环境），退化为滚动到底保证输入框可见
      setTimeout(() => {
        if (document.activeElement !== inputElRef.current) return;
        const gap = calcGap();
        if (gap > 0) {
          setKeyboardGap(gap);
        } else {
          window.scrollTo(0, document.body.scrollHeight);
        }
      }, 400);
    };

    const onBlur = () => {
      setKeyboardGap(0);
      // 键盘收起后把页面滚回顶部（兼容路径下曾滚到底）
      setTimeout(() => window.scrollTo(0, 0), 100);
    };

    if (vv) vv.addEventListener('resize', applyGap);
    inputEl?.addEventListener('focusin', onFocus);
    inputEl?.addEventListener('focusout', onBlur);
    return () => {
      if (vv) vv.removeEventListener('resize', applyGap);
      inputEl?.removeEventListener('focusin', onFocus);
      inputEl?.removeEventListener('focusout', onBlur);
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    // 发送后瞬间置底（forceScrollRef）；平时仅在停留在底部附近时平滑跟随，避免向上阅读被拽回
    if (forceScrollRef.current) {
      forceScrollRef.current = false;
      scrollToBottom(true);
    } else if (stuckRef.current) {
      scrollToBottom();
    }
  }, [messages, started]);

  useEffect(() => {
    if (pending <= 0) return;
    const id = setInterval(() => {
      const el = scrollRef.current;
      // 瞬间置底：流式输出时内容持续增长，smooth 动画追逐移动目标易抖动/上跳；
      // 每 180ms 直接吸附到底部，配合 overflow-anchor:none 彻底消除上跳
      if (el && stuckRef.current) el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    }, 180);
    return () => clearInterval(id);
  }, [pending]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stuckRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
    setNearTop(el.scrollTop < 55);
  };

  /* 跳转到指定轮次 */
  const jumpToTurn = (i) => {
    const node = turnRefs.current[i];
    const el = scrollRef.current;
    if (!node || !el) return;
    const top =
      node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 16;
    el.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  const onBlockDone = (blockId) => doneResolversRef.current[blockId]?.();

  /* 暂停当前回复：打断等待、移除未完成的骨架、工具卡片标记为已暂停、流式文字冻结 */
  const handlePause = () => {
    if (pending <= 0) return;
    pausedRef.current = true;
    setPaused(true);
    pauseWakeRef.current?.();
    setMessages((prev) =>
      prev.map((m) => {
        // 用户消息没有 blocks 字段，需做空保护
        const blocks = m.blocks || [];
        const inProgress = blocks.some(
          (b) => b.status === 'loading' || b.status === 'running' || b.status === 'streaming'
        );
        if (!inProgress) return m;
        return {
          ...m,
          paused: true,
          blocks: blocks
            .filter((b) => b.status !== 'loading')
            .map((b) => (b.status === 'running' ? { ...b, status: 'paused' } : b)),
        };
      })
    );
  };

  /* 发送逻辑（供表单提交与预设提问共用）：对话发出后立即隐藏顶部导航、
     强制置底、输入框滑到底部，然后调度 mock 回复 */
  const sendText = (text) => {
    if (!text) return;
    // 回复生成中禁止连续发送（按钮已是暂停、回车也会被拦下）；手动暂停后才可继续发送
    if (pending > 0 && !paused) return;

    // 对话发出后立即隐藏顶部导航
    window.dispatchEvent(new CustomEvent('nav-hide'));

    // 无论之前滚到哪，发送后立即置底（看最新回复）
    forceScrollRef.current = true;
    stuckRef.current = true;

    pendingSlideRef.current = formRef.current?.getBoundingClientRect().top ?? null;

    pausedRef.current = false;
    setPaused(false);
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text }]);
    setStarted(true);
    setInput('');
    startReply(text);
    // 桌面端（鼠标设备）：发送后保持焦点便于连续输入；
    // 触屏设备（手机）：发送后失焦收起虚拟键盘，避免输入框反复弹出
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      inputElRef.current?.focus();
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    sendText(input.trim());
  };

  /* ---- mock 回复调度：一条回复依次演示 思考 / 工具调用 / 流式文字 / 图片 / 代码 / 音频 / 视频 ---- */
  const startReply = (userText) => {
    const msgId = nextId();
    pendingRef.current += 1;
    setPending(pendingRef.current);

    setMessages((prev) => [...prev, { id: msgId, role: 'assistant', blocks: [] }]);

    const update = (patch) =>
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, ...patch } : m)));

    const updateBlock = (blockId, patch) =>
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, blocks: m.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)) }
            : m
        )
      );

    const addBlock = (block) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, blocks: [...m.blocks, block] } : m))
      );
      return block;
    };

    // 可被暂停打断的等待：点击暂停时立即唤醒，由调用方检查 pausedRef 决定是否继续
    const sleepPauseable = (ms) =>
      new Promise((resolve) => {
        const wake = () => {
          if (pauseWakeRef.current === wake) pauseWakeRef.current = null;
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(wake, ms);
        pauseWakeRef.current = wake;
      });

    (async () => {
      try {
        // 1. 思考过程（仅加载指示，2 秒后淡出，开始正式回复）
        const thinking = addBlock({ id: nextId(), type: 'thinking', status: 'loading' });
        await sleepPauseable(2000);
        if (!mountedRef.current || pausedRef.current) return;
        updateBlock(thinking.id, { status: 'done' });

        // 2. 工具调用
        for (const tool of DEMO_TOOLS) {
          const t = addBlock({ id: nextId(), type: 'tool', status: 'running', name: tool.name });
          await sleepPauseable(tool.duration);
          if (!mountedRef.current || pausedRef.current) return;
          updateBlock(t.id, { status: 'done', result: tool.result });
        }

        // 3. 流式文字
        const text = addBlock({ id: nextId(), type: 'text', status: 'loading', content: DEMO_TEXT });
        await sleepPauseable(320);
        if (!mountedRef.current || pausedRef.current) return;
        updateBlock(text.id, { status: 'streaming' });
        await new Promise((resolve) => {
          doneResolversRef.current[text.id] = resolve;
          pauseWakeRef.current = resolve;
        });
        if (!mountedRef.current || pausedRef.current) return;
        delete doneResolversRef.current[text.id];
        updateBlock(text.id, { status: 'done' });

        // 4. 图片
        const image = addBlock({ id: nextId(), type: 'image', status: 'loading' });
        await sleepPauseable(950);
        if (!mountedRef.current || pausedRef.current) return;
        updateBlock(image.id, { status: 'done', src: DEMO_IMAGE.src, caption: DEMO_IMAGE.caption });

        // 5. 代码块
        const code = addBlock({
          id: nextId(),
          type: 'code',
          status: 'loading',
          language: 'javascript',
          code: DEMO_CODE,
        });
        await sleepPauseable(820);
        if (!mountedRef.current || pausedRef.current) return;
        updateBlock(code.id, { status: 'done' });

        // 6. 音频
        const audio = addBlock({
          id: nextId(),
          type: 'audio',
          status: 'loading',
          title: DEMO_AUDIO.title,
          duration: DEMO_AUDIO.duration,
        });
        await sleepPauseable(620);
        if (!mountedRef.current || pausedRef.current) return;
        updateBlock(audio.id, { status: 'done' });

        // 7. 视频
        const video = addBlock({
          id: nextId(),
          type: 'video',
          status: 'loading',
          title: DEMO_VIDEO.title,
          duration: DEMO_VIDEO.duration,
        });
        await sleepPauseable(620);
        if (!mountedRef.current || pausedRef.current) return;
        updateBlock(video.id, { status: 'done' });

        update({ status: 'done' });
      } finally {
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        setPending(pendingRef.current);
      }
    })();
  };

  return (
    <div className="chat-shell relative overflow-hidden">
      {/* 科技感网格背景（线 + 交点圆点；鼠标触发范围内整条线变深） */}
      <BgGrid />
      {/* 对话呈现区：底部到输入区上方为止，不把输入区算进聊天区域。
          对话展开后的"中间列暂停"由 BgGrid 按位置判断（bg-grid-mode 事件） */}
      <div
        className={`absolute inset-x-0 bottom-20 top-0 transition-opacity duration-500 ease-smooth ${
          started ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ bottom: keyboardGap + 80 }}
      >
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto overscroll-contain px-5 pb-6 pt-6 sm:px-6 [overflow-anchor:none]"
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {/* 顶部预留条：导航显示时垫在导航下方，保证第一条消息完整可见；
                导航隐藏且停在顶部附近时塌缩为 0，第一条消息自然上移 20px，不留空白。
                不在顶部时保持 20px（不可见，避免中段阅读被上下移动打扰） */}
            <div
              aria-hidden="true"
              className="shrink-0 transition-[height] duration-300 ease-smooth"
              style={{ height: navHidden && nearTop ? 0 : 20 }}
            />
            {turns.map((turn, i) => (
              <div
                key={turn[0].id}
                ref={(node) => {
                  turnRefs.current[i] = node;
                }}
                className="flex flex-col gap-4"
              >
                {turn.map((m) => (
                  <MessageItem key={m.id} message={m} onBlockDone={onBlockDone} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 左侧快速定位条组 */}
      {started && turns.length >= 2 && (
        <TurnRail turns={turnSummaries} onSelect={jumpToTurn} />
      )}

      {!started ? (
        /* 初始态：时间轴预设问题轮播（每次 4 条自动向上滚动，hover 暂停，点击直接发送） */
        <div className="absolute inset-x-0 top-1/2 z-20 -translate-y-1/2 px-5 sm:px-6">
          <div className="relative mx-auto max-w-sm">
          {/* pl-[5px]：圆点左半（越出按钮左侧 4px）需要容器留出空间，否则被 overflow-hidden 裁掉。
             高度 5 行（4 行完整 + 上下各半行残影）；mask 上下 10% 渐隐，残影半透明可见，
             营造"内容正在流动"的过渡感 */}
          <div
            className="overflow-hidden pl-[5px]"
            style={{
              height: CAROUSEL_ROW_H * 5,
              maskImage: 'linear-gradient(transparent, black 10%, black 90%, transparent)',
              WebkitMaskImage: 'linear-gradient(transparent, black 10%, black 90%, transparent)',
            }}
          >
            <div ref={carouselListRef} className="flex flex-col will-change-transform">
              {/* 列表渲染前后多一条残影行；竖线在每条按钮内，随行移动（与时间轴原版一致） */}
              {CAROUSEL_ITEMS.map((q, i) => (
                <button
                  key={`${q}-${i}`}
                  type="button"
                  onClick={() => sendText(q)}
                  className="group relative flex items-center pl-8 text-left"
                  style={{ height: CAROUSEL_ROW_H }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-0 h-full w-px bg-black/[0.08] dark:bg-white/10"
                  />
                  <span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/20 bg-page transition-colors duration-200 group-hover:border-accent group-hover:bg-accent dark:border-white/30 dark:bg-[#0A0A0C]" />
                  <span className="flex items-center gap-1.5 text-[16px] text-ink-soft transition-transform duration-200 group-hover:translate-x-1.5 group-hover:text-ink">
                    {q}
                    {/* 对话图标：hover 才出现（淡入 + 右移） */}
                    <IconBubble className="h-3.5 w-3.5 -translate-x-1 text-ink-faint opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-ink" />
                  </span>
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>
      ) : (
        <form
          ref={formRef}
          onSubmit={handleSend}
          style={{ bottom: keyboardGap }}
          className="absolute inset-x-0 bottom-0 z-20 px-5 pb-5 sm:px-6"
        >
        {/* 进入对话后与聊天列等宽；鼠标在输入框内时暂停背景网格动画（bg-grid-pause 事件） */}
        <div
          className="relative mx-auto max-w-2xl"
          onMouseEnter={() =>
            window.dispatchEvent(new CustomEvent('bg-grid-pause', { detail: { add: true } }))
          }
          onMouseLeave={() =>
            window.dispatchEvent(new CustomEvent('bg-grid-pause', { detail: { add: false } }))
          }
        >
          {/* 快速跳到底部：输入框正上方水平居中；居中用 inset-x-0 mx-auto（不用 translateX，避免被 animate-fade-in-up 的 fill-mode:both 覆盖） */
          started && !atBottom && (
            <button
              type="button"
              onClick={scrollToBottom}
              aria-label="跳到底部"
              className="absolute inset-x-0 bottom-full z-10 mx-auto mb-2 flex h-9 w-9 animate-fade-in-up items-center justify-center rounded-full border border-black/[0.08] bg-white/95 text-ink shadow-apple backdrop-blur dark:border-white/10 dark:bg-card/95"
            >
              <IconArrowDown className="h-4 w-4" />
            </button>
          )}
          {/* 输入框 + 右侧按钮：独立相对容器——按钮垂直居中必须以输入框为准，
              不能被上方预设提问区撑高带偏（否则初始态发送按钮会偏移到上方） */}
          <div className="relative">
            <input
              ref={inputElRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你想了解的内容…"
              aria-label="输入你想了解的内容"
              className="w-full rounded-full border border-black/[0.08] bg-card py-3.5 pl-5 pr-14 text-[15px] text-ink shadow-apple-input outline-none transition-all duration-200 placeholder:text-ink-faint focus:shadow-apple dark:border-white/10"
            />
            {/* 生成中：发送按钮原位变为暂停按钮，无法连续发送；对话结束或暂停后恢复发送 */}
            {pending > 0 && !paused ? (
              <button
                type="button"
                onClick={handlePause}
                aria-label="暂停回复"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white shadow-apple transition-all duration-200 hover:bg-accent-hover active:scale-95"
              >
                <IconPause className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="发送"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white shadow-apple transition-all duration-200 hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-25"
              >
                <IconSend className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>
      )}
    </div>
  );
}
