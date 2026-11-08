import { groupByYear } from '../data/mockData';

const dateKey = (item) => String(item?.date || '');
const orderKey = (item) => {
  const n = Number(item?.seriesOrder);
  return Number.isFinite(n) ? n : Infinity;
};

/**
 * 笔记排序：系列笔记按 seriesOrder 正序排在最前，其余按日期倒序。
 * 首页「最近更新」仍用日期排序，不走这里。
 */
export function sortNotes(notes = []) {
  return [...notes].sort((a, b) => {
    const aSeries = Boolean(a.series);
    const bSeries = Boolean(b.series);
    if (aSeries !== bSeries) return aSeries ? -1 : 1;
    if (aSeries) {
      const ao = orderKey(a);
      const bo = orderKey(b);
      if (ao !== bo) return ao - bo;
    }
    return dateKey(b).localeCompare(dateKey(a));
  });
}

/**
 * 笔记页分组：系列优先（组内按 seriesOrder），其余按年份。
 */
export function groupNotes(notes = []) {
  const seriesMap = new Map();
  const rest = [];

  for (const note of notes) {
    if (note.series) {
      if (!seriesMap.has(note.series)) seriesMap.set(note.series, []);
      seriesMap.get(note.series).push(note);
    } else {
      rest.push(note);
    }
  }

  const series = [...seriesMap.entries()]
    .map(([name, items]) => ({
      key: `series:${name}`,
      name,
      items: [...items].sort((a, b) => orderKey(a) - orderKey(b) || dateKey(b).localeCompare(dateKey(a))),
    }))
    .sort((a, b) => orderKey(a.items[0]) - orderKey(b.items[0]) || a.name.localeCompare(b.name));

  return { series, years: groupByYear(rest) };
}
