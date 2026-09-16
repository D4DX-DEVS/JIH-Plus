import React from 'react';

// Keep native number constraints and existing change handlers, while requesting
// the appropriate phone keypad and rejecting non-numeric typed/pasted text.
export default function NumericInput({ type = 'number', step, inputMode, onKeyDown, onPaste, ...props }) {
  const numeric = type === 'number';
  const decimal = step === 'any' || (step != null && Number(step) % 1 !== 0);
  return <input
    {...props}
    type={type}
    step={step}
    inputMode={inputMode ?? (numeric ? (decimal ? 'decimal' : 'numeric') : type === 'tel' ? 'tel' : undefined)}
    onKeyDown={(event) => {
      onKeyDown?.(event);
      if (numeric && !event.ctrlKey && !event.metaKey && !event.altKey && ['e', 'E', '+'].includes(event.key)) event.preventDefault();
    }}
    onPaste={(event) => {
      onPaste?.(event);
      if (numeric && !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(event.clipboardData.getData('text').trim())) event.preventDefault();
    }}
  />;
}
