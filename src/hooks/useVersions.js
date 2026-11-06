import { useEffect, useMemo, useState } from 'react';

// 历史版本清单：静态 public/versions/manifest.json，一次拉取全局缓存。
// 新增版本时只需要加图片 + 更新 manifest，不依赖后端。
let _versionsCache = null;

export function fetchVersions() {
  if (_versionsCache) return _versionsCache;
  _versionsCache = fetch('/versions/manifest.json', { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`版本清单加载失败: ${res.status}`);
      return res.json();
    })
    .catch((err) => {
      _versionsCache = null;
      throw err;
    });
  return _versionsCache;
}

export function useVersions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchVersions()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // 新版在前；manifest 已排序，这里再兜底一次
  const versions = useMemo(
    () =>
      [...(data?.versions ?? [])].sort((a, b) =>
        String(b.date || '').localeCompare(String(a.date || ''))
      ),
    [data]
  );

  return { versions, loading, error };
}
