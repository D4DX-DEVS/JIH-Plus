import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { ClipboardList, Clock, CheckCircle2, TrendingUp, Filter, Eye, EyeOff } from 'lucide-react';

// Reusable submissions analytics section for the area / district / admin
// dashboard landings. Fetches every report submission the viewer is allowed
// to see (all report types) and renders totals + comparison charts.
//
// scope: 'area' | 'district' | 'admin'
//   - area   : units under the area (no extra filter)
//   - district: units + areas under the district (filter by area)
//   - admin  : units + areas + districts (filter by area and district)

const LEVEL_LABELS = { unit: 'യൂണിറ്റ്', area: 'ഏരിയ', district: 'ജില്ല' };
const TYPE_LABELS = { monthly: 'പ്രതിമാസ', quarterly: 'ത്രൈമാസ', yearly: 'വാർഷിക', special: 'സ്പെഷ്യൽ' };
const LEVEL_COLORS = { unit: '#f59e0b', area: '#8b5cf6', district: '#3b82f6' };
const STATUS_COLORS = { submitted: '#10b981', pending: '#f59e0b' };

const SCOPE_ENDPOINT = {
  admin: { url: '/api/admin/report-submissions', tokenKey: 'adminToken' },
  district: { url: '/api/user/report-submissions', tokenKey: 'userToken' },
  area: { url: '/api/user/report-submissions', tokenKey: 'userToken' },
};

