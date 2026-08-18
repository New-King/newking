import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IconArrowDown, IconBubble, IconPause, IconSend } from '../icons';
import MessageItem from './MessageItem';
import TurnRail from './TurnRail';
import BgGrid from './BgGrid';

// 消息/块的唯一 id：用 UUID，天然不重复（自增计数器在刷新/HMR 后会重置撞 id，故不用）
const nextId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

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

const STORAGE_KEY = 'newking_chat_messages';

// 从 localStorage 恢复历史对话（用户清缓存才丢失）。
// id 是 UUID，天然唯一，恢复后直接用，无需处理计数器。
function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    }
  } catch {
    /* localStorage 不可用时静默失败 */
  }
  return [];
}

export default function AgentChat() {
  const [messages, setMessages] = useState(loadMessages);
  const [started, setStarted] = useState(() => loadMessages().length > 0);
  const [pending, setPending] = useState(0);
  const [paused, setPaused] = useState(false);
  const [input, setInput] = useState('');
  const [atBottom, setAtBottom] = useState(true);
  const [navHidden, setNavHidden] = useState(false);
  const [nearTop, setNearTop] = useState(true);
  const [keyboardGap, setKeyboardGap] = useState(0); // 移动端键盘遮挡高度（输入框聚焦时上移）

  /* 预设问题轮播：无限滚动物理模型。
     - 位置 carouselPosRef 无界（可无限增/减），显示时对周期取模（10 条 = 420px），
       上下永无尽头（拖拽/滚轮/惯性全部无边界）
     - 自动：每 3.5s 平滑滚动一条，取模后自然无限循环
     - 手动：拖拽/滚轮自由滚动，松手按速度惯性滑动（阻尼衰减） */
  const CAROUSEL_ROW_H = 42;
  const CAROUSEL_VIEW_H = CAROUSEL_ROW_H * 5; // 可视 5 行（4 完整 + 上下残影）
  const CAROUSEL_MAX = CAROUSEL_ROW_H * 10; // 内容周期（10 条）
  // 前后各多一条：顶部残影 = 最后一条，底部残影 = 第一条
  const CAROUSEL_ITEMS = [
    SUGGESTIONS[SUGGESTIONS.length - 1],
    ...SUGGESTIONS,
    ...SUGGESTIONS,
    SUGGESTIONS[0],
  ];

  const carouselListRef = useRef(null);
  const carouselPosRef = useRef(0); // 无界位置（translateY 正值）
  const carouselVelRef = useRef(0); // 惯性速度
  const carouselRafRef = useRef(null);
  const carouselDraggingRef = useRef(false);
  const carouselAutoPausedRef = useRef(false);
  const carouselAutoTimerRef = useRef(null);
  const carouselDragRef = useRef({ y: 0, pos: 0, lastY: 0, lastT: 0 });

  // 显示位置 = 无界位置对周期取模（保证非负），实现无限循环
  const carouselApply = () => {
    const el = carouselListRef.current;
    if (!el) return;
    const mod = ((carouselPosRef.current % CAROUSEL_MAX) + CAROUSEL_MAX) % CAROUSEL_MAX;
    el.style.transform = `translateY(${-mod}px)`;
  };

  // 惯性滑动：速度每帧衰减 8%（阻尼），无边界（无限滚动）
  const carouselRunInertia = () => {
    cancelAnimationFrame(carouselRafRef.current);
    const step = () => {
      const v = carouselVelRef.current;
      if (Math.abs(v) < 0.1) return;
      carouselPosRef.current += v;
      carouselVelRef.current *= 0.92;
      carouselApply();
      carouselRafRef.current = requestAnimationFrame(step);
    };
    carouselRafRef.current = requestAnimationFrame(step);
  };

  // 平滑滚动到目标位置（自动播放用，ease-out）
  const carouselAnimateTo = (target, duration) => {
    cancelAnimationFrame(carouselRafRef.current);
    const from = carouselPosRef.current;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      carouselPosRef.current = from + (target - from) * (1 - Math.pow(1 - t, 3));
      carouselApply();
      if (t < 1) carouselRafRef.current = requestAnimationFrame(step);
    };
    carouselRafRef.current = requestAnimationFrame(step);
  };

  const carouselPauseAuto = () => {
    carouselAutoPausedRef.current = true;
  };
  const carouselResumeAuto = (delay = 3000) => {
    clearTimeout(carouselAutoTimerRef.current);
    carouselAutoTimerRef.current = setTimeout(() => {
      // 用户又按住了就跳过（拖拽优先）
      if (carouselDraggingRef.current) {
        carouselResumeAuto(3000);
        return;
      }
      // 先吸附到最近的整步点（取模后），保证自动步进节奏稳定
      const mod = ((carouselPosRef.current % CAROUSEL_MAX) + CAROUSEL_MAX) % CAROUSEL_MAX;
      const snapMod = Math.round(mod / CAROUSEL_ROW_H) * CAROUSEL_ROW_H;
      if (snapMod !== mod) carouselAnimateTo(carouselPosRef.current + (snapMod - mod), 250);
      carouselAutoPausedRef.current = false;
    }, delay);
  };

  // 自动播放：每 3.5s 滚一条；拖拽中/暂停时不推进；位置无界，显示取模无限循环
  useEffect(() => {
    const id = setInterval(() => {
      if (carouselAutoPausedRef.current || carouselDraggingRef.current) return;
      carouselAnimateTo(carouselPosRef.current + CAROUSEL_ROW_H, 900);
    }, 3500);
    return () => {
      clearInterval(id);
      clearTimeout(carouselAutoTimerRef.current);
      cancelAnimationFrame(carouselRafRef.current);
    };
  }, []);

  // 拖拽：按下记录起点并停掉一切动画；移动跟随（边界外弹性压缩），
  // 且每次 move 先取消进行中的动画（防止自动轮播/吸附动画与手指竞争拉扯）
  const onCarouselPointerDown = (e) => {
    cancelAnimationFrame(carouselRafRef.current);
    carouselPauseAuto();
    carouselDraggingRef.current = true;
    carouselDragRef.current = {
      y: e.clientY,
      pos: carouselPosRef.current,
      lastY: e.clientY,
      lastT: performance.now(),
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onCarouselPointerMove = (e) => {
    if (!carouselDraggingRef.current) return;
    cancelAnimationFrame(carouselRafRef.current);
    const d = carouselDragRef.current;
    const now = performance.now();
    if (now - d.lastT > 30) {
      // 速度采样：向上拖 = 内容上移 = 看后面的问题（与自动轮播同向）
      carouselVelRef.current = ((d.lastY - e.clientY) / (now - d.lastT)) * 16.7 * 0.55;
      d.lastY = e.clientY;
      d.lastT = now;
    }
    // 滚动语义：手指向上滑 → 内容向上滚（pos 增大）→ 看后面的问题
    let target = d.pos - (e.clientY - d.y);
    // 无边界：无限滚动，位置直接跟随
    carouselPosRef.current = target;
    carouselApply();
  };
  const onCarouselPointerUp = (e) => {
    if (!carouselDraggingRef.current) return;
    carouselDraggingRef.current = false;
    if (Math.abs(carouselVelRef.current) > 0.5) {
      carouselRunInertia();
    }
    carouselResumeAuto();
    // 修复：pointer capture 会把 click 重定向到容器，按钮 onClick 被吞。
    // 若这次按下/松开几乎没有位移（= 点击而非拖拽），就手动补发一次 click，
    // 目标是松手位置正下方最靠近的元素（预设问题按钮）。
    const d = carouselDragRef.current;
    if (Math.abs(e.clientY - d.y) < 4) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const btn = el?.closest?.('button');
      if (btn) btn.click();
    }
  };
  // 滚轮：原生监听（React onWheel 是 passive，无法 preventDefault 阻止页面滚动）。
  // 滚动距离直接映射列表位移 + 速度转惯性，边界弹性
  useEffect(() => {
    const el = carouselListRef.current?.parentElement;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      cancelAnimationFrame(carouselRafRef.current);
      carouselPauseAuto();
      carouselPosRef.current += e.deltaY; // 无边界：无限滚动
      carouselVelRef.current = e.deltaY * 0.9; // 滚轮速度 → 松手惯性
      carouselApply();
      carouselResumeAuto();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

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
  const activeControllerRef = useRef(null); // 当前 SSE 请求的 AbortController（暂停时中止流）

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* 对话持久化：messages 变化时存 localStorage，刷新后恢复。
     只存已完成的消息（不含进行中的 loading/streaming 块，避免恢复出半截内容）。 */
  useEffect(() => {
    const clean = messages
      .map((m) => {
        if (m.role === 'user') return m;
        return {
          ...m,
          blocks: (m.blocks || []).filter(
            (b) => !['loading', 'running', 'streaming'].includes(b.status)
          ),
        };
      })
      .filter((m) => {
        if (m.role === 'user') return true;
        return m.blocks && m.blocks.length > 0;
      });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {
      /* 隐私模式等不可写时静默失败 */
    }
  }, [messages]);

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
    // 顶部偏移要避开导航栏（约 56px）+ 顶部预留条，让定位的内容完整可见
    const top =
      node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 72;
    el.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  const onBlockDone = (blockId) => doneResolversRef.current[blockId]?.();

  /* 停止当前回复：中止 SSE 流，清理未完成块（真流式下无法续跑，停止=中止） */
  const handlePause = () => {
    if (pending <= 0) return;
    activeControllerRef.current?.abort();
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
          blocks: blocks
            .filter((b) => b.status !== 'loading')
            .map((b) => (b.status === 'running' ? { ...b, status: 'done' } : b)),
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

  /* ---- 真实对话：SSE 流式，接收后端事件并更新消息块 ----
     事件类型（后端 chat.py 定义）：
       thinking / tool / text(delta) / text_done / image / link / video / done   */
  const startReply = (userText) => {
    const msgId = nextId();
    const thinkingId = nextId();
    const toolIds = []; // 工具卡片的 id 列表（running 记下，done 按序更新）
    let textBlockId = null; // 流式文字的块 id（首个 delta 创建，后续追加内容）
    const thinkingDismissedRef = { current: false }; // 思考是否已结束（首个实质内容出现时）
    pendingRef.current += 1;
    setPending(pendingRef.current);

    // 预置一个 thinking 块（收到后端事件前先显示"正在思考"）
    setMessages((prev) => [
      ...prev,
      { id: msgId, role: 'assistant', blocks: [{ id: thinkingId, type: 'thinking', status: 'running' }] },
    ]);

    const updateBlock = (blockId, patch) =>
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, blocks: m.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)) }
            : m
        )
      );

    const addBlock = (block) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, blocks: [...m.blocks, block] } : m))
      );

    const handleEvent = (evt) => {
      // 一旦出现实质内容（工具开始/首个文本），先让"正在思考"消失
      const dismissThinking = () => {
        if (thinkingDismissedRef.current) return;
        thinkingDismissedRef.current = true;
        updateBlock(thinkingId, { status: 'done' });
      };
      switch (evt.type) {
        case 'thinking':
          if (evt.status === 'running') {
            updateBlock(thinkingId, { status: 'running' });
          }
          break;
        case 'tool':
          if (evt.status === 'running') {
            dismissThinking();
            const id = nextId();
            toolIds.push(id);
            addBlock({ id, type: 'tool', status: 'running', name: evt.name });
          } else {
            const id = toolIds.shift();
            if (id != null)
              updateBlock(id, { status: 'done', ok: evt.ok !== false, result: evt.result, related: evt.related });
          }
          break;
        case 'text':
          // 流式文字：首个 delta 创建块，后续追加内容（同一个块不断变长 → 真流式）
          dismissThinking();
          if (textBlockId == null) {
            textBlockId = nextId();
            addBlock({ id: textBlockId, type: 'text', status: 'streaming', content: evt.delta });
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      blocks: m.blocks.map((b) =>
                        b.id === textBlockId
                          ? { ...b, content: (b.content || '') + evt.delta }
                          : b
                      ),
                    }
                  : m
              )
            );
          }
          break;
        case 'text_done':
          // 流式结束：把 text 块标记为完成（不再更新）
          if (textBlockId != null) {
            updateBlock(textBlockId, { status: 'done' });
            textBlockId = null;
          }
          break;
        case 'image':
          addBlock({ id: nextId(), type: 'image', status: 'done', src: evt.src, caption: evt.caption });
          break;
        case 'link':
          addBlock({ id: nextId(), type: 'link', status: 'done', url: evt.url, title: evt.title });
          break;
        case 'video':
          addBlock({ id: nextId(), type: 'video', status: 'done', title: evt.title, duration: evt.duration });
          break;
        case 'done':
          updateBlock(thinkingId, { status: 'done' });
          break;
        default:
          break;
      }
    };

    // 把历史对话整理成 [{role, content}] 传给后端，保持上下文连续
    const history = turns
      .flatMap((turn) => {
        const userMsg = turn[0];
        const assistant = turn.find((m) => m.role === 'assistant');
        const text = assistant?.blocks?.find((b) => b.type === 'text')?.content ?? '';
        return [
          { role: 'user', content: userMsg.text },
          ...(text ? [{ role: 'assistant', content: text }] : []),
        ];
      });

    const controller = new AbortController();
    activeControllerRef.current = controller;

    (async () => {
      try {
        const res = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: userText, history }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`对话接口失败: ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          // SSE 事件：data: <json>，空行分隔
          let sep;
          while ((sep = buf.indexOf('\n\n')) !== -1) {
            const raw = buf.slice(0, sep);
            buf = buf.slice(sep + 2);
            if (!raw.startsWith('data:')) continue;
            let evt;
            try {
              evt = JSON.parse(raw.slice(5).trim());
            } catch {
              continue;
            }
            if (!mountedRef.current) return;
            handleEvent(evt);
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError' && mountedRef.current) {
          addBlock({ id: nextId(), type: 'text', status: 'done', content: '抱歉，回复出错了，请稍后再试。' });
        }
      } finally {
        if (mountedRef.current) updateBlock(thinkingId, { status: 'done' });
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
        <div className="absolute inset-x-0 top-[45%] z-20 -translate-y-1/2 px-5 sm:px-6">
          <div className="relative mx-auto max-w-sm">
          {/* pl-[5px]：圆点左半（越出按钮左侧 4px）需要容器留出空间，否则被 overflow-hidden 裁掉。
             高度 5 行（4 行完整 + 上下各半行残影）；mask 上下 10% 渐隐，残影半透明可见，
             营造"内容正在流动"的过渡感 */}
          <div
            className="overflow-hidden pl-[5px] touch-none cursor-grab active:cursor-grabbing"
            style={{
              height: CAROUSEL_VIEW_H,
              maskImage: 'linear-gradient(transparent, black 25%, black 75%, transparent)',
              WebkitMaskImage: 'linear-gradient(transparent, black 25%, black 75%, transparent)',
            }}
            onPointerDown={onCarouselPointerDown}
            onPointerMove={onCarouselPointerMove}
            onPointerUp={onCarouselPointerUp}
            onPointerCancel={onCarouselPointerUp}
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
