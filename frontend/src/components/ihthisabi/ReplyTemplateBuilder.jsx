import React, { useState } from 'react'
import { FIELD_LABELS, normalizeBlock, getDefaultBlocks } from '../../utils/ihthisabi/replyTemplateEngine'
import { ChevronUp, ChevronDown, Trash2, Plus, RotateCcw, Save, X } from 'lucide-react'

const OPERATOR_LABELS = {
  gt:  'array length >',
  gte: 'array length >=',
  lt:  'array length <',
  lte: 'array length <=',
  eq:  'array length =',
}

const CTX_KEYS = ['_ctx_unit', '_ctx_quarter', '_ctx_district', '_ctx_year']
// Fields that always list everything — no condition makes sense
const ALWAYS_LIST_KEYS = ['submittedMembers']
const DATA_KEYS = [
  'submittedMembers', 'quranStudyCompleted', 'quranStudyNotCompleted',
  'hadithReadingCompleted', 'hadithReadingNotCompleted',
  'bookReadingCompleted', 'bookReadingNotCompleted',
  'weeklyMeetingPresent', 'weeklyMeetingAbsentees',
  'jamaathMeetingPresent', 'jamaathMeetingAbsentees',
  'grihaMeetingsThreeOrMore', 'grihaMeetingsLessThanThree',
  'baitulmalPaid', 'baitulmalDefaulters',
  'presentationSatisfactory', 'presentationUnsatisfactory',
  'newHalqaMembersOnePlus', 'newHalqaMembersZero',
  'muslimRelationsOnePlus', 'muslimRelationsZero',
  'communityRelationsOnePlus', 'communityRelationsZero',
  'quarterlyVisitsOnePlus', 'quarterlyVisitsZero',
]

