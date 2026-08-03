import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, BarChart3, Hash, Table2, Type, ListChecks, Users } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const MONTHS_ML = [
  { value: 1, label: 'ജനുവരി' },
  { value: 2, label: 'ഫെബ്രുവരി' },
  { value: 3, label: 'മാർച്ച്' },
  { value: 4, label: 'ഏപ്രിൽ' },
  { value: 5, label: 'മേയ്' },
  { value: 6, label: 'ജൂൺ' },
  { value: 7, label: 'ജൂലൈ' },
  { value: 8, label: 'ഓഗസ്റ്റ്' },
  { value: 9, label: 'സെപ്റ്റംബർ' },
  { value: 10, label: 'ഒക്‌ടോബർ' },
  { value: 11, label: 'നവംബർ' },
  { value: 12, label: 'ഡിസംബർ' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

const KIND_BADGE = {
  choice: { label: 'Single choice', cls: 'bg-blue-50 text-blue-700', Icon: BarChart3 },
  multi: { label: 'Multiple choice', cls: 'bg-purple-50 text-purple-700', Icon: ListChecks },
  number: { label: 'Number', cls: 'bg-emerald-50 text-emerald-700', Icon: Hash },
  table: { label: 'Table totals', cls: 'bg-amber-50 text-amber-700', Icon: Table2 },
  text: { label: 'Text', cls: 'bg-gray-100 text-gray-600', Icon: Type },
};

export default function ConsolidationTab() {
  const token = localStorage.getItem('adminToken');
  const headers = { Authorization: `Bearer ${token}` };

  // Step 1: which form
  const [type, setType] = useState('monthly');
  const [reportFor, setReportFor] = useState('district');
  const [year, setYear] = useState('');   // '' = All Years
  const [month, setMonth] = useState(''); // '' = All Months
  const [reportId, setReportId] = useState('');

  // Step 2: location scope ('' = all)
  const [districtId, setDistrictId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [unitId, setUnitId] = useState('');

  const [reports, setReports] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [units, setUnits] = useState([]);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [error, setError] = useState('');

  // Load districts on mount
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/master/districts`, { headers })
      .then(r => setDistricts(r.data.data || []))
      .catch(e => console.error('Load districts error', e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load areas when district changes
  useEffect(() => {
    if (districtId) {
      axios.get(`${API_BASE_URL}/api/master/areas?districtId=${districtId}`, { headers })
        .then(r => setAreas(r.data.data || []))
        .catch(e => console.error('Load areas error', e));
    } else {
      setAreas([]);
    }
    setAreaId('');
    setUnitId('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId]);

  // Load units when area changes (unit reports only)
  useEffect(() => {
    if (reportFor === 'unit' && districtId && areaId) {
      axios.get(`${API_BASE_URL}/api/master/units?districtId=${districtId}&areaId=${areaId}`, { headers })
        .then(r => setUnits(r.data.data || []))
        .catch(e => console.error('Load units error', e));
    } else {
      setUnits([]);
    }
    setUnitId('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId, reportFor, districtId]);

  // Load matching reports when form filters change
  useEffect(() => {
    setReportsLoading(true);
    setReportId('');
    setResult(null);
    const params = new URLSearchParams({ type, reportFor });
    if (year) params.append('year', year);
    if (type === 'monthly' && month) params.append('month', month);
    axios.get(`${API_BASE_URL}/api/admin/reports/for-consolidation?${params}`, { headers })
      .then(r => setReports(r.data.data || []))
      .catch(e => console.error('Load reports error', e))
      .finally(() => setReportsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, reportFor, month, year]);

  // Clear stale sub-filters on type / reportFor change
  useEffect(() => {
    if (type !== 'monthly') setMonth('');
    if (type === 'special') setYear('');
  }, [type]);

  useEffect(() => {
    setDistrictId('');
    setAreaId('');
    setUnitId('');
  }, [reportFor]);

  // Auto-fetch consolidation whenever the report or location scope changes
  useEffect(() => {
    if (!reportId) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ reportId });
    if (districtId) params.append('districtId', districtId);
    if (areaId) params.append('areaId', areaId);
    if (unitId) params.append('unitId', unitId);
    axios.get(`${API_BASE_URL}/api/admin/reports/consolidation?${params}`, { headers })
      .then(r => { if (!cancelled) setResult(r.data); })
      .catch(e => {
        if (!cancelled) {
          setResult(null);
          setError(e.response?.data?.message || 'Failed to fetch consolidation data');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, districtId, areaId, unitId]);

  const submittedCount = result?.stats?.submittedCount || 0;

  const scopeLabel = () => {
    const dName = districts.find(d => d._id === districtId)?.name;
    const aName = areas.find(a => a._id === areaId)?.name;
    const uName = units.find(u => u._id === unitId)?.name;
    if (!dName) return 'All Districts / എല്ലാ ജില്ലകളും';
    return [dName, aName, uName].filter(Boolean).join(' › ');
  };

  const periodLabel = (r) => {
    if (!r) return '';
    const parts = [];
    if (r.month) parts.push(MONTHS_ML.find(m => m.value === r.month)?.label || r.month);
    if (r.quarter) parts.push(`Q${r.quarter}`);
    if (r.year) parts.push(r.year);
    return parts.join(' ');
  };

  // ── Renderers per breakdown kind ──────────────────────────────────────────

  const renderChoiceRows = (field) => {
    const rows = field.options.map(opt => ({ label: opt, count: field.counts[opt] || 0 }));
    if (field.notAnswered > 0) {
      rows.push({ label: 'Not answered / ഉത്തരം നൽകിയിട്ടില്ല', count: field.notAnswered, muted: true });
    }
    return (
      <div className="space-y-2">
        {rows.map((row, i) => {
          const p = pct(row.count, submittedCount);
          return (
            <div key={i}>
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className={`text-sm truncate ${row.muted ? 'text-gray-400 italic' : 'text-gray-700'}`}>
                  {row.label}
                </span>
                <span className={`text-sm font-semibold shrink-0 ${row.muted ? 'text-gray-400' : 'text-[#002349]'}`}>
                  {row.count}
                  <span className="text-xs font-normal text-gray-400 ml-1">({p}%)</span>
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${row.muted ? 'bg-gray-300' : 'bg-gradient-to-r from-[#002349] to-[#1a4a7a]'}`}
                  style={{ width: `${p}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderNumber = (field) => (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Total / ആകെ', value: field.sum, cls: 'bg-[#002349] text-white' },
          { label: 'Average / ശരാശരി', value: Math.round(field.avg * 100) / 100, cls: 'bg-gray-50 text-[#002349]' },
          { label: 'Lowest', value: field.min ?? '—', cls: 'bg-gray-50 text-[#002349]' },
          { label: 'Highest', value: field.max ?? '—', cls: 'bg-gray-50 text-[#002349]' },
        ].map((tile, i) => (
          <div key={i} className={`rounded-lg p-3 text-center ${tile.cls}`}>
            <div className="text-xl font-bold">{tile.value}</div>
            <div className={`text-[11px] font-medium mt-0.5 ${i === 0 ? 'text-blue-200' : 'text-gray-500'}`}>{tile.label}</div>
          </div>
        ))}
      </div>
      {field.notAnswered > 0 && (
        <p className="text-xs text-gray-400 mt-2">{field.notAnswered} did not answer</p>
      )}
    </div>
  );

  const renderTable = (field) => {
    const { rowTitles, columnTitles, cellSums } = field;
    const colSummable = columnTitles.map((_, ci) => cellSums.some(r => r[ci] !== null));
    const anySummable = colSummable.some(Boolean);
    const colTotals = columnTitles.map((_, ci) =>
      colSummable[ci] ? cellSums.reduce((t, r) => t + (r[ci] ?? 0), 0) : null
    );
    const rowTotals = rowTitles.map((_, ri) =>
      cellSums[ri].some(v => v !== null) ? cellSums[ri].reduce((t, v) => t + (v ?? 0), 0) : null
    );
    const grand = colTotals.reduce((t, v) => t + (v ?? 0), 0);
    const th = 'border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-semibold text-gray-600';

    if (!anySummable) {
      return (
        <p className="text-sm text-gray-500 italic">
          This table has no number columns to sum. / ഈ ടേബിളിൽ കൂട്ടാവുന്ന നമ്പർ കോളങ്ങളില്ല.
        </p>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${th} text-left`}>{field.firstColumnHeader || ''}</th>
              {columnTitles.map((c, ci) => (
                <th key={ci} className={`${th} text-center`}>{c}</th>
              ))}
              <th className={`${th} text-center bg-gray-100`}>Total / ആകെ</th>
            </tr>
          </thead>
          <tbody>
            {rowTitles.map((row, ri) => (
              <tr key={ri}>
                <td className="border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-medium text-gray-700">{row}</td>
                {columnTitles.map((_, ci) => (
                  <td key={ci} className="border border-gray-200 px-2.5 py-2 text-center text-gray-800">
                    {cellSums[ri][ci] === null ? <span className="text-gray-300">—</span> : cellSums[ri][ci]}
                  </td>
                ))}
                <td className="border border-gray-200 bg-gray-50 px-2.5 py-2 text-center font-semibold text-[#002349]">
                  {rowTotals[ri] === null ? <span className="text-gray-300">—</span> : rowTotals[ri]}
                </td>
              </tr>
            ))}
            <tr>
              <td className="border border-gray-200 bg-gray-100 px-2.5 py-2 text-xs font-bold text-gray-700">Total / ആകെ</td>
              {columnTitles.map((_, ci) => (
                <td key={ci} className="border border-gray-200 bg-gray-100 px-2.5 py-2 text-center font-semibold text-[#002349]">
                  {colTotals[ci] === null ? <span className="text-gray-300">—</span> : colTotals[ci]}
                </td>
              ))}
              <td className="border border-gray-200 bg-[#002349] px-2.5 py-2 text-center font-bold text-white">{grand}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderFieldCard = (field) => {
    const badge = KIND_BADGE[field.kind] || KIND_BADGE.text;
    const { Icon } = badge;
    return (
      <div key={field.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h4 className="text-sm font-semibold text-gray-800">{field.label}</h4>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${badge.cls}`}>
            <Icon className="w-3 h-3" />
            {badge.label}
          </span>
        </div>
        {(field.kind === 'choice' || field.kind === 'multi') && renderChoiceRows(field)}
        {field.kind === 'number' && renderNumber(field)}
        {field.kind === 'table' && renderTable(field)}
        {field.kind === 'text' && (
          <p className="text-sm text-gray-500 italic">
            Written answers are not consolidated ({field.answered} answered) — read them in Submissions.
          </p>
        )}
      </div>
    );
  };

  const selectCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002349] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400';

  return (
    <div className="space-y-4">
      {/* Step 1: pick the form */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
        <h3 className="text-base font-semibold text-[#002349] mb-3">ഫിൽറ്ററുകൾ / Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Report Type / ഫോം തരം</label>
            <select value={type} onChange={e => setType(e.target.value)} className={selectCls}>
              <option value="monthly">Monthly / മാസ ഫോം</option>
              <option value="quarterly">Quarterly / ത്രൈമാസ ഫോം</option>
              <option value="yearly">Yearly / വാർഷിക ഫോം</option>
              <option value="special">Special / പ്രത്യേക ഫോം</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Report For / ആർക്കുള്ളത്</label>
            <select value={reportFor} onChange={e => setReportFor(e.target.value)} className={selectCls}>
              <option value="district">District / ജില്ല</option>
              <option value="area">Area / ഏരിയ</option>
              <option value="unit">Unit / യൂണിറ്റ്</option>
            </select>
          </div>

          {type !== 'special' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year / വർഷം</label>
              <select value={year} onChange={e => setYear(e.target.value)} className={selectCls}>
                <option value="">All Years / എല്ലാ വർഷവും</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {type === 'monthly' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month / മാസം</label>
              <select value={month} onChange={e => setMonth(e.target.value)} className={selectCls}>
                <option value="">All Months / എല്ലാ മാസവും</option>
                {MONTHS_ML.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Report / ഫോം{reportsLoading && <span className="text-gray-400 ml-1">(loading...)</span>}
            </label>
            <select
              value={reportId}
              onChange={e => setReportId(e.target.value)}
              disabled={reportsLoading || reports.length === 0}
              className={selectCls}
            >
              <option value="">
                {reportsLoading ? 'Loading reports...' : reports.length === 0 ? 'No reports found for selected filters' : 'Select a report... / ഫോം തിരഞ്ഞെടുക്കുക'}
              </option>
              {reports.map(r => (
                <option key={r._id} value={r._id}>
                  {r.title}
                  {r.month ? ` — ${MONTHS_ML.find(m => m.value === r.month)?.label || r.month}` : ''}
                  {r.quarter ? ` — Q${r.quarter}` : ''}
                  {r.year ? ` ${r.year}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Step 2: location scope (only once a report is chosen) */}
      {reportId && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-[#002349] mb-3">സ്ഥലം / Location</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">District / ജില്ല</label>
              <select value={districtId} onChange={e => setDistrictId(e.target.value)} className={selectCls}>
                <option value="">All Districts / എല്ലാ ജില്ലകളും</option>
                {districts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            {reportFor !== 'district' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Area / ഏരിയ</label>
                <select value={areaId} onChange={e => setAreaId(e.target.value)} disabled={!districtId} className={selectCls}>
                  <option value="">All Areas / എല്ലാ ഏരിയയും</option>
                  {areas.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
            )}
            {reportFor === 'unit' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unit / യൂണിറ്റ്</label>
                <select value={unitId} onChange={e => setUnitId(e.target.value)} disabled={!areaId} className={selectCls}>
                  <option value="">All Units / എല്ലാ യൂണിറ്റും</option>
                  {units.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading consolidation... / കൺസോളിഡേഷൻ ലോഡ് ചെയ്യുന്നു...
        </div>
      )}

      {/* Initial hint */}
      {!reportId && !loading && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          Select a report above to see its consolidation.<br />
          കൺസോളിഡേഷൻ കാണാൻ മുകളിൽ ഒരു ഫോം തിരഞ്ഞെടുക്കുക.
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Summary bar */}
          <div className="rounded-xl bg-gradient-to-r from-[#002349] to-[#1a4a7a] text-white p-4 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold truncate">{result.report.title}</h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  {periodLabel(result.report)}{periodLabel(result.report) ? ' · ' : ''}{scopeLabel()}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 shrink-0">
                <Users className="w-4 h-4 text-blue-200" />
                <div className="text-sm">
                  <span className="font-bold">{result.stats.submittedCount}</span>
                  <span className="text-blue-200"> / {result.stats.totalLocations} submitted ({result.stats.submissionRate}%)</span>
                </div>
              </div>
            </div>
          </div>

          {result.legacy ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
              This is a legacy report — answer consolidation is not available for old-format forms.
            </div>
          ) : result.stats.submittedCount === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
              No submissions yet for the selected report and location.<br />
              തിരഞ്ഞെടുത്ത ഫോമിനും സ്ഥലത്തിനും ഇതുവരെ സബ്മിഷനുകളില്ല.
            </div>
          ) : (
            result.pages.map(pg => (
              <div key={pg.id} className="space-y-3">
                <h3 className="text-sm font-bold text-[#002349] uppercase tracking-wide border-b border-gray-200 pb-1.5">
                  {pg.title}
                </h3>
                {pg.fields.map(renderFieldCard)}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
