import React from 'react'
import { Field, Select } from './ui'

const LABEL = { mekhala: 'Mekhala', district: 'District', area: 'Area', unit: 'Unit' }
const aOrAn = (level) => (level === 'area' ? 'an' : 'a')

/**
 * Top-down location picker: each level lists only the children of what is
 * picked above it (district → area → unit), and changing a level clears the
 * levels below. `levels` is the chain to show, e.g. ['district', 'area', 'unit'];
 * `value` holds { [level]: name } and `onChange` receives the same shape.
 * Names repeat under different parents, so callers should match a picked
 * record on the whole chain, not on its name alone.
 */
export default function LocationCascade({ locations, levels, value, onChange }) {
  return levels.map((level, i) => {
    const above = levels.slice(0, i)
    const missing = above.find(parent => !value[parent])
    const options = missing
      ? []
      : locations.filter(l => l.type === level && above.every(parent => l[parent] === value[parent]))

    return (
      <Field key={level} label={LABEL[level]} required>
        <Select
          value={value[level] || ''}
          onChange={e => onChange(Object.fromEntries(
            levels.map((l, j) => [l, j < i ? value[l] : j === i ? e.target.value : ''])
          ))}
          disabled={Boolean(missing)}
          required
        >
          <option value="">
            {missing ? `Select ${aOrAn(missing)} ${missing} first` : `Select ${aOrAn(level)} ${level}`}
          </option>
          {options.map(l => <option key={l._id} value={l.name}>{l.name}</option>)}
        </Select>
      </Field>
    )
  })
}