function BlockCard({ block, index, total, onChange, onDelete, onMoveUp, onMoveDown, fieldLabels }) {
  const isStatic = block.type === 'static'
  const isCtx = block.fieldKey && block.fieldKey.startsWith('_ctx_')
  const isAlwaysList = block.fieldKey && ALWAYS_LIST_KEYS.includes(block.fieldKey)
  const hideCondition = isCtx || isAlwaysList
  // Show condition operator/value only when {count} is used in the template
  const usesCount = (block.textTemplate || '').includes('{count}')
  const showConditionRow = !hideCondition && usesCount

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
      {/* Block header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 w-6">{index + 1}</span>
          {/* Type toggle */}
          <div className="flex rounded-md overflow-hidden border border-gray-300 text-xs font-medium">
            <button
              type="button"
              onClick={() => onChange({ ...normalizeBlock({ ...block, type: 'static' }) })}
              className={`px-3 py-1 transition-colors ${isStatic ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            >
              Static
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...normalizeBlock({ ...block, type: 'data' }) })}
              className={`px-3 py-1 transition-colors ${!isStatic ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            >
              Data
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded text-red-500 hover:bg-red-50"
            title="Delete block"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Block body */}
      {isStatic ? (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Text</label>
          <textarea
            value={block.text || ''}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            rows={3}
            className="w-full text-sm border border-gray-300 rounded-md p-2 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
            placeholder="Enter static text. Supports {unit}, {quarter}, {year} placeholders."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Field key */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data Field</label>
            <select
              value={block.fieldKey || ''}
              onChange={(e) => onChange({ ...block, fieldKey: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">— Select field —</option>
              <optgroup label="Context Variables">
                {CTX_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {(fieldLabels && fieldLabels[key]) || FIELD_LABELS[key]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Form Data Fields">
                {DATA_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {(fieldLabels && fieldLabels[key]) || FIELD_LABELS[key]}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Field key indicator — shown when a field is selected */}
          {block.fieldKey && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded px-3 py-1.5">
              <span className="text-gray-400">key:</span>
              <code className="font-mono text-indigo-700 font-semibold">{block.fieldKey}</code>
              <span className="text-gray-400 mx-1">→</span>
              <span>use <code className="bg-gray-100 px-1 rounded font-mono text-gray-700">{'{names}'}</code> in your template to insert {isCtx ? 'this value' : 'these names'}</span>
            </div>
          )}

          {/* Note for no-condition fields */}
          {hideCondition && block.fieldKey && (
            <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded px-3 py-2">
              {isCtx
                ? 'ℹ️ Context variable — the selected value is always used directly. No condition needed.'
                : 'ℹ️ Always lists all submitted members. No condition needed.'}
            </p>
          )}

          {/* Condition row — only shown when {count} is used in the text template */}
          {showConditionRow && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
              <select
                value={block.condition?.operator || 'gt'}
                onChange={(e) => onChange({ ...block, condition: { ...block.condition, operator: e.target.value } })}
                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {Object.entries(OPERATOR_LABELS).map(([op, label]) => (
                  <option key={op} value={op}>{label}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
              <input
                type="number"
                min="0"
                value={block.condition?.value ?? 0}
                onChange={(e) => onChange({ ...block, condition: { ...block.condition, value: parseInt(e.target.value) || 0 } })}
                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="w-20">
              <label className="block text-xs font-medium text-gray-600 mb-1">Limit names</label>
              <input
                type="number"
                min="0"
                placeholder="All"
                value={block.limit ?? ''}
                onChange={(e) => onChange({ ...block, limit: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          )} {/* end condition row */}

          {/* textTemplate */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {hideCondition ? 'Text template' : 'Text template'}
              <span className="ml-2 font-normal text-gray-400">Placeholders: {'{names}'} {'{count}'} {'{unit}'} {'{quarter}'} {'{year}'}</span>
            </label>
            <textarea
              value={block.textTemplate || ''}
              onChange={(e) => onChange({ ...block, textTemplate: e.target.value })}
              rows={3}
              className="w-full text-sm border border-gray-300 rounded-md p-2 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
              placeholder="e.g. {names} ഖുർആൻ പഠനം പൂർത്തിയാക്കി\n\n"
            />
            {!hideCondition && !usesCount && (
              <p className="mt-1 text-xs text-gray-400">💡 Add <code className="bg-gray-100 px-1 rounded">{'{count}'}</code> to unlock a numeric condition (e.g. show block only if count &gt; 2)</p>
            )}
          </div>

          {/* elseText — shown for all conditional fields */}
          {!hideCondition && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Else text <span className="font-normal text-gray-400">(shown when list is empty)</span>
            </label>
            <textarea
              value={block.elseText || ''}
              onChange={(e) => onChange({ ...block, elseText: e.target.value })}
              rows={2}
              className="w-full text-sm border border-gray-300 rounded-md p-2 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
              placeholder="Leave empty to show nothing when list is empty."
            />
          </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * ReplyTemplateBuilder
 *
 * Props:
 *   blocks          - current blocks array
 *   onChange        - called with updated blocks array on every edit (for live preview)
 *   onSave          - called with the final blocks array when admin clicks Save
 *   onCancel        - called when admin clicks Cancel
 *   onReset         - called when admin clicks Reset to Default
 *   saving          - boolean, shows spinner on Save button
 *   fieldLabels     - object { fieldKey → Malayalam label } fetched from /admin/form-fields
 *   selectedQuarter - number 1-4
 *   onQuarterChange - callback(number)
 */
export default function ReplyTemplateBuilder({ blocks, onChange, onSave, onCancel, onReset, saving, fieldLabels, selectedQuarter, onQuarterChange }) {
  const [localBlocks, setLocalBlocks] = useState(() => blocks.map(normalizeBlock))

  function update(newBlocks) {
    setLocalBlocks(newBlocks)
    onChange(newBlocks)
  }

  function handleBlockChange(index, newBlock) {
    const next = localBlocks.map((b, i) => (i === index ? newBlock : b))
    update(next)
  }

  function handleDelete(index) {
    update(localBlocks.filter((_, i) => i !== index))
  }

  function handleMoveUp(index) {
    if (index === 0) return
    const next = [...localBlocks]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    update(next)
  }

  function handleMoveDown(index) {
    if (index === localBlocks.length - 1) return
    const next = [...localBlocks]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    update(next)
  }

  function addStatic() {
    update([...localBlocks, normalizeBlock({ type: 'static', text: '' })])
  }

  function addData() {
    update([...localBlocks, normalizeBlock({
      type: 'data',
      fieldKey: '',
      condition: { operator: 'gt', value: 0 },
      textTemplate: '',
      elseText: '',
    })])
  }

  function handleReset() {
    const defaults = getDefaultBlocks()
    setLocalBlocks(defaults)
    onChange(defaults)
    onReset()
  }

  return (
    <div className="border border-indigo-200 rounded-xl bg-indigo-50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-indigo-900 text-base">Edit Reply Template</h4>
        <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quarter selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-indigo-800">Quarter for field labels:</label>
        <select
          value={selectedQuarter || ''}
          onChange={(e) => onQuarterChange && onQuarterChange(Number(e.target.value))}
          className="text-sm border border-indigo-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          <option value={1}>Q1 (ജനുവരി-മാർച്ച്)</option>
          <option value={2}>Q2 (ഏപ്രിൽ-ജൂൺ)</option>
          <option value={3}>Q3 (ജൂലൈ-സെപ്റ്റംബർ)</option>
          <option value={4}>Q4 (ഒക്ടോബർ-ഡിസംബർ)</option>
        </select>
        {fieldLabels && Object.keys(fieldLabels).length > 0 && (
          <span className="text-xs text-green-600">✓ Malayalam labels loaded</span>
        )}
      </div>

      <p className="text-xs text-indigo-700">
        Build the reply message using blocks. <strong>Static</strong> blocks contain fixed text.
        <strong> Data</strong> blocks pull member names from the submission data with a condition.
        Use <code className="bg-indigo-100 px-1 rounded">{'{names}'}</code>,{' '}
        <code className="bg-indigo-100 px-1 rounded">{'{count}'}</code>,{' '}
        <code className="bg-indigo-100 px-1 rounded">{'{unit}'}</code>,{' '}
        <code className="bg-indigo-100 px-1 rounded">{'{quarter}'}</code>,{' '}
        <code className="bg-indigo-100 px-1 rounded">{'{year}'}</code> in any text.
      </p>

      {/* Block list */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {localBlocks.map((block, index) => (
          <BlockCard
            key={index}
            block={block}
            index={index}
            total={localBlocks.length}
            onChange={(nb) => handleBlockChange(index, nb)}
            onDelete={() => handleDelete(index)}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            fieldLabels={fieldLabels}
          />
        ))}
      </div>

      {/* Add block buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={addStatic}
          className="flex items-center gap-1 text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700"
        >
          <Plus className="w-4 h-4" /> Add Static Block
        </button>
        <button
          type="button"
          onClick={addData}
          className="flex items-center gap-1 text-sm px-3 py-2 border border-indigo-300 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700"
        >
          <Plus className="w-4 h-4" /> Add Data Block
        </button>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2 border-t border-indigo-200">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <RotateCcw className="w-4 h-4" /> Reset to Default
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(localBlocks)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Template
          </button>
        </div>
      </div>
    </div>
  )
}
