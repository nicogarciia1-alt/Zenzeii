export const CATEGORY_COLORS = {
  kanji: {
    strip: 'bg-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    badge: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
    label: '漢字',
  },
  verb: {
    strip: 'bg-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    label: 'Verb',
  },
  noun: {
    strip: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    label: 'Noun',
  },
  adjective: {
    strip: 'bg-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    badge: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
    label: 'Adjective',
  },
  expression: {
    strip: 'bg-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    badge: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
    label: 'Expression',
  },
  other: {
    strip: 'bg-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-900/20',
    badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700',
    label: 'Other',
  },
}

export function getWordCategory(item) {
  if (item.type === 'kanji') return 'kanji'
  return item.category || 'other'
}
