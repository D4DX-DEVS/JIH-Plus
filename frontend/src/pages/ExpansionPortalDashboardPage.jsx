import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';
import {
  MapPin, FileText, CheckCircle2, Clock, LayoutDashboard, LogOut, X,
  Building2, Map, Layers, TrendingUp, ArrowRight
} from 'lucide-react';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import SubmissionsAnalytics from '../components/dashboard/SubmissionsAnalytics';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import jihLogo from '../assets/LogoColor.png';
import MobileTopBar from '../components/sidebars/MobileTopBar';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const COLORS = {
  primary: '#002349',
  blue: '#3B82F6',
  green: '#10B981',
  amber: '#F59E0B',
  purple: '#8B5CF6',
  pink: '#EC4899',
  red: '#EF4444',
  teal: '#14B8A6',
};

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2.5 sm:p-5 flex flex-col sm:flex-row items-start gap-1.5 sm:gap-4">
    <div className="p-1.5 sm:p-3 rounded-lg flex-shrink-0" style={{ backgroundColor: `${color}1A` }}>
      <Icon className="w-4 h-4 sm:w-6 sm:h-6" style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide leading-tight">{label}</p>
      <p className="text-lg sm:text-2xl font-bold text-gray-800 mt-0.5">{value ?? '—'}</p>
      {sub && <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
  if (value === 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {value}
    </text>
  );
};

