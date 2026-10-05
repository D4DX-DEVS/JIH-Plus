import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, MapPin, ChevronDown } from 'lucide-react';
import useModalFocus from '../../hooks/useModalFocus';

// Level names for the location that submits each report type
const LEVEL = {
  district: { en: 'District', ml: 'ജില്ല', plural: 'Districts', wise: 'ജില്ല തിരിച്ച്' },
  area: { en: 'Area', ml: 'ഏരിയ', plural: 'Areas', wise: 'ഏരിയ തിരിച്ച്' },
  unit: { en: 'Unit', ml: 'യൂണിറ്റ്', plural: 'Units', wise: 'യൂണിറ്റ് തിരിച്ച്' },
};

const NOT_ANSWERED = '__not_answered__';
const round2 = (n) => Math.round(n * 100) / 100;
const fmt = (n) => round2(n).toLocaleString('en-IN');

const matches = (who, q) =>
  !q || [who.name, who.area, who.district].some(v => v && v.toLowerCase().includes(q));

// Small segmented control. Not .ih-segment: that one folds into a 2-col grid
// on phones, while these few short labels must stay on one line.
function Segmented({ value, onChange, options, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full bg-[#eef2f8] p-1 gap-0.5">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            value === o.value ? 'bg-white text-[#002349] shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="relative block flex-1 min-w-[160px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[44px] sm:min-h-[38px] rounded-full border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002349]/30"
      />
    </label>
  );
}

// Parent levels shared by every submitter (e.g. a district admin's own
// district) carry no information, so the lists leave them out.
const sharedParents = (submitters) => ({
  district: new Set(submitters.map(s => s.district)).size <= 1,
  area: new Set(submitters.map(s => `${s.district}›${s.area}`)).size <= 1,
});

// Sub-label under a location name: its parents, minus the hidden ones
const parentLine = (who, hide) =>
  [hide.district ? '' : who.district, hide.area ? '' : who.area].filter(Boolean).join(' › ');

// ── Choice / multi-choice: who picked each option ───────────────────────────

function ChoiceBody({ field, submitters, reportFor, initialOption, search }) {
  const tabs = useMemo(() => {
    const t = field.options.map(o => ({ key: o, label: o, ids: field.who?.[o] || [] }));
    if ((field.notAnsweredWho || []).length > 0) {
      t.push({ key: NOT_ANSWERED, label: 'Not answered / ഉത്തരം നൽകിയിട്ടില്ല', ids: field.notAnsweredWho, muted: true });
    }
    return t;
  }, [field]);
  const [active, setActive] = useState(initialOption);
  const tab = tabs.find(t => t.key === active) || tabs[0];

  const q = search.trim().toLowerCase();
  const people = (tab?.ids || []).map(i => submitters[i]).filter(w => w && matches(w, q));
  const shared = useMemo(() => sharedParents(submitters), [submitters]);
  // Several districts → group by district; inside one district → by area
  const groupBy = !shared.district ? 'district' : (reportFor === 'unit' && !shared.area ? 'area' : null);
  const hide = { district: shared.district || groupBy === 'district', area: shared.area || groupBy === 'area' };

  const groups = [];
  people.forEach(p => {
    const key = groupBy ? p[groupBy] : '';
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(p);
    else groups.push({ key, items: [p] });
  });

  return (
    <>
      <div className="shrink-0 flex gap-2 overflow-x-auto px-4 sm:px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Options">
        {tabs.map(t => {
          const on = t.key === tab?.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.key)}
              className={`shrink-0 max-w-[240px] min-h-[40px] sm:min-h-[34px] inline-flex items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors ${
                on
                  ? 'bg-[#002349] border-[#002349] text-white'
                  : `bg-white border-gray-200 hover:border-[#002349]/40 ${t.muted ? 'text-gray-400 italic' : 'text-gray-700'}`
              }`}
            >
              <span className="truncate">{t.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold not-italic ${on ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {t.ids.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-gray-100">
        {people.length === 0 ? (
          <p className="py-14 text-center text-sm text-gray-400">
            {q ? 'No match for your search. / തിരച്ചിലിന് ഫലമില്ല.' : 'Nobody selected this option. / ആരും ഇത് തിരഞ്ഞെടുത്തിട്ടില്ല.'}
          </p>
        ) : groups.map((g, gi) => (
          <div key={gi}>
            {groupBy && (
              <div className="sticky top-0 z-[1] flex items-center justify-between bg-gray-50/95 backdrop-blur px-4 sm:px-5 py-1.5 border-b border-gray-100">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{g.key || '—'}</span>
                <span className="text-[11px] font-semibold text-gray-500">{g.items.length}</span>
              </div>
            )}
            <ul className="divide-y divide-gray-100">
              {g.items.map(p => (
                <li key={p.id} className="flex items-center gap-3 px-4 sm:px-5 min-h-[52px] py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e4edfb] text-[#1d4fa8]">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800 [overflow-wrap:anywhere]">{p.name}</span>
                    {parentLine(p, hide) && (
                      <span className="block text-xs text-gray-500 truncate">{parentLine(p, hide)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Number: the value each location entered ─────────────────────────────────

function NumberBody({ field, submitters, reportFor, search }) {
  const level = LEVEL[reportFor] || LEVEL.district;
  const [sort, setSort] = useState('high');
  const [groupBy, setGroupBy] = useState('none');
  const [showMissing, setShowMissing] = useState(false);

  const all = useMemo(
    () => (field.entries || []).map(([i, v]) => ({ who: submitters[i], value: v })).filter(e => e.who),
    [field, submitters]
  );

  // Roll-ups only make sense when there is more than one parent to compare
  const groupOptions = useMemo(() => {
    const opts = [{ value: 'none', label: level.plural }];
    if (reportFor === 'unit' && new Set(all.map(e => `${e.who.district}›${e.who.area}`)).size > 1) {
      opts.push({ value: 'area', label: 'Area totals' });
    }
    if (reportFor !== 'district' && new Set(all.map(e => e.who.district)).size > 1) {
      opts.push({ value: 'district', label: 'District totals' });
    }
    return opts;
  }, [all, reportFor, level.plural]);

  const q = search.trim().toLowerCase();
  const shared = useMemo(() => sharedParents(submitters), [submitters]);

  const rows = useMemo(() => {
    const filtered = all.filter(e => matches(e.who, q));
    let list;
    if (groupBy === 'none') {
      list = filtered.map(e => ({
        key: String(e.who.id),
        name: e.who.name,
        sub: parentLine(e.who, shared),
        value: e.value,
      }));
    } else {
      const map = new Map();
      filtered.forEach(e => {
        const key = groupBy === 'area' ? `${e.who.district}›${e.who.area}` : e.who.district;
        const g = map.get(key) || {
          key,
          name: (groupBy === 'area' ? e.who.area : e.who.district) || '—',
          sub: groupBy === 'area' && !shared.district ? e.who.district : '',
          value: 0,
          count: 0,
        };
        g.value += e.value;
        g.count += 1;
        map.set(key, g);
      });
      list = [...map.values()].map(g => ({
        ...g,
        sub: [g.sub, `${g.count} ${level.plural.toLowerCase()} · avg ${fmt(g.value / g.count)}`].filter(Boolean).join(' · '),
      }));
    }
    const byName = (a, b) => a.name.localeCompare(b.name);
    if (sort === 'high') list.sort((a, b) => b.value - a.value || byName(a, b));
    else if (sort === 'low') list.sort((a, b) => a.value - b.value || byName(a, b));
    else list.sort(byName);
    return list;
  }, [all, q, groupBy, sort, level.plural, shared]);

  const missing = (field.notAnsweredWho || []).map(i => submitters[i]).filter(w => w && matches(w, q));
  const shownTotal = rows.reduce((t, r) => t + r.value, 0);
  const peak = rows.reduce((m, r) => Math.max(m, Math.abs(r.value)), 0);

  return (
    <>
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 sm:px-5 pb-3">
        <Segmented
          label="Sort"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'high', label: 'Highest' },
            { value: 'low', label: 'Lowest' },
            { value: 'name', label: 'A–Z' },
          ]}
        />
        {groupOptions.length > 1 && (
          <Segmented label="Group" value={groupBy} onChange={setGroupBy} options={groupOptions} />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-gray-100">
        {rows.length === 0 ? (
          <p className="py-14 text-center text-sm text-gray-400">
            {q ? 'No match for your search. / തിരച്ചിലിന് ഫലമില്ല.' : 'No values entered. / മൂല്യങ്ങളൊന്നും നൽകിയിട്ടില്ല.'}
          </p>
        ) : (
          <ol className="divide-y divide-gray-100">
            {rows.map((r, i) => (
              <li key={r.key} className="flex items-center gap-3 px-4 sm:px-5 min-h-[56px] py-2.5">
                <span className="w-6 shrink-0 text-right text-xs font-semibold text-gray-400 tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-gray-800 [overflow-wrap:anywhere]">{r.name}</span>
                    <span className={`shrink-0 text-base font-bold tabular-nums ${r.value === 0 ? 'text-gray-400' : 'text-[#002349]'}`}>
                      {fmt(r.value)}
                    </span>
                  </span>
                  {r.sub && <span className="block text-xs text-gray-500 truncate">{r.sub}</span>}
                  <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-[#002349] to-[#1a4a7a]"
                      style={{ width: `${peak > 0 ? (Math.abs(r.value) / peak) * 100 : 0}%` }}
                    />
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}

        {missing.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50/60">
            <button
              type="button"
              onClick={() => setShowMissing(s => !s)}
              aria-expanded={showMissing}
              className="flex w-full items-center justify-between gap-3 px-4 sm:px-5 min-h-[48px] text-left"
            >
              <span className="text-sm italic text-gray-500">
                Did not answer / ഉത്തരം നൽകിയിട്ടില്ല
                <span className="not-italic font-semibold text-gray-600 ml-1.5">({missing.length})</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showMissing ? 'rotate-180' : ''}`} />
            </button>
            {showMissing && (
              <ul className="divide-y divide-gray-100 pb-2">
                {missing.map(w => (
                  <li key={w.id} className="flex items-center justify-between gap-3 px-4 sm:px-5 min-h-[44px] py-1.5">
                    <span className="min-w-0">
                      <span className="block text-sm text-gray-700 [overflow-wrap:anywhere]">{w.name}</span>
                      {parentLine(w, shared) && <span className="block text-xs text-gray-400 truncate">{parentLine(w, shared)}</span>}
                    </span>
                    <span className="text-gray-300">—</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <span className="text-xs text-gray-500">
          {q ? 'Total of shown rows' : 'Total'} / ആകെ
        </span>
        <span className="text-lg font-bold text-[#002349] tabular-nums">{fmt(shownTotal)}</span>
      </div>
    </>
  );
}

// ── Shell: bottom sheet on phones, centred dialog from sm ───────────────────

export default function ConsolidationDrillDown({ view, submitters, reportFor, onClose }) {
  const open = Boolean(view);
  const { dialogRef } = useModalFocus(open, onClose);
  const [search, setSearch] = useState('');
  useEffect(() => { setSearch(''); }, [view]);
  if (!open) return null;

  const { field, option } = view;
  const level = LEVEL[reportFor] || LEVEL.district;
  const isNumber = field.kind === 'number';
  // Name only the levels the list actually spans (a district admin has one district)
  const shared = sharedParents(submitters);
  const searchHint = [
    level.en.toLowerCase(),
    reportFor === 'unit' && !shared.area ? 'area' : '',
    reportFor !== 'district' && !shared.district ? 'district' : '',
  ].filter(Boolean).join(', ');
  const subtitle = isNumber
    ? `${level.en}-wise values / ${level.wise} · ${field.count} answered`
    : `Who selected what / ആരൊക്കെ എന്ത് തിരഞ്ഞെടുത്തു`;

  // Portalled: the dashboard content column is its own stacking context, so an
  // in-place z-50 would sit under the sidebar and the mobile bottom bar.
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={field.label}
          className="pointer-events-auto relative flex w-full flex-col overflow-hidden bg-white shadow-2xl h-[85dvh] rounded-t-3xl sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl"
        >
          <div className="sm:hidden mx-auto mt-2 h-1.5 w-10 rounded-full bg-gray-300" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-3 sm:pt-5 pb-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{subtitle}</p>
              <h3 className="mt-0.5 text-base font-bold text-[#002349] [overflow-wrap:anywhere]">{field.label}</h3>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 -mr-2 -mt-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isNumber && (
            <div className="grid grid-cols-3 gap-2 px-4 sm:px-5 pb-3">
              {[
                { label: 'Total / ആകെ', value: fmt(field.sum), dark: true },
                { label: 'Average / ശരാശരി', value: fmt(field.avg) },
                { label: 'Range', value: field.min === null ? '—' : `${fmt(field.min)}–${fmt(field.max)}` },
              ].map(t => (
                <div key={t.label} className={`rounded-xl px-2 py-2 text-center ${t.dark ? 'bg-[#002349] text-white' : 'bg-gray-50 text-[#002349]'}`}>
                  <div className="text-base font-bold tabular-nums">{t.value}</div>
                  <div className={`text-[11px] ${t.dark ? 'text-blue-200' : 'text-gray-500'}`}>{t.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 sm:px-5 pb-3">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder={`Search ${searchHint}… / തിരയുക`}
            />
          </div>

          {isNumber ? (
            <NumberBody key={field.id} field={field} submitters={submitters} reportFor={reportFor} search={search} />
          ) : (
            <ChoiceBody key={`${field.id}:${option}`} field={field} submitters={submitters} reportFor={reportFor} initialOption={option} search={search} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
