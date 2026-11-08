import { useEffect, useMemo, useRef, useState } from 'react';

// 消息/块的唯一 id：UUID，避免 HMR / 刷新后自增计数器重置撞 id
const nextId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const STORAGE_KEY = 'newking_chat_messages';

// 从 localStorage 恢复历史对话；去掉只属于流式过程的 thinking 块
function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .map((m) =>
        m.role === 'user'
          ? m
          : { ...m, blocks: (m.blocks || []).filter((b) => b.type !== 'thinking') }
      )
      .filter((m) => m.role === 'user' || (m.blocks && m.blocks.length > 0));
  } catch {
    /* localStorage 不可用时静默失败 */
  }
  return [];
}

/**
 * 对话引擎：消息状态、SSE 流式解析、持久化、暂停/清空。
 * 与 UI 解耦，ChatDock（浮层）和后续任何对话容器都可以复用。
 */
export function useChat() {
  const [messages, setMessages] = useState(loadMessages);
  const [pending, setPending] = useState(0);
  const [paused, setPaused] = useState(false);

  const pendingRef = useRef(0);
  const pausedRef = useRef(false);
  const mountedRef = useRef(true);
  const activeControllerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeControllerRef.current?.abort();
    };
  }, []);

  // 持久化：只存已经完成的内容，避免刷新后恢复出半截回复
  useEffect(() => {
    const clean = messages
      .map((m) => {
        if (m.role === 'user') return m;
        return {
          ...m,
          blocks: (m.blocks || []).filter(
            (b) =>
              b.type !== 'thinking' &&
              !['loading', 'running', 'streaming'].includes(b.status)
          ),
        };
      })
      .filter((m) => m.role === 'user' || (m.blocks && m.blocks.length > 0));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {
      /* 隐私模式等不可写时静默失败 */
    }
  }, [messages]);

  // 一条用户消息 + 其后的回复 = 一轮
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

  const clear = () => {
    activeControllerRef.current?.abort();
    pendingRef.current = 0;
    pausedRef.current = false;
    setPending(0);
    setPaused(false);
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* 静默 */
    }
  };

  const pause = () => {
    if (pendingRef.current <= 0) return;
    activeControllerRef.current?.abort();
    pausedRef.current = true;
    setPaused(true);
    setMessages((prev) =>
      prev.map((m) => {
        const blocks = m.blocks || [];
        const inProgress = blocks.some((b) =>
          ['loading', 'running', 'streaming'].includes(b.status)
        );
        if (!inProgress) return m;
        return {
          ...m,
          blocks: blocks
            .filter((b) => b.status !== 'loading')
            .map((b) =>
              b.status === 'running'
                ? { ...b, status: 'paused' }
                : b.status === 'streaming'
                  ? { ...b, status: 'done' }
                  : b
            ),
        };
      })
    );
  };

  const startReply = (userText, historyTurns) => {
    const msgId = nextId();
    const thinkingId = nextId();
    const toolIds = [];
    let textBlockId = null;
    let thinkingDismissed = false;

    pendingRef.current += 1;
    setPending(pendingRef.current);

    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        role: 'assistant',
        blocks: [{ id: thinkingId, type: 'thinking', status: 'running' }],
      },
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
      const dismissThinking = () => {
        if (thinkingDismissed) return;
        thinkingDismissed = true;
        updateBlock(thinkingId, { status: 'done' });
      };

      switch (evt.type) {
        case 'thinking':
          if (evt.status === 'running') updateBlock(thinkingId, { status: 'running' });
          break;
        case 'tool':
          if (evt.status === 'running') {
            dismissThinking();
            const id = nextId();
            toolIds.push(id);
            addBlock({ id, type: 'tool', status: 'running', name: evt.name });
          } else {
            const id = toolIds.shift();
            if (id != null) {
              updateBlock(id, {
                status: 'done',
                ok: evt.ok !== false,
                result: evt.result,
                related: evt.related,
              });
            }
          }
          break;
        case 'text':
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
          addBlock({
            id: nextId(),
            type: 'video',
            status: 'done',
            title: evt.title,
            duration: evt.duration,
          });
          break;
        case 'done':
          dismissThinking();
          if (textBlockId != null) {
            updateBlock(textBlockId, { status: 'done' });
            textBlockId = null;
          }
          break;
        default:
          break;
      }
    };

    // 历史只带文字，工具/媒体块不进入上下文，控制 token
    const history = (historyTurns || []).flatMap((turn) => {
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
          addBlock({
            id: nextId(),
            type: 'text',
            status: 'done',
            content: '抱歉，回复出错了，请稍后再试。',
          });
        }
      } finally {
        if (mountedRef.current) updateBlock(thinkingId, { status: 'done' });
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        if (mountedRef.current) setPending(pendingRef.current);
      }
    })();
  };

  const send = (text) => {
    const query = (text || '').trim();
    if (!query) return;
    if (pendingRef.current > 0 && !pausedRef.current) return;

    pausedRef.current = false;
    setPaused(false);
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: query }]);
    startReply(query, turns);
  };

  return {
    messages,
    turns,
    pending,
    paused,
    send,
    pause,
    clear,
    hasMessages: messages.length > 0,
  };
}
