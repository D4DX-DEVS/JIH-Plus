import React from 'react';
import FormField from './FormField';
import NumericInput from '../NumericInput';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CONTROL = 'min-h-11 w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:text-gray-600';

export default function MonthYearFields({ month, year, onMonthChange, onYearChange, minYear, maxYear, disabled = false }) {
  return (
    <div className="grid w-full max-w-md grid-cols-2 items-start gap-3">
      <FormField label="Month">
        <select value={month} onChange={onMonthChange} disabled={disabled} className={CONTROL}>
          <option value="">Select Month</option>
          {MONTHS.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </FormField>
      <FormField label="Year">
        <NumericInput value={year} onChange={onYearChange} min={minYear} max={maxYear} disabled={disabled} className={CONTROL} />
      </FormField>
    </div>
  );
}
