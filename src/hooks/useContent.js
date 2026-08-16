import { useEffect, useState } from 'react';
import { fetchContent } from '../api';

// 全站内容 hook：从后端拉一次数据，返回 { data, loading, error }
// 用 localStorage 缓存，刷新不重复请求（内容变了后端会返回新数据，缓存自动失效靠日期字段）
export function useContent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchContent()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { data, loading, error };
}
