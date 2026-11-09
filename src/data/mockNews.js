// 新闻页示例数据（纯前端假数据，后续接自动抓取后再替换）
// 每条 = 一天的 AI 日报；items 为当天条目，可带配图。
const CURATED = [
  {
    id: '2026-11-09',
    date: '2026-11-09',
    title: 'Agent 工具链、长上下文与推理基础设施',
    summary: '从工具调用到推理部署，今天的更新集中在 Agent 运行链路上。',
    cover: 'https://picsum.photos/seed/ai-daily-1109/1200/675',
    items: [
      {
        id: 'openai-agent-tools',
        title: 'OpenAI 更新 Agent 工具调用能力',
        source: 'OpenAI',
        summary:
          '新的工具调用接口支持更长的调用链与并行执行，官方示例覆盖检索、代码执行与浏览器操作。',
        image: 'https://picsum.photos/seed/ai-news-openai/1200/675',
        url: 'https://openai.com/news/',
      },
      {
        id: 'anthropic-context',
        title: 'Anthropic 发布新的上下文管理方案',
        source: 'Anthropic',
        summary:
          '围绕长任务与跨会话记忆，给出了上下文压缩、检索与回放的组合方案。',
        url: 'https://www.anthropic.com/news',
      },
      {
        id: 'deepmind-world',
        title: 'DeepMind 公布世界模型新进展',
        source: 'Google DeepMind',
        summary:
          '展示了在交互式环境中的长程预测与规划能力，并讨论了和 Agent 训练的结合方式。',
        url: 'https://deepmind.google/discover/blog/',
      },
      {
        id: 'nvidia-inference',
        title: '新一代推理芯片与 Agent 部署',
        source: 'NVIDIA',
        summary:
          '针对长上下文与高并发工具调用场景，介绍了新的推理优化与部署方案。',
        url: 'https://blogs.nvidia.com/',
      },
    ],
  },
  {
    id: '2026-11-08',
    date: '2026-11-08',
    title: '评测、检索与多 Agent 编排',
    summary: '评测集、RAG 检索策略和多 Agent 编排各有新进展。',
    cover: 'https://picsum.photos/seed/ai-daily-1108/1200/675',
    items: [
      {
        id: 'huggingface-agents',
        title: 'Hugging Face 发布 Agent 评测集',
        source: 'Hugging Face',
        summary:
          '新增一组面向工具调用与多步任务的评测集，附带基线结果和可复现脚本。',
        image: 'https://picsum.photos/seed/ai-news-hf/1200/675',
        url: 'https://huggingface.co/blog',
      },
      {
        id: 'langchain-deepagents',
        title: 'LangChain 更新 DeepAgents 运行时',
        source: 'LangChain',
        summary:
          '围绕任务规划、子 Agent 派发和上下文隔离做了调整，补充了新的文档示例。',
        url: 'https://blog.langchain.dev/',
      },
      {
        id: 'arxiv-rag',
        title: '新的 RAG 检索策略论文',
        source: 'arXiv',
        summary:
          '对比了多路召回、阈值过滤与重排的组合，给出了不同数据规模下的取舍建议。',
        url: 'https://arxiv.org/',
      },
      {
        id: 'llamaindex-workflows',
        title: 'LlamaIndex 发布工作流编排更新',
        source: 'LlamaIndex',
        summary:
          '把检索、结构化抽取和 Agent 执行拆成可组合步骤，强调每一步的可测试性。',
        url: 'https://www.llamaindex.ai/blog',
      },
    ],
  },
  {
    id: '2026-11-07',
    date: '2026-11-07',
    title: '实时语音、模型开放与开源模型',
    summary: '实时交互和模型能力开放是今天的主线，开源模型也有更新。',
    cover: 'https://picsum.photos/seed/ai-daily-1107/1200/675',
    items: [
      {
        id: 'openai-realtime',
        title: 'OpenAI 更新实时语音接口',
        source: 'OpenAI',
        summary:
          '新的实时接口降低了语音对话延迟，并补充了打断、工具调用与多轮会话的示例。',
        image: 'https://picsum.photos/seed/ai-news-realtime/1200/675',
        url: 'https://openai.com/news/',
      },
      {
        id: 'google-gemini',
        title: 'Gemini 面向开发者开放新能力',
        source: 'Google',
        summary:
          '新增结构化输出与更长上下文的支持，同时更新了 SDK 和价格说明。',
        url: 'https://blog.google/technology/ai/',
      },
      {
        id: 'meta-llama',
        title: 'Llama 系列模型更新',
        source: 'Meta AI',
        summary:
          '模型在推理与代码任务上有所提升，并给出了新的量化与部署建议。',
        url: 'https://ai.meta.com/blog/',
      },
    ],
  },
  {
    id: '2026-11-06',
    date: '2026-11-06',
    title: 'Agent 框架与检索增强',
    summary: '围绕工具注册、执行沙箱与企业知识库的工程实践更新。',
    cover: 'https://picsum.photos/seed/ai-daily-1106/1200/675',
    items: [
      {
        id: 'mistral-agents',
        title: 'Mistral 发布 Agent 框架更新',
        source: 'Mistral',
        summary:
          '围绕工具注册、执行沙箱与可观测性做了补齐，更适合长期运行的任务。',
        image: 'https://picsum.photos/seed/ai-news-mistral/1200/675',
        url: 'https://mistral.ai/news/',
      },
      {
        id: 'cohere-rag',
        title: 'Cohere 更新检索增强方案',
        source: 'Cohere',
        summary:
          '新增混合检索与重排的组合配置，并给出了面向企业知识库的调参建议。',
        url: 'https://cohere.com/blog',
      },
      {
        id: 'stanford-eval',
        title: '新的 Agent 评测基准发布',
        source: 'Stanford',
        summary:
          '覆盖多步工具调用与长任务规划，公开了测试环境和基线结果。',
        url: 'https://ai.stanford.edu/blog/',
      },
    ],
  },
];

