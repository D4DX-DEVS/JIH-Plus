// Validation utility for form inputs
export const validateNumericInput = (value) => {
  // Remove any non-numeric characters including +, -, ., e, E
  const cleaned = String(value || '').replace(/[^0-9]/g, '');
  return cleaned;
};

export const handleNumericInput = (value, setValue) => {
  const cleaned = validateNumericInput(value);
  setValue(cleaned);
};

export const validateRequired = (value) => {
  return value !== null && value !== undefined && value !== '';
};

export const validateMinValue = (value, min = 0) => {
  const numValue = parseInt(value) || 0;
  return numValue >= min;
};

export const validateMaxValue = (value, max = 999999) => {
  const numValue = parseInt(value) || 0;
  return numValue <= max;
};

export const validateRange = (value, min = 0, max = 999999) => {
  const numValue = parseInt(value) || 0;
  return numValue >= min && numValue <= max;
};

// Input handler that prevents non-numeric input
export const createNumericInputHandler = (setValue) => {
  return (e) => {
    const value = e.target.value;
    const cleaned = validateNumericInput(value);
    setValue(cleaned);
  };
};

// Input handler for onKeyDown to prevent non-numeric keys
export const handleNumericKeyDown = (e) => {
  // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
  const allowedKeys = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
  ];
  
  // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
  if (e.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) {
    return;
  }
  
  // Allow: numbers 0-9
  if (e.key >= '0' && e.key <= '9') {
    return;
  }
  
  // Block everything else
  if (!allowedKeys.includes(e.key)) {
    e.preventDefault();
  }
};

// Input handler for onPaste to clean pasted content
export const handleNumericPaste = (e, setValue) => {
  e.preventDefault();
  const pastedText = e.clipboardData.getData('text');
  const cleaned = validateNumericInput(pastedText);
  setValue(cleaned);
};

// Validation messages
export const validationMessages = {
  required: 'This field is required',
  numeric: 'Only numbers are allowed',
  minValue: (min) => `Value must be at least ${min}`,
  maxValue: (max) => `Value must not exceed ${max}`,
  range: (min, max) => `Value must be between ${min} and ${max}`
};
