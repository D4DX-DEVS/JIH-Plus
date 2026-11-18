// Field types that only lay out a form (headings, notes, raw HTML). They hold
// no answer, so the renderer never validates them and submission views,
// exports and conditional-logic triggers skip them.
export const LAYOUT_FIELD_TYPES = ['title', 'subtitle', 'note', 'html'];

export const isLayoutField = (field) => LAYOUT_FIELD_TYPES.includes(field?.type);

// The value an "accept" (agree to terms) field stores once ticked. A plain
// string, so every submission view and export shows it without special-casing.
export const ACCEPTED_VALUE = 'Yes';
