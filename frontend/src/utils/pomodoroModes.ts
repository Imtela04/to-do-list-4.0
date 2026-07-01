export const MODES = {
  work:  { label: 'Focus',       duration: 25 * 60, color: 'var(--accent-primary)'   },
  short: { label: 'Short Break', duration: 5 * 60,  color: 'var(--accent-tertiary)'  },
  long:  { label: 'Long Break',  duration: 15 * 60, color: 'var(--accent-blue)'      },
} as const;
export const SESSION_CYCLE = ['work','short','work','short','work','short','work','long'] as const;