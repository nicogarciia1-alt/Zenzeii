export const CATEGORY_COLORS = {
  kanji: {
    strip: 'bg-sky-600',
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    badge: 'bg-sky-200 text-sky-900 border-sky-300 dark:bg-sky-900/50 dark:text-sky-100 dark:border-sky-700',
    label: '漢字',
  },
  verb: {
    strip: 'bg-emerald-600',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    badge: 'bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-100 dark:border-emerald-700',
    label: 'Verb',
  },
  noun: {
    strip: 'bg-amber-600',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    badge: 'bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-700',
    label: 'Noun',
  },
  adjective: {
    strip: 'bg-violet-600',
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    badge: 'bg-violet-200 text-violet-900 border-violet-300 dark:bg-violet-900/50 dark:text-violet-100 dark:border-violet-700',
    label: 'Adjective',
  },
  expression: {
    strip: 'bg-rose-600',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    badge: 'bg-rose-200 text-rose-900 border-rose-300 dark:bg-rose-900/50 dark:text-rose-100 dark:border-rose-700',
    label: 'Expression',
  },
  particle: {
    strip: 'bg-teal-600',
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    badge: 'bg-teal-200 text-teal-900 border-teal-300 dark:bg-teal-900/50 dark:text-teal-100 dark:border-teal-700',
    label: 'Particle',
  },
  other: {
    strip: 'bg-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-800/30',
    badge: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-600',
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
