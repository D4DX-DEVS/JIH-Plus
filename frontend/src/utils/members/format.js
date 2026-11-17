/** Small non-component helpers shared by the members pages. */

export const cx = (...classes) => classes.filter(Boolean).join(' ')

/** Display labels for statuses shared by applications and access links. */
export const STATUS_LABEL = {
  submitted: 'Submitted',
  in_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
  hold: 'On hold',
  active: 'Active',
  used: 'Used',
  blocked: 'Blocked',
  expired: 'Expired',
  inactive: 'Inactive'
}

/** Rukn = royal, Karkoon = gold, everywhere in the portal. */
export const TYPE_TONE = { rukn: 'royal', karkoon: 'gold' }

/** "3 days ago" style label for recent timestamps; falls back to a date. */
export function timeAgo(value) {
  if (!value) return ''
  const date = new Date(value)
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (Number.isNaN(seconds)) return ''
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

/** Short date: "12 Nov 2026". */
export function shortDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