export default function ExpansionPortalDashboardPage({ onLogout }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeReportsList, setActiveReportsList] = useState([]);
  const [activeReportsLoading, setActiveReportsLoading] = useState(true);

  const handleLogoutClick = () => setShowLogoutModal(true);
  const confirmLogout = () => {
    setShowLogoutModal(false);
    if (onLogout) onLogout();
  };

  useEffect(() => {
    const stored = localStorage.getItem('adminData');
    if (stored) {
      try { setAdminData(JSON.parse(stored)); } catch (_) {}
    }
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API_BASE_URL}/api/admin/dashboard/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError('ഡാറ്റ ലോഡ് ചെയ്യുന്നതിൽ പിശകുണ്ടായി');
      }
    } catch (err) {
      setError('ഡാറ്റ ലോഡ് ചെയ്യുന്നതിൽ പിശകുണ്ടായി');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    const fetchActiveReports = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await axios.get(`${API_BASE_URL}/api/admin/reports`, {
          params: { isActive: true, limit: 50 },
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) setActiveReportsList(res.data.data || []);
      } catch (err) {
        console.error('Active reports list error:', err);
      } finally {
        setActiveReportsLoading(false);
      }
    };
    fetchActiveReports();
  }, []);

  const reportForLabel = (level) => (
    { district: 'ജില്ല', area: 'ഏരിയ', unit: 'യൂണിറ്റ്' }[level] || level
  );

  // Chart data derived from API data
  const locationChartData = data ? [
    { name: 'ജില്ല', value: data.locations.districts, fill: COLORS.primary },
    { name: 'ഏരിയ', value: data.locations.areas, fill: COLORS.blue },
    { name: 'യൂണിറ്റ്', value: data.locations.units, fill: COLORS.teal },
  ] : [];

  const reportsByLevelData = data ? [
    { name: 'ജില്ല', count: data.reports.byLevel.district },
    { name: 'ഏരിയ', count: data.reports.byLevel.area },
    { name: 'യൂണിറ്റ്', count: data.reports.byLevel.unit },
  ] : [];

  const reportsByTypeData = data ? [
    { name: 'വാർഷിക', value: data.reports.byType.yearly, fill: COLORS.primary },
    { name: 'പ്രതിമാസ', value: data.reports.byType.monthly, fill: COLORS.blue },
    { name: 'സ്പെഷ്യൽ', value: data.reports.byType.special, fill: COLORS.amber },
  ] : [];

  const submissionData = data ? [
    { name: 'സമർപ്പിച്ചത്', value: data.submissions.submitted, fill: COLORS.green },
    { name: 'കാത്തിരിക്കുന്നത്', value: data.submissions.pending, fill: COLORS.amber },
  ] : [];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        activeTab="dashboard"
        onTabChange={(tab) => navigate('/admin-dashboard')}
        onNavigateToReports={() => navigate('/view-reports')}
        onNavigateToNotifications={() => navigate('/notifications')}
        onLogout={handleLogoutClick}
        adminData={adminData}
        isMobileOpen={isSidebarOpen}
        onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar
          title="ഡാഷ്ബോർഡ്"
        />

        {/* Desktop top bar */}
        <header className="hidden lg:flex bg-white border-b border-gray-200 px-4 py-3 items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-[#002349]" />
            <h1 className="text-base font-semibold text-gray-800">ഡാഷ്ബോർഡ്</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <img src={jihLogo} alt="JIH" className="h-7 w-auto object-contain opacity-80" />
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 pt-4 md:pt-6 pb-24 lg:pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#002349]" />
            </div>
          ) : error || !data ? (
            <div className="flex flex-col items-center gap-4 text-center text-red-500 mt-16">
              <p>{error || 'ഡാറ്റ ലോഡ് ചെയ്യുന്നതിൽ പിശകുണ്ടായി'}</p>
              <button
                onClick={fetchOverview}
                className="min-h-[44px] px-4 py-2 bg-[#002349] text-white rounded-lg text-sm font-medium hover:bg-[#1a3a5c] transition-colors"
              >
                വീണ്ടും ശ്രമിക്കുക
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Section: Location Overview */}
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> ലൊക്കേഷൻ ഓവർവ്യൂ
                </h2>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  <StatCard icon={Building2} label="ജില്ലകൾ" value={data.locations.districts} color={COLORS.primary} />
                  <StatCard icon={Map} label="ഏരിയകൾ" value={data.locations.areas} color={COLORS.blue} />
                  <StatCard icon={Layers} label="യൂണിറ്റുകൾ" value={data.locations.units} color={COLORS.teal} />
                  <StatCard icon={MapPin} label="മൊത്തം ലൊക്കേഷൻ" value={data.locations.total} color={COLORS.purple} />
                </div>
              </section>

              {/* Section: Submission Analytics */}
              <section>
                <SubmissionsAnalytics scope="admin" />
              </section>

              {/* Section: Reports Overview */}
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> ആക്ടീവ് റിപ്പോർട്ടുകൾ
                </h2>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  <StatCard icon={FileText} label="ആകെ ആക്ടീവ്" value={data.reports.total} color={COLORS.primary} />
                  <StatCard icon={Building2} label="ജില്ലക്ക്" value={data.reports.byLevel.district} color={COLORS.blue} />
                  <StatCard icon={Map} label="ഏരിയക്ക്" value={data.reports.byLevel.area} color={COLORS.teal} />
                  <StatCard icon={Layers} label="യൂണിറ്റിന്" value={data.reports.byLevel.unit} color={COLORS.amber} />
                </div>
              </section>

              {/* Section: Active Reports List */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <FileText className="w-4 h-4" /> ആക്ടീവ് റിപ്പോർട്ടുകൾ
                  </h2>
                  <button
                    onClick={() => navigate('/view-reports')}
                    className="inline-flex min-h-[44px] items-center px-2 -mx-2 -my-3 text-xs font-semibold text-[#002349] hover:underline"
                  >
                    എല്ലാം കാണുക
                  </button>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  {activeReportsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#002349]" />
                    </div>
                  ) : activeReportsList.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                      ആക്ടീവ് റിപ്പോർട്ടുകൾ ഒന്നും ഇല്ല
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeReportsList.map((report) => (
                        <div
                          key={report._id}
                          className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{report.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                                {report.type}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800">
                                {reportForLabel(report.reportFor)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(`/view-report/${report._id}`)}
                            className="flex-shrink-0 inline-flex min-h-[44px] items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#002349] text-white text-xs font-semibold hover:bg-[#1a3a5c] transition-colors"
                          >
                            കാണുക <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Section: Submissions */}
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> സബ്മിഷൻ സ്റ്റാറ്റസ്
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard icon={TrendingUp} label="ആകെ" value={data.submissions.total} color={COLORS.primary} />
                  <StatCard icon={CheckCircle2} label="സമർപ്പിച്ചത്" value={data.submissions.submitted} color={COLORS.green} />
                  <StatCard icon={Clock} label="കാത്തിരിക്കുന്നത്" value={data.submissions.pending} color={COLORS.amber} />
                </div>
              </section>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Locations Distribution Pie */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">ലൊക്കേഷൻ വിതരണം</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={locationChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        labelLine={false}
                        label={renderCustomLabel}
                      >
                        {locationChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Reports by Level Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">ലെവൽ അനുസരിച്ച് ആക്ടീവ് റിപ്പോർട്ടുകൾ</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={reportsByLevelData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="റിപ്പോർട്ടുകൾ" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Reports by Type Pie */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">തരം അനുസരിച്ച് റിപ്പോർട്ടുകൾ</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={reportsByTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        dataKey="value"
                        label={renderCustomLabel}
                        labelLine={false}
                      >
                        {reportsByTypeData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Submission Status Pie */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">സബ്മിഷൻ സ്റ്റാറ്റസ്</h3>
                  {data.submissions.total === 0 ? (
                    <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
                      ഒരു സബ്മിഷനും ഇല്ല
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={submissionData}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          label={renderCustomLabel}
                          labelLine={false}
                        >
                          {submissionData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Summary Bar: reports by level + type combined */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">ലെവൽ & തരം അനുസരിച്ച് സമഗ്ര ദർശനം</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={[
                      {
                        name: 'ജില്ല',
                        വാർഷിക: data.reports.byLevel.district,
                        ആകെ: data.reports.byLevel.district
                      },
                      {
                        name: 'ഏരിയ',
                        വാർഷിക: data.reports.byLevel.area,
                        ആകെ: data.reports.byLevel.area
                      },
                      {
                        name: 'യൂണിറ്റ്',
                        വാർഷിക: data.reports.byLevel.unit,
                        ആകെ: data.reports.byLevel.unit
                      },
                    ]}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ആകെ" name="ആക്ടീവ് റിപ്പോർട്ടുകൾ" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </main>
      </div>

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        type="logout"
      />
    </div>
  );
}
