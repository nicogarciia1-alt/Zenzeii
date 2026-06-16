export const CATEGORY_COLORS = {
  kanji: {
    bg: 'bg-blue-400 dark:bg-blue-950/70',
    badge: 'bg-blue-700 text-white border-blue-600 dark:bg-blue-800 dark:text-blue-100 dark:border-blue-700',
    label: '漢字',
  },
  verb: {
    bg: 'bg-yellow-400 dark:bg-yellow-900/60',
    badge: 'bg-yellow-600 text-white border-yellow-500 dark:bg-yellow-700 dark:text-yellow-100 dark:border-yellow-600',
    label: 'Verb',
  },
  noun: {
    bg: 'bg-amber-500 dark:bg-amber-950/70',
    badge: 'bg-amber-800 text-white border-amber-700 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-800',
    label: 'Noun',
  },
  adjective: {
    bg: 'bg-violet-400 dark:bg-violet-950/70',
    badge: 'bg-violet-700 text-white border-violet-600 dark:bg-violet-800 dark:text-violet-100 dark:border-violet-700',
    label: 'Adjective',
  },
  expression: {
    bg: 'bg-rose-400 dark:bg-rose-950/70',
    badge: 'bg-rose-700 text-white border-rose-600 dark:bg-rose-800 dark:text-rose-100 dark:border-rose-700',
    label: 'Expression',
  },
  particle: {
    bg: 'bg-teal-400 dark:bg-teal-950/70',
    badge: 'bg-teal-700 text-white border-teal-600 dark:bg-teal-800 dark:text-teal-100 dark:border-teal-700',
    label: 'Particle',
  },
  other: {
    bg: 'bg-slate-300 dark:bg-slate-700/60',
    badge: 'bg-slate-600 text-white border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600',
    label: 'Other',
  },
}

export function getWordCategory(item) {
  if (item.type === 'kanji') return 'kanji'
  return item.category || 'other'
}

export function posToCategory(pos) {
  if (!pos) return 'other'
  if (pos === '動詞') return 'verb'
  if (pos === '名詞') return 'noun'
  if (pos === '形容詞' || pos === '形状詞') return 'adjective'
  if (pos === '助詞') return 'particle'
  if (pos === '副詞' || pos === '感動詞' || pos === '接続詞') return 'expression'
  return 'other'
}
