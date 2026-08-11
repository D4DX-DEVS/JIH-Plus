// Shared visual language for all expansion-portal sidebars
// (unit / area / district / admin). Centralised so the four
// role-specific sidebar components stay visually consistent.

// Malayalam labels + accent colour per dynamic report type.
export const DYNAMIC_REPORT_META = {
  monthly: { label: 'പ്രതിമാസം', color: 'sky' },
  quarterly: { label: 'ത്രൈമാസം', color: 'violet' },
  yearly: { label: 'വാർഷികം', color: 'emerald' },
  special: { label: 'സ്പെഷ്യൽ', color: 'amber' },
};

// Tailwind class groups per accent colour, tuned for the dark sidebar background.
// `base` is the always-on tinted button (so Monthly/Quarterly/Yearly/Special
// read as distinct colours at rest, not just their icons); `active` is the
// stronger variant for whichever report type is currently selected.
export const REPORT_TYPE_STYLES = {
  sky: {
    icon: 'text-sky-200',
    base: 'bg-sky-500/15 border border-sky-400/20 text-sky-50 hover:bg-sky-500/25',
    active: 'bg-sky-500/35 border border-sky-400/60 text-white shadow-sm',
    badge: 'bg-sky-400/25 text-sky-100',
  },
  violet: {
    icon: 'text-violet-200',
    base: 'bg-violet-500/15 border border-violet-400/20 text-violet-50 hover:bg-violet-500/25',
    active: 'bg-violet-500/35 border border-violet-400/60 text-white shadow-sm',
    badge: 'bg-violet-400/25 text-violet-100',
  },
  emerald: {
    icon: 'text-emerald-200',
    base: 'bg-emerald-500/15 border border-emerald-400/20 text-emerald-50 hover:bg-emerald-500/25',
    active: 'bg-emerald-500/35 border border-emerald-400/60 text-white shadow-sm',
    badge: 'bg-emerald-400/25 text-emerald-100',
  },
  amber: {
    icon: 'text-amber-200',
    base: 'bg-amber-500/15 border border-amber-400/20 text-amber-50 hover:bg-amber-500/25',
    active: 'bg-amber-500/35 border border-amber-400/60 text-white shadow-sm',
    badge: 'bg-amber-400/25 text-amber-100',
  },
};

export const SIDEBAR_THEME = {
  bg: 'bg-gradient-to-b from-[#002349] to-[#00142e]',
  border: 'border-white/10',
  navDefault: 'text-white/70 hover:bg-white/10 hover:text-white',
  navActive: 'bg-gradient-to-r from-[#957C3D] to-[#b3924a] text-white shadow-lg shadow-black/20',
  iconDefault: 'text-white/50',
  iconActive: 'text-white',
  groupActive: 'bg-white/10 border border-white/10 text-white',
  logout: 'bg-red-500/10 border border-red-400/30 text-red-100 hover:bg-red-500/20 hover:text-white',
  infoCard: 'bg-white/5 border border-white/10',
  infoLabel: 'text-white/40',
  infoMuted: 'text-white/70',
  infoPrimary: 'text-white',
  toggleBtn: 'bg-white border border-gray-200 text-gray-500 hover:text-[#002349] shadow-md hover:shadow-lg',
};
