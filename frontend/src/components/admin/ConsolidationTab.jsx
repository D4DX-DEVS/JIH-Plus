import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, Clock, XCircle, Download, RefreshCw } from 'lucide-react';

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

export default function ConsolidationTab() {
  const token = localStorage.getItem('adminToken');
  const headers = { Authorization: `Bearer ${token}` };

  const [year, setYear] = useState('');  // '' means All Years
  const [month, setMonth] = useState('');
  const [type, setType] = useState('monthly');
  const [reportFor, setReportFor] = useState('district');
  const [reportId, setReportId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [areaId, setAreaId] = useState('');

  const [reports, setReports] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [areas, setAreas] = useState([]);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultTab, setResultTab] = useState('all');

  // Load districts on mount
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/master/districts`, { headers })
      .then(r => setDistricts(r.data.data || []))
      .catch(e => console.error('Load districts error', e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load areas when districtId changes
  useEffect(() => {
    if (districtId) {
      axios.get(`${API_BASE_URL}/api/master/areas?districtId=${districtId}`, { headers })
        .then(r => setAreas(r.data.data || []))
        .catch(e => console.error('Load areas error', e));
    } else {
      setAreas([]);
      setAreaId('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId]);

  // Load reports when filter criteria change
  useEffect(() => {
    setReportsLoading(true);
    setReportId('');
    setResult(null);
    const params = new URLSearchParams({ type, reportFor });
    // Only filter by year/month when they are set
    if (year) params.append('year', year);
    if (type === 'monthly' && month) params.append('month', month);
    axios.get(`${API_BASE_URL}/api/admin/reports/for-consolidation?${params}`, { headers })
      .then(r => setReports(r.data.data || []))
      .catch(e => console.error('Load reports error', e))
      .finally(() => setReportsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, reportFor, month, year]);

  // When type changes: clear month for non-monthly; clear year for special (no year field)
  useEffect(() => {
    if (type !== 'monthly') setMonth('');
    if (type === 'special') setYear('');
  }, [type]);

  // When reportFor changes, reset location filters
  useEffect(() => {
    setDistrictId('');
    setAreaId('');
  }, [reportFor]);

  const handleFetch = async () => {
    if (!reportId) return;
    setLoading(true);
    setError('');
    setResult(null);
    const params = new URLSearchParams({ reportId });
    if (districtId) params.append('districtId', districtId);
    if (areaId) params.append('areaId', areaId);
    try {
      const r = await axios.get(`${API_BASE_URL}/api/admin/reports/consolidation?${params}`, { headers });
      setResult(r.data);
      setResultTab('all');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to fetch consolidation data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!result) return;
    const allRows = [
      ...result.submitted.map(r => ({ ...r, _status: 'Submitted' })),
      ...result.pending.map(r => ({ ...r, _status: 'Pending' })),
      ...result.notStarted.map(r => ({ ...r, _status: 'Not Started' })),
    ];
    const header = ['Status', 'Name', 'Access Code', 'District', 'Area', 'Date'];
    const rows = allRows.map(r => [
      r._status,
      r.name,
      r.accessCode,
      r.districtName || '',
      r.areaName || '',
      r.submittedAt
        ? new Date(r.submittedAt).toLocaleDateString('en-IN')
        : r.startedAt
          ? new Date(r.startedAt).toLocaleDateString('en-IN')
          : '',
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consolidation-${result.report?.title || 'report'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRows = () => {
    if (!result) return [];
    if (resultTab === 'submitted') return result.submitted.map(r => ({ ...r, _status: 'submitted' }));
    if (resultTab === 'pending') return result.pending.map(r => ({ ...r, _status: 'pending' }));
    if (resultTab === 'notStarted') return result.notStarted.map(r => ({ ...r, _status: 'notStarted' }));
    return [
      ...result.submitted.map(r => ({ ...r, _status: 'submitted' })),
      ...result.pending.map(r => ({ ...r, _status: 'pending' })),
      ...result.notStarted.map(r => ({ ...r, _status: 'notStarted' })),
    ];
  };

  const StatusBadge = ({ status }) => {
    if (status === 'submitted')
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />Submitted
        </span>
      );
    if (status === 'pending')
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3" />Pending
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3" />Not Started
      </span>
    );
  };

  const rows = getRows();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
        <h3 className="text-base font-semibold text-[#002349] mb-3">ഫിൽറ്ററുകൾ / Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

          {/* Year */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Year / വർഷം</label>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002349] focus:border-transparent"
            >
              <option value="">All Years / എല്ലാ വർഷവും</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Month (only for monthly type) */}
          {type === 'monthly' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month / മാസം</label>
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002349] focus:border-transparent"
              >
                <option value="">All Months</option>
                {MONTHS_ML.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Report Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Report Type / ഫോം തരം</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002349] focus:border-transparent"
            >
              <option value="monthly">Monthly / മാസ ഫോം</option>
              <option value="yearly">Yearly / വാർഷിക ഫോം</option>
              <option value="special">Special / പ്രത്യേക ഫോം</option>
            </select>
          </div>

          {/* Report For */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Report For / ആർക്കുള്ളത്</label>
            <select
              value={reportFor}
              onChange={e => setReportFor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002349] focus:border-transparent"
            >
              <option value="district">District / ജില്ല</option>
              <option value="area">Area / ഏരിയ</option>
              <option value="unit">Unit / യൂണിറ്റ്</option>
            </select>
          </div>

          {/* District Filter (visible for area/unit reports) */}
          {(reportFor === 'area' || reportFor === 'unit') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">District Filter / ജില്ല ഫിൽറ്റർ</label>
              <select
                value={districtId}
                onChange={e => { setDistrictId(e.target.value); setAreaId(''); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002349] focus:border-transparent"
              >
                <option value="">All Districts</option>
                {districts.map(d => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Area Filter (visible for unit reports when a district is selected) */}
          {reportFor === 'unit' && districtId && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Area Filter / ഏരിയ ഫിൽറ്റർ</label>
              <select
                value={areaId}
                onChange={e => setAreaId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002349] focus:border-transparent"
              >
                <option value="">All Areas</option>
                {areas.map(a => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Report Selector */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Report / ഫോം{reportsLoading && <span className="text-gray-400 ml-1">(loading...)</span>}
            </label>
            <select
              value={reportId}
              onChange={e => setReportId(e.target.value)}
              disabled={reportsLoading || reports.length === 0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002349] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {reportsLoading ? 'Loading reports...' : reports.length === 0 ? 'No reports found for selected filters' : 'Select a report...'}
              </option>
              {reports.map(r => (
                <option key={r._id} value={r._id}>
                  {r.title}
                  {r.month ? ` — ${MONTHS_ML.find(m => m.value === r.month)?.label || r.month}` : ''}
                  {r.year ? ` ${r.year}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleFetch}
            disabled={!reportId || loading}
            className="flex items-center gap-2 px-5 py-2 bg-[#002349] text-white rounded-lg text-sm font-medium hover:bg-[#003366] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? 'Loading...' : 'Fetch Consolidation / കൺസോളിഡേഷൻ എടുക്കുക'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
              <div className="text-2xl font-bold text-[#002349]">{result.stats.total}</div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">Total / ആകെ</div>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 shadow-sm p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{result.stats.submittedCount}</div>
              <div className="text-xs text-green-600 font-medium mt-0.5">Submitted / സബ്മിറ്റ്</div>
            </div>
            <div className="bg-yellow-50 rounded-xl border border-yellow-200 shadow-sm p-3 text-center">
              <div className="text-2xl font-bold text-yellow-700">{result.stats.pendingCount}</div>
              <div className="text-xs text-yellow-600 font-medium mt-0.5">Pending / പെൻഡിംഗ്</div>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-200 shadow-sm p-3 text-center">
              <div className="text-2xl font-bold text-red-700">{result.stats.notStartedCount}</div>
              <div className="text-xs text-red-600 font-medium mt-0.5">Not Started / തുടങ്ങിയിട്ടില്ല</div>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 shadow-sm p-3 text-center col-span-2 sm:col-span-1">
              <div className="text-2xl font-bold text-blue-700">{result.stats.submissionRate}%</div>
              <div className="text-xs text-blue-600 font-medium mt-0.5">Submission Rate</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#002349] truncate mr-4">{result.report?.title}</span>
              <span className="text-sm font-bold text-[#002349] shrink-0">{result.stats.submissionRate}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-700"
                style={{ width: `${result.stats.submissionRate}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-4 mt-2.5 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block shrink-0" />
                {result.stats.submittedCount} Submitted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block shrink-0" />
                {result.stats.pendingCount} Pending
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block shrink-0" />
                {result.stats.notStartedCount} Not Started
              </span>
            </div>
          </div>

          {/* Result Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 flex-wrap gap-2">
              <div className="flex gap-1 flex-wrap">
                {[
                  { key: 'all', label: `All (${result.stats.total})` },
                  { key: 'submitted', label: `Submitted (${result.stats.submittedCount})` },
                  { key: 'pending', label: `Pending (${result.stats.pendingCount})` },
                  { key: 'notStarted', label: `Not Started (${result.stats.notStartedCount})` },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setResultTab(tab.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      resultTab === tab.key
                        ? 'bg-[#002349] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#002349] border border-[#002349] rounded-lg hover:bg-[#002349] hover:text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    {result.report.reportFor !== 'district' && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                    )}
                    {result.report.reportFor === 'unit' && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, i) => (
                      <tr key={row._id || i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-[#002349]">{row.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{row.accessCode}</td>
                        {result.report.reportFor !== 'district' && (
                          <td className="px-4 py-3 text-sm text-gray-600">{row.districtName || '—'}</td>
                        )}
                        {result.report.reportFor === 'unit' && (
                          <td className="px-4 py-3 text-sm text-gray-600">{row.areaName || '—'}</td>
                        )}
                        <td className="px-4 py-3">
                          <StatusBadge status={row._status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {row.submittedAt
                            ? new Date(row.submittedAt).toLocaleDateString('en-IN')
                            : row.startedAt
                              ? new Date(row.startedAt).toLocaleDateString('en-IN')
                              : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
