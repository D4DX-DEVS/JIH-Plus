import React from 'react';
import { MASTER_LEVELS, masterLevelLabel, masterOptionNames, useMasterData } from '../../utils/masterData';

/**
 * Dropdown filled from the portal's master data (see utils/masterData.js).
 * `scope` comes from the form renderer when the field is narrowed by another
 * field; without it the whole list is offered.
 */
export default function MasterDataSelect({ field, value, onChange, disabled, controlA11y, className, scope }) {
  // A read-only view only needs the saved answer, not the list.
  const { items, loading, error, retry } = useMasterData(disabled ? null : field.masterSource);
  const waitingFor = scope?.waitingFor;
  const level = masterLevelLabel(field.masterSource).toLowerCase();

  const names = masterOptionNames(items, scope?.values);
  // Keep a saved answer selectable even if the location was renamed since.
  if (value && !names.includes(value)) names.unshift(value);

  let placeholder = field.placeholder || `Select ${level}...`;
  if (!field.masterSource) placeholder = 'No master data list chosen';
  else if (waitingFor) placeholder = `Select ${waitingFor.label || masterLevelLabel(waitingFor.masterSource)} first`;
  else if (loading && !disabled) placeholder = 'Loading...';
  else if (!disabled && !error && names.length === 0) placeholder = `No ${MASTER_LEVELS[field.masterSource]?.plural || 'entries'} found`;

  return (
    <>
      <select
        {...controlA11y}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || !field.masterSource || Boolean(waitingFor)}
        className={className}
      >
        <option value="">{placeholder}</option>
        {names.map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      {error && !disabled && (
        <p className="mt-1 text-xs text-red-600">
          {error}.{' '}
          <button type="button" onClick={retry} className="min-h-[44px] font-semibold underline sm:min-h-0">
            Try again
          </button>
        </p>
      )}
    </>
  );
}