const POOL = [
  {
    title: 'Agent 评测与可观测性',
    summary: '围绕工具调用成功率、延迟与失败回退的评测实践。',
    source: 'LangChain',
    url: 'https://blog.langchain.dev/',
  },
  {
    title: '长上下文与检索策略',
    summary: '长上下文并不等于不用检索，关键还是召回质量与上下文编排。',
    source: 'Anthropic',
    url: 'https://www.anthropic.com/news',
  },
  {
    title: '多 Agent 协作与任务编排',
    summary: '派发、串行与群聊几种模式在成本和可控性上的差异。',
    source: 'Google Research',
    url: 'https://research.google/blog/',
  },
  {
    title: '开源模型与推理优化',
    summary: '量化、批处理与 KV cache 的取舍，以及面向 Agent 的部署建议。',
    source: 'Meta AI',
    url: 'https://ai.meta.com/blog/',
  },
  {
    title: '工具调用与沙箱执行',
    summary: '如何隔离不可信代码，并限制失控的工具调用链。',
    source: 'OpenAI',
    url: 'https://openai.com/news/',
  },
  {
    title: 'RAG 的召回与重排',
    summary: '多路召回、阈值过滤和重排的组合，比单纯调 top-k 更重要。',
    source: 'LlamaIndex',
    url: 'https://www.llamaindex.ai/blog',
  },
  {
    title: '实时语音与多模态交互',
    summary: '低延迟语音对话、打断处理和工具调用的工程细节。',
    source: 'Google DeepMind',
    url: 'https://deepmind.google/discover/blog/',
  },
  {
    title: '企业知识库与 Agent 落地',
    summary: '权限、增量索引和答案可追溯性，是企业场景绕不开的三件事。',
    source: 'Cohere',
    url: 'https://cohere.com/blog',
  },
  {
    title: '结构化输出与 Prompt 工程',
    summary: '用 schema 约束输出，减少解析失败和后处理成本。',
    source: 'Hugging Face',
    url: 'https://huggingface.co/blog',
  },
  {
    title: 'Agent 的记忆与上下文压缩',
    summary: '会话记忆、结构化文档和跨会话检索的组合方式。',
    source: 'LangChain',
    url: 'https://blog.langchain.dev/',
  },
  {
    title: '推理芯片与推理成本',
    summary: '长上下文和高并发场景下，推理成本正在成为新的瓶颈。',
    source: 'NVIDIA',
    url: 'https://blogs.nvidia.com/',
  },
  {
    title: 'SDD 与 AI 辅助开发流程',
    summary: '先把 spec 写清楚，再让模型围绕它实现和验证。',
    source: 'arXiv',
    url: 'https://arxiv.org/',
  },
];

function buildDigest(date, index) {
  const items = [0, 1, 2].map((offset) => {
    const entry = POOL[(index + offset) % POOL.length];
    return {
      id: `${date}-${offset}`,
      title: entry.title,
      source: entry.source,
      summary: entry.summary,
      url: entry.url,
      image:
        offset === 0
          ? `https://picsum.photos/seed/news-item-${date}/1200/675`
          : undefined,
    };
  });

  return {
    id: date,
    date,
    title: items[0].title,
    summary: '今天整理的几条 AI 相关更新。',
    cover: `https://picsum.photos/seed/news-cover-${date}/1200/675`,
    items,
  };
}

function buildArchive() {
  const out = [];
  const start = new Date(Date.UTC(2026, 8, 1)); // 2026-09-01
  const end = new Date(Date.UTC(2026, 10, 5)); // 2026-11-05
  let index = 0;
  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
    out.push(buildDigest(d.toISOString().slice(0, 10), index++));
  }
  return out;
}

export const MOCK_NEWS = [...CURATED, ...buildArchive()].sort((a, b) =>
  String(b.date).localeCompare(String(a.date))
);
