import React from 'react';
import {
  MASTER_LEVELS, isAncestorLevel, masterLevelLabel, masterLevelsForPortal, useMasterData,
} from '../../utils/masterData';

/**
 * Settings for a "masterdata" dropdown: which master-data list it shows and,
 * for a lower level, which dropdown above it narrows the list (an Area
 * dropdown linked to a District dropdown lists that district's areas only).
 */
export default function MasterDataEditor({ field, allFields, onChange }) {
  const source = field.masterSource || '';
  const { items, loading, error } = useMasterData(source);

  const parentChoices = allFields.filter(f =>
    f.type === 'masterdata' && f.id !== field.id && isAncestorLevel(f.masterSource, source));
  const parentId = parentChoices.some(f => f.id === field.masterParentField) ? field.masterParentField : '';
  const canHaveParent = masterLevelsForPortal().some(level => isAncestorLevel(level, source));

  const changeSource = (next) => {
    const keepParent = parentChoices.some(f => f.id === field.masterParentField && isAncestorLevel(f.masterSource, next));
    onChange({
      ...field,
      masterSource: next,
      masterParentField: keepParent ? field.masterParentField : null,
      // A fresh field gets the level as its label; a typed label is kept.
      label: field.label || masterLevelLabel(next),
    });
  };

  const selectClass = 'w-full border border-gray-300 rounded px-2 py-1 text-base sm:text-sm outline-none focus:ring-1 focus:ring-blue-400';

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Master data list</label>
        <select value={source} onChange={e => changeSource(e.target.value)} className={selectClass}>
          <option value="">Choose a list...</option>
          {masterLevelsForPortal().map(level => (
            <option key={level} value={level}>{MASTER_LEVELS[level].label}</option>
          ))}
        </select>
        {source && (
          <p className="text-[11px] text-gray-400 mt-1">
            {loading && 'Loading...'}
            {!loading && error && <span className="text-red-500">{error}</span>}
            {!loading && !error && `${items.length} ${MASTER_LEVELS[source].plural} in master data. The list stays in step with Master Data.`}
          </p>
        )}
      </div>

      {source && canHaveParent && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Show only {MASTER_LEVELS[source].plural} of</label>
          <select
            value={parentId}
            onChange={e => onChange({ ...field, masterParentField: e.target.value === '' ? null : Number(e.target.value) })}
            className={selectClass}
          >
            <option value="">Any — list every {masterLevelLabel(source).toLowerCase()}</option>
            {parentChoices.map(f => (
              <option key={f.id} value={f.id}>
                #{f.id} {f.label || masterLevelLabel(f.masterSource)} ({masterLevelLabel(f.masterSource)})
              </option>
            ))}
          </select>
          {parentChoices.length === 0 && (
            <p className="text-[11px] text-gray-400 mt-1">
              Add a master data dropdown for a level above (for example District) to make this list follow its answer.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
