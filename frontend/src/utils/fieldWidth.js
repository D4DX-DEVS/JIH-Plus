/**
 * Field layout width — lets the report builder place several small fields on
 * one line instead of one per line. The author picks how many fields share a
 * line ("2 per line"), and every field on that line gets the same setting.
 *
 * Widths only apply from the `sm` breakpoint up; on phones every field stays
 * full width so long Malayalam labels never get squeezed into a narrow column.
 */

export const FIELD_WIDTHS = [
  { value: 'full', perLine: 1, label: '1 per line (full width)' },
  { value: 'half', perLine: 2, label: '2 per line' },
  { value: 'third', perLine: 3, label: '3 per line' },
  { value: 'quarter', perLine: 4, label: '4 per line' },
];

// Static class strings — Tailwind only keeps classes it can see in the source.
const WIDTH_CLASSES = {
  'full': 'col-span-12',
  'half': 'col-span-12 sm:col-span-6',
  'third': 'col-span-12 sm:col-span-4',
  'quarter': 'col-span-12 sm:col-span-3',
  // Legacy widths from the first version of this feature. No longer offered in
  // the picker, but still rendered so older reports keep their layout.
  'three-quarters': 'col-span-12 sm:col-span-9',
  'two-thirds': 'col-span-12 sm:col-span-8',
};

// Section titles and raw HTML always own their line.
const ALWAYS_FULL_TYPES = new Set(['title', 'html']);

export function fieldWidth(field) {
  if (!field || ALWAYS_FULL_TYPES.has(field.type)) return 'full';
  return WIDTH_CLASSES[field.width] ? field.width : 'full';
}

export function fieldWidthClass(field) {
  return WIDTH_CLASSES[fieldWidth(field)];
}