// `w-full` on the text block is what keeps long Malayalam labels inside the
// card: in a column flex the block would otherwise size to its content and
// spill past the border, and Malayalam words offer no break opportunities.
const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-2.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3 overflow-hidden">
    <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${tone}`}>
      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
    </div>
    <div className="w-full min-w-0 sm:w-auto">
      <p className="text-lg sm:text-2xl font-bold text-[#002349] leading-none">{value}</p>
      <p className="text-[10px] sm:text-xs text-gray-500 mt-1 font-medium leading-tight break-words [overflow-wrap:anywhere]">{label}</p>
    </div>
  </div>
);

const normalizeName = (s) => String(s || '').trim().toLowerCase();

// One entity type's submitted-vs-pending status for a single report. Names are
// chips, optionally hidden until the parent "show names" toggle is on.
const EntityRow = ({ label, breakdown, showNames, namePrompt, reports = [], reportValue, onReportChange }) => (
  <div>
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
      <span className="text-sm font-semibold text-[#002349]">{label}</span>
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        {breakdown.submitted.length} സമർപ്പിച്ചു
      </span>
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        {breakdown.pending.length} പെൻഡിംഗ്
      </span>
      {reports.length > 0 && (
        <select
          value={reportValue || ''}
          onChange={e => onReportChange(e.target.value)}
          title={reports.find(r => String(r._id) === String(reportValue))?.title || ''}
          className="w-full sm:w-auto sm:ml-auto sm:max-w-[20rem] min-w-0 truncate border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 bg-white focus:ring-2 focus:ring-[#002349]"
        >
          <option value="">എല്ലാ റിപ്പോർട്ടുകളും</option>
          {reports.map(r => (
            <option key={r._id} value={r._id}>{r.title}</option>
          ))}
        </select>
      )}
    </div>
    {showNames && namePrompt && (
      <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        {namePrompt}
      </div>
    )}
    {showNames && !namePrompt && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 mb-1.5">സമർപ്പിച്ചവ</p>
          {breakdown.submitted.length === 0 ? (
            <p className="text-xs text-gray-400">—</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {breakdown.submitted.map(n => (
                <span key={n} className="text-xs font-medium px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">{n}</span>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-1.5">പെൻഡിംഗ്</p>
          {breakdown.pending.length === 0 ? (
            <p className="text-xs text-gray-400">—</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {breakdown.pending.map(n => (
                <span key={n} className="text-xs font-medium px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">{n}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

const SubmissionsAnalytics = ({ scope = 'area', units = null, areas = null }) => {
  const cfg = SCOPE_ENDPOINT[scope] || SCOPE_ENDPOINT.area;
  const [submissions, setSubmissions] = useState([]);
  const [roster, setRoster] = useState(null);
  const [reports, setReports] = useState([]);
  // Which report each level's submitted/pending breakdown is measured against.
  // Defaults to the most recently added report for that level ('' = all).
  const [reportByLevel, setReportByLevel] = useState({ unit: '', area: '', district: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [showNames, setShowNames] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        setError('');
        const token = localStorage.getItem(cfg.tokenKey);
        const rosterParam = scope === 'admin' ? '&includeRoster=1' : '';
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}${cfg.url}?limit=2000&includeReports=1${rosterParam}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (active && res.data?.success) {
          setSubmissions(res.data.data || []);
          if (res.data.roster) setRoster(res.data.roster);
          const reportList = res.data.reports || [];
          setReports(reportList);
          // Backend sorts newest first, so the first match per level is the
          // most recently added report — the initial selection.
          const initial = { unit: '', area: '', district: '' };
          reportList.forEach(r => {
            const lvl = r.reportFor || 'district';
            if (initial[lvl] === '') initial[lvl] = String(r._id);
          });
          setReportByLevel(initial);
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load analytics.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [cfg.url, cfg.tokenKey]);

  const levelOf = (s) => s.userId?.type || s.reportId?.reportFor || 'unit';

  // Dropdown options come from the full roster when available (so every
  // district/area is selectable, not only those that already have submissions).
  const allDistricts = useMemo(() => {
    const set = new Set();
    if (roster?.districts) {
      roster.districts.forEach(d => { if (d.name) set.add(d.name); });
    } else {
      submissions.forEach(s => { if (s.userId?.districtName) set.add(s.userId.districtName); });
    }
    return [...set].sort();
  }, [roster, submissions]);

  const allAreas = useMemo(() => {
    const set = new Set();
    if (roster?.areas) {
      roster.areas.forEach(a => {
        if (districtFilter && a.districtName && a.districtName !== districtFilter) return;
        if (a.name) set.add(a.name);
      });
    } else {
      submissions.forEach(s => {
        if (districtFilter && s.userId?.districtName !== districtFilter) return;
        if (s.userId?.areaName) set.add(s.userId.areaName);
      });
    }
    return [...set].sort();
  }, [roster, submissions, districtFilter]);

  const filtered = useMemo(() => {
    return submissions.filter(s => {
      if (districtFilter && s.userId?.districtName !== districtFilter) return false;
      if (areaFilter && s.userId?.areaName !== areaFilter) return false;
      return true;
    });
  }, [submissions, districtFilter, areaFilter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const submitted = filtered.filter(s => s.status === 'submitted').length;
    const pending = filtered.filter(s => s.status === 'pending').length;
    const byLevel = { unit: 0, area: 0, district: 0 };
    const byType = { monthly: 0, quarterly: 0, yearly: 0, special: 0 };
    filtered.forEach(s => {
      const lvl = levelOf(s);
      if (byLevel[lvl] != null) byLevel[lvl] += 1;
      const t = s.reportId?.type;
      if (byType[t] != null) byType[t] += 1;
    });
    return { total, submitted, pending, byLevel, byType };
  }, [filtered]);

  const levelChartData = useMemo(() => {
    const levels = scope === 'area' ? ['unit'] : scope === 'district' ? ['unit', 'area'] : ['unit', 'area', 'district'];
    return levels.map(l => ({ name: LEVEL_LABELS[l], key: l, submissions: stats.byLevel[l] || 0 }));
  }, [stats, scope]);

  const typeChartData = useMemo(
    () => Object.keys(TYPE_LABELS).map(t => ({ name: TYPE_LABELS[t], count: stats.byType[t] || 0 })),
    [stats]
  );

  const statusChartData = useMemo(() => ([
    { name: 'Submitted', value: stats.submitted, key: 'submitted' },
    { name: 'Pending', value: stats.pending, key: 'pending' },
  ]).filter(d => d.value > 0), [stats]);

  const recent = useMemo(() => {
    return [...filtered]
      .sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0))
      .slice(0, 6);
  }, [filtered]);

  // Reports selectable per level, newest first (the backend already sorts).
  const reportsByLevel = useMemo(() => {
    const grouped = { unit: [], area: [], district: [] };
    reports.forEach(r => {
      const lvl = r.reportFor || 'district';
      if (grouped[lvl]) grouped[lvl].push(r);
    });
    return grouped;
  }, [reports]);

  const setLevelReport = (level, value) => setReportByLevel(prev => ({ ...prev, [level]: value }));

  // A submission counts towards a level's breakdown only when it belongs to the
  // report picked in that level's dropdown ('' = every report).
  const matchesLevelReport = (s, level) => {
    const selected = reportByLevel[level];
    if (!selected) return true;
    return String(s.reportId?._id || s.reportId || '') === String(selected);
  };

  // Names of units that submitted the report selected for the unit level.
  const submittedUnitNames = useMemo(() => {
    const set = new Set();
    filtered.forEach(s => {
      if (s.status === 'submitted' && s.userId?.unitName && matchesLevelReport(s, 'unit')) {
        set.add(normalizeName(s.userId.unitName));
      }
    });
    return set;
  }, [filtered, reportByLevel]);

  // Names of areas / districts whose own report was submitted.
  const submittedAreaNames = useMemo(() => {
    const set = new Set();
    filtered.forEach(s => {
      const lvl = s.userId?.type || s.reportId?.reportFor;
      if (lvl === 'area' && s.status === 'submitted' && s.userId?.areaName && matchesLevelReport(s, 'area')) {
        set.add(normalizeName(s.userId.areaName));
      }
    });
    return set;
  }, [filtered, reportByLevel]);

  const submittedDistrictNames = useMemo(() => {
    const set = new Set();
    filtered.forEach(s => {
      const lvl = s.userId?.type || s.reportId?.reportFor;
      if (lvl === 'district' && s.status === 'submitted' && s.userId?.districtName && matchesLevelReport(s, 'district')) {
        set.add(normalizeName(s.userId.districtName));
      }
    });
    return set;
  }, [filtered, reportByLevel]);

  // Split a roster into submitted vs pending (pending = no submitted report),
  // honouring the active district/area filters via each item's parent names.
  const splitRoster = (rosterArr, submittedSet, kind) => {
    if (!Array.isArray(rosterArr) || rosterArr.length === 0) return null;
    const submitted = [];
    const pending = [];
    rosterArr.forEach(item => {
      const name = item.name || item.title || item.code || '';
      if (!name) return;
      // Filter by the selected district/area using the item's own parentage.
      if (districtFilter) {
        if (kind === 'district') { if (name !== districtFilter) return; }
        else if (item.districtName != null && item.districtName !== districtFilter) return;
      }
      if (areaFilter) {
        if (kind === 'area') { if (name !== areaFilter) return; }
        else if (kind === 'unit' && item.areaName != null && item.areaName !== areaFilter) return;
      }
      (submittedSet.has(normalizeName(name)) ? submitted : pending).push(name);
    });
    if (submitted.length === 0 && pending.length === 0) return null;
    return { submitted: submitted.sort(), pending: pending.sort() };
  };

  // Prefer the authoritative roster returned by the submissions endpoint; fall
  // back to any roster passed in as props.
  const unitRoster = roster?.units ?? units;
  const areaRoster = roster?.areas ?? areas;
  const districtRoster = roster?.districts ?? null;
  const unitBreakdown = useMemo(() => splitRoster(unitRoster, submittedUnitNames, 'unit'), [unitRoster, submittedUnitNames, districtFilter, areaFilter]);
  const areaBreakdown = useMemo(() => splitRoster(areaRoster, submittedAreaNames, 'area'), [areaRoster, submittedAreaNames, districtFilter, areaFilter]);
  const districtBreakdown = useMemo(() => splitRoster(districtRoster, submittedDistrictNames, 'district'), [districtRoster, submittedDistrictNames, districtFilter, areaFilter]);
  const hasRoster = !!(unitBreakdown || areaBreakdown || districtBreakdown);
  const namesCollapsible = scope !== 'area'; // area always shows names; district/admin behind a toggle

  // For large scopes, unit/area name lists are only shown once the viewer has
  // narrowed down via the filter dropdowns (otherwise thousands of names).
  const unitNamePrompt = (() => {
    if (scope === 'admin') {
      if (!districtFilter && !areaFilter) return 'യൂണിറ്റ് പേരുകൾ കാണാൻ മുകളിലെ ഫിൽട്ടറിൽ ജില്ലയും ഏരിയയും തിരഞ്ഞെടുക്കുക';
      if (!districtFilter) return 'ജില്ല തിരഞ്ഞെടുക്കുക';
      if (!areaFilter) return 'ഏരിയ തിരഞ്ഞെടുക്കുക';
    } else if (scope === 'district') {
      if (!areaFilter) return 'യൂണിറ്റ് പേരുകൾ കാണാൻ മുകളിലെ ഫിൽട്ടറിൽ ഏരിയ തിരഞ്ഞെടുക്കുക';
    }
    return null;
  })();
  const areaNamePrompt = scope === 'admin' && !districtFilter
    ? 'ഏരിയ പേരുകൾ കാണാൻ മുകളിലെ ഫിൽട്ടറിൽ ജില്ല തിരഞ്ഞെടുക്കുക'
    : null;

  const unitSubmissionsLabel = scope === 'area' ? 'യൂണിറ്റ് സബ്മിഷനുകൾ' : 'ആകെ സബ്മിഷനുകൾ';
  const primaryTotal = scope === 'area' ? (stats.byLevel.unit || 0) : stats.total;

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm flex items-center justify-center">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#002349]" />
        <span className="ml-3 text-gray-500 text-sm">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl text-sm">{error}</div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#002349]/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-[#002349]" />
          </div>
          <h2 className="text-lg font-bold text-[#002349]">സബ്മിഷൻ വിശകലനം</h2>
        </div>

        {(scope === 'district' || scope === 'admin') && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {scope === 'admin' && (
              <select
                value={districtFilter}
                onChange={e => { setDistrictFilter(e.target.value); setAreaFilter(''); }}
                className="flex-1 min-w-0 sm:flex-none border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349]"
              >
                <option value="">എല്ലാ ജില്ലകളും</option>
                {allDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            <select
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value)}
              className="flex-1 min-w-0 sm:flex-none border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349]"
            >
              <option value="">എല്ലാ ഏരിയകളും</option>
              {allAreas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Stat cards (hidden for admin — the location overview above already
          shows totals and the roster panel below shows submitted/pending). */}
      {scope !== 'admin' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatCard icon={ClipboardList} label={unitSubmissionsLabel} value={primaryTotal} tone="bg-[#002349]/10 text-[#002349]" />
          {scope === 'area' && unitBreakdown ? (
            <>
              <StatCard icon={CheckCircle2} label="സമർപ്പിച്ച യൂണിറ്റുകൾ" value={unitBreakdown.submitted.length} tone="bg-emerald-100 text-emerald-600" />
              <StatCard icon={Clock} label="പെൻഡിംഗ് യൂണിറ്റുകൾ" value={unitBreakdown.pending.length} tone="bg-amber-100 text-amber-600" />
              <StatCard icon={TrendingUp} label="ആകെ യൂണിറ്റുകൾ" value={unitRoster?.length || 0} tone="bg-blue-100 text-blue-600" />
            </>
          ) : (
            <>
              <StatCard icon={CheckCircle2} label="സമർപ്പിച്ചവ" value={stats.submitted} tone="bg-emerald-100 text-emerald-600" />
              <StatCard icon={Clock} label="പെൻഡിംഗ്" value={stats.pending} tone="bg-amber-100 text-amber-600" />
              <StatCard icon={TrendingUp} label="ആകെ" value={stats.total} tone="bg-blue-100 text-blue-600" />
            </>
          )}
        </div>
      )}

      {/* Submitted vs pending roster (units / areas), listed by name */}
      {hasRoster && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#002349]" />
              <h3 className="text-sm font-semibold text-[#002349]">സമർപ്പണ നില</h3>
            </div>
            {namesCollapsible && (
              <button
                onClick={() => setShowNames(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#002349] hover:bg-[#002349]/5 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
              >
                {showNames ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showNames ? 'പേരുകൾ മറയ്ക്കുക' : 'പേരുകൾ കാണിക്കുക'}
              </button>
            )}
          </div>
          <div className="space-y-4 divide-y divide-gray-100">
            {unitBreakdown && (
              <div className="pt-0">
                <EntityRow
                  label="യൂണിറ്റുകൾ"
                  breakdown={unitBreakdown}
                  showNames={showNames || !namesCollapsible}
                  namePrompt={unitNamePrompt}
                  reports={reportsByLevel.unit}
                  reportValue={reportByLevel.unit}
                  onReportChange={v => setLevelReport('unit', v)}
                />
              </div>
            )}
            {areaBreakdown && (
              <div className="pt-4">
                <EntityRow
                  label="ഏരിയകൾ"
                  breakdown={areaBreakdown}
                  showNames={showNames || !namesCollapsible}
                  namePrompt={areaNamePrompt}
                  reports={reportsByLevel.area}
                  reportValue={reportByLevel.area}
                  onReportChange={v => setLevelReport('area', v)}
                />
              </div>
            )}
            {districtBreakdown && (
              <div className="pt-4">
                <EntityRow
                  label="ജില്ലകൾ"
                  breakdown={districtBreakdown}
                  showNames={showNames || !namesCollapsible}
                  reports={reportsByLevel.district}
                  reportValue={reportByLevel.district}
                  onReportChange={v => setLevelReport('district', v)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By level */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-[#002349] mb-3">ലെവൽ അനുസരിച്ച് സബ്മിഷനുകൾ</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={levelChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="submissions" name="സബ്മിഷനുകൾ" radius={[6, 6, 0, 0]}>
                {levelChartData.map(d => <Cell key={d.key} fill={LEVEL_COLORS[d.key] || '#002349'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[#002349] mb-3">സ്റ്റാറ്റസ്</h3>
          {statusChartData.length === 0 ? (
            <p className="text-sm text-gray-400 py-16 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusChartData.map(d => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* By report type + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-[#002349] mb-3">റിപ്പോർട്ട് തരം അനുസരിച്ച്</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="സബ്മിഷനുകൾ" fill="#002349" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[#002349] mb-3">സമീപകാല സബ്മിഷനുകൾ</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">No submissions yet</p>
          ) : (
            <ul className="space-y-2">
              {recent.map(s => (
                <li key={s._id} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.reportId?.title || '—'}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {[s.userId?.areaName, s.userId?.unitName].filter(Boolean).join(' / ') || s.userId?.districtName || '—'}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      s.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {s.status === 'submitted' ? 'Submitted' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionsAnalytics;
