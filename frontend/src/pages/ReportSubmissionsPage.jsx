import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Menu, X } from 'lucide-react';
import axios from 'axios';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import UnitAdminSidebar from '../components/sidebars/UnitAdminSidebar';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import RowColumnReadonly from '../components/reportRenderer/RowColumnReadonly';
import jihLogo from '../assets/LogoColor.png';

const ReportSubmissionsPage = ({ onLogout }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCrossReport = !id; // no id = cross-report view

  const [report, setReport] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUnitSidebarOpen, setIsUnitSidebarOpen] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Cross-report filters
  const [typeFilter, setTypeFilter] = useState('');
  const [reportForFilter, setReportForFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reportList, setReportList] = useState([]); // for dropdown
  const [selectedReportId, setSelectedReportId] = useState('');

  const ITEMS_PER_PAGE = 15;

  // Load admin data and user data on mount
  useEffect(() => {
    const storedAdminData = localStorage.getItem('adminData');
    if (storedAdminData) {
      setAdminData(JSON.parse(storedAdminData));
    }
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    }
  }, []);

  const isUnitUser = userData?.role === 'unit';
  const isAdminUser = adminData || !userData;

  useEffect(() => {
    loadData();
  }, [id, typeFilter, reportForFilter, statusFilter, selectedReportId]);

  // Load report list for dropdown (cross-report mode)
  useEffect(() => {
    if (!isCrossReport) return;
    const token = localStorage.getItem('adminToken');
    axios.get(`${import.meta.env.VITE_API_URL}/api/admin/reports?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (res.data.success) setReportList(res.data.data || []); })
      .catch(() => {});
  }, [isCrossReport]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('adminToken');

      if (isCrossReport) {
        // Cross-report mode: use new endpoint
        const params = new URLSearchParams();
        if (typeFilter) params.append('reportType', typeFilter);
        if (reportForFilter) params.append('reportFor', reportForFilter);
        if (selectedReportId) params.append('reportId', selectedReportId);
        if (statusFilter) params.append('status', statusFilter);
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/admin/report-submissions?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success) {
          const data = res.data.data || [];
          setSubmissions(data);
          setFilteredSubmissions(data);
        }
      } else {
        // Single-report mode
        const reportResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/admin/reports/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const submissionsResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/admin/reports/${id}/submissions`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (reportResponse.data.success) setReport(reportResponse.data.data);
        if (submissionsResponse.data.success) {
          const data = submissionsResponse.data.data || [];
          setSubmissions(data);
          setFilteredSubmissions(data);
        }
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to load submissions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter submissions based on search
  useEffect(() => {
    let filtered = [...submissions];

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(sub => {
        const user = sub.userId;
        if (!user) return false;
        
        const accessCode = (user.accessCode || '').toLowerCase();
        const districtName = (user.districtName || '').toLowerCase();
        const areaName = (user.areaName || '').toLowerCase();
        const unitName = (user.unitName || '').toLowerCase();
        
        return accessCode.includes(searchLower) ||
               districtName.includes(searchLower) ||
               areaName.includes(searchLower) ||
               unitName.includes(searchLower);
      });
    }

    setFilteredSubmissions(filtered);
    setCurrentPage(1);
  }, [searchTerm, submissions]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserDisplayName = (user, reportFor) => {
    if (!user) return 'Unknown User';
    
    const parts = [];
    if (reportFor === 'district' && user.districtName) {
      parts.push(user.districtName);
    } else if (reportFor === 'area') {
      if (user.districtName) parts.push(user.districtName);
      if (user.areaName) parts.push(user.areaName);
    } else if (reportFor === 'unit') {
      if (user.districtName) parts.push(user.districtName);
      if (user.areaName) parts.push(user.areaName);
      if (user.unitName) parts.push(user.unitName);
    }
    
    return parts.length > 0 ? parts.join(' - ') : user.accessCode || 'N/A';
  };

  const getAnswerForQuestion = (submission, partIndex, questionIndex) => {
    if (!submission || !submission.answers || !Array.isArray(submission.answers)) {
      return null;
    }

    // Try multiple matching strategies for robustness
    const partIdStr = String(partIndex);
    const questionIdStr = String(questionIndex);
    
    const answer = submission.answers.find(
      a => {
        // Try exact string match
        if (String(a.partId) === partIdStr && String(a.questionId) === questionIdStr) {
          return true;
        }
        // Try number comparison (in case stored as numbers)
        if (Number(a.partId) === partIndex && Number(a.questionId) === questionIndex) {
          return true;
        }
        return false;
      }
    );

    return answer ? answer.answer : null;
  };

  const formatAnswer = (answer, question) => {
    if (answer === null || answer === undefined || answer === '') {
      return <span className="text-gray-400 italic">Not answered</span>;
    }
    
    if (Array.isArray(answer)) {
      if (answer.length === 0) {
        return <span className="text-gray-400 italic">Not answered</span>;
      }
      return (
        <div className="flex flex-wrap gap-2">
          {answer.map((item, idx) => (
            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    
    if (typeof answer === 'boolean') {
      return (
        <span className={`px-2 py-1 rounded text-sm font-medium ${
          answer ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {answer ? 'Yes' : 'No'}
        </span>
      );
    }
    
    if (question?.answerType === 'date' && answer) {
      try {
        const date = new Date(answer);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return String(answer);
      }
    }
    
    return <span className="text-gray-900">{String(answer)}</span>;
  };

  // Render a field value from the new pages/formData format, respecting field type
  const renderFieldValue = (field, rawValue) => {
    // ── Table / Row-Column field (renders even when blank, to show static cells) ──
    if (field.type === 'row') {
      return <RowColumnReadonly field={field} value={rawValue} />;
    }

    const isEmpty = rawValue === undefined || rawValue === null || rawValue === '' ||
      (Array.isArray(rawValue) && rawValue.length === 0);

    if (isEmpty) {
      return <span className="text-gray-400 italic text-sm">Not answered</span>;
    }

    // ── Checkbox / Multi-select: array of selected options ──
    if (field.type === 'checkbox' || field.type === 'multiselect') {
      const selected = Array.isArray(rawValue) ? rawValue : [rawValue];
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.map((v, i) => (
            <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
              {String(v)}
            </span>
          ))}
        </div>
      );
    }

    // ── Yes/No or Boolean ──
    if (field.type === 'yesno' || typeof rawValue === 'boolean') {
      const yes = rawValue === true || rawValue === 'Yes';
      return (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${yes ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {yes ? 'Yes' : 'No'}
        </span>
      );
    }

    // ── Select / Radio / Dropdown ──
    if (['select', 'dropdown', 'radio'].includes(field.type)) {
      return (
        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded text-sm font-medium border border-indigo-200">
          {String(rawValue)}
        </span>
      );
    }

    // ── Date / Time ──
    if (field.type === 'date' || field.type === 'datetime') {
      try {
        return <span className="text-sm text-gray-900">{new Date(rawValue).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>;
      } catch {
        return <span className="text-sm text-gray-900">{String(rawValue)}</span>;
      }
    }

    // ── Default: plain string ──
    return <span className="text-sm text-gray-900">{String(rawValue)}</span>;
  };

  const getSubmissionStats = () => {
    const submitted = submissions.filter(s => s.status === 'submitted').length;
    const pending = submissions.filter(s => s.status === 'pending').length;
    return { submitted, pending, total: submissions.length };
  };

  const toggleSubmission = (submissionId) => {
    setExpandedSubmission(expandedSubmission === submissionId ? null : submissionId);
  };

  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSubmissions = filteredSubmissions.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setExpandedSubmission(null);
    setCurrentPage(newPage);
  };

  // Sidebar handlers
  const handleTabChange = (tabId) => {
    if (tabId === 'membership') {
      navigate('/membership', { state: { roleHint: 'admin' } });
      return;
    }
    if (tabId === 'yearly' || tabId === 'monthly' || tabId === 'stats') {
      navigate('/admin-dashboard', { 
        state: { activeTab: tabId } 
      });
    }
  };

  const handleNavigateToReports = () => {
    navigate('/view-reports');
  };

  const handleDownloadCSV = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/forms/export/csv`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `forms_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  const handleNavigateToNotifications = () => {
    navigate('/notifications');
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmUnitLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    setShowLogoutModal(false);
    navigate('/', { replace: true });
  };

  const confirmAdminLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    setShowLogoutModal(false);
    if (onLogout) {
      onLogout();
    }
    navigate('/', { replace: true });
  };

  const cancelLogout = () => setShowLogoutModal(false);

  // Unit user handlers
  const unitId = userData?.unitId || userData?.unit_id || userData?.unit;
  const unitName = userData?.unit || userData?.unitName || '—';
  const unitAreaName = userData?.area || userData?.areaName || '—';
  const unitDashboardPath = unitId ? `/unit-dashboard/${unitId}` : '/unit-dashboard';

  const handleUnitSidebarNavigate = (viewId) => {
    setIsUnitSidebarOpen(false);
    if (viewId === 'notifications') {
      navigate('/notifications', { replace: true });
      return;
    }
    if (viewId === 'dynamic-reports') {
      navigate('/user-reports', { replace: true });
      return;
    }
    navigate(unitDashboardPath, { state: { initialTab: viewId }, replace: true });
  };

  const handleUnitNotificationsShortcut = React.useCallback(() => {
    setIsUnitSidebarOpen(false);
    navigate('/notifications', { replace: true });
  }, [navigate]);

  const handleUnitDynamicShortcut = () => {
    setIsUnitSidebarOpen(false);
    navigate('/user-reports');
  };

  // Helper function to wrap content with unit sidebar layout
  const wrapWithUnitSidebar = (content) => {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
        <UnitAdminSidebar
          activeTab="dynamic-reports"
          onNavigate={handleUnitSidebarNavigate}
          onLogout={handleLogout}
          onNotifications={handleUnitNotificationsShortcut}
          onDynamicReports={handleUnitDynamicShortcut}
          unitName={unitName}
          areaName={unitAreaName}
          districtName={userData?.district || userData?.districtName || ''}
          isMobileOpen={isUnitSidebarOpen}
          onMobileToggle={() => setIsUnitSidebarOpen((prev) => !prev)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="lg:hidden px-4 pt-4">
            <button
              onClick={() => setIsUnitSidebarOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur px-4 py-2 text-sm font-semibold text-[#002349] shadow-md"
            >
              <Menu className="w-4 h-4" />
              <span>Menu</span>
            </button>
          </div>
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-4">
            {content}
          </main>
        </div>
      </div>
    );
  };

  // Helper function to wrap content with sidebar layout
  const wrapWithSidebar = (content) => {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
        <AdminSidebar
          activeTab=""
          onTabChange={handleTabChange}
          onNavigateToReports={handleNavigateToReports}
          onNavigateToMembership={() => navigate('/membership', { state: { roleHint: 'admin' } })}
          onDownloadCSV={handleDownloadCSV}
          onNavigateToNotifications={handleNavigateToNotifications}
          onLogout={handleLogout}
          adminEmail={adminData?.email || 'Admin'}
          totalForms={0}
          totalSurveys={0}
          isMobileOpen={isSidebarOpen}
          onMobileToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
            <div className="flex items-center justify-between px-4 py-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-[#002349] hover:bg-gray-100 rounded-lg p-2 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-2">
                <img src={jihLogo} alt="JIH Logo" className="h-8 w-auto" />
                <h1 className="text-lg font-bold text-[#002349]">Report Submissions</h1>
              </div>
              <div className="w-10" />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-4">
            {content}
          </main>
        </div>
      </div>
    );
  };

  // Get selected submission details if expanded
  const selectedSubmission = expandedSubmission 
    ? filteredSubmissions.find(s => s._id === expandedSubmission)
    : null;

  const pageContent = (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#002349] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      ) : error || (!isCrossReport && !report) ? (
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl shadow-sm">
            <p>{error || 'Report not found'}</p>
            <button
              onClick={() => navigate(isUnitUser ? '/user-reports' : '/view-reports')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Reports
            </button>
          </div>
        </div>
      ) : (
        <>
          {!isCrossReport && expandedSubmission ? (
            /* ── Single-report: Submission detail view ── */
            <>
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSubmission(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#002349]"
                    title="Back to list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-4xl font-bold text-[#002349]">റിപ്പോർട്ട് വിവരങ്ങൾ</h2>
                    {selectedSubmission?.userId && (
                      <p className="text-base font-bold text-[#002349] mt-2">
                        {getUserDisplayName(selectedSubmission.userId, report.reportFor)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {selectedSubmission && (
                <div className="space-y-6 mx-4 md:mx-8 lg:mx-12">
                  {/* ── New format: pages + formData ── */}
                  {report.pages && report.pages.length > 0 ? (
                    report.pages.map((page, pageIdx) => (
                      <div key={pageIdx} className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                        {page.title && (
                          <h3 className="text-lg font-bold text-[#002349] mb-4 border-b pb-2">{page.title}</h3>
                        )}
                        {page.fields && page.fields.length > 0 ? (
                          <div className="space-y-4">
                            {page.fields
                              .filter(f => !['title', 'html'].includes(f.type))
                              .map((field) => {
                                const rawValue = selectedSubmission.formData?.[`field_${field.id}`];
                                return (
                                  <div key={field.id} className="border-l-4 border-[#002349] pl-4 py-2">
                                    <div className="text-sm font-semibold text-gray-700 mb-1">
                                      {field.label}
                                      {field.required && <span className="ml-1 text-red-500 text-xs">*</span>}
                                    </div>
                                    <div className="text-sm text-gray-900">
                                      {renderFieldValue(field, rawValue)}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <p className="text-gray-400 italic text-sm">No fields in this page</p>
                        )}
                      </div>
                    ))
                  ) : report.parts && report.parts.length > 0 ? (
                    /* ── Legacy format: parts + answers ── */
                    report.parts.map((part, partIndex) => (
                      <div key={partIndex} className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                        {part.questions?.length > 0 ? (
                          <div className="space-y-4">
                            {part.questions.map((question, questionIndex) => {
                              const answer = getAnswerForQuestion(selectedSubmission, partIndex, questionIndex);
                              return (
                                <div key={questionIndex} className="border-l-4 border-[#002349] pl-4 py-3">
                                  <div className="flex items-start gap-2 mb-2">
                                    <span className="text-sm font-bold text-[#002349]">Q{questionIndex + 1}:</span>
                                    <span className="text-gray-900 font-semibold flex-1">{question.questionText}</span>
                                    {question.isRequired && (
                                      <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">*Required</span>
                                    )}
                                  </div>
                                  <div className="mt-3">
                                    <span className="text-sm font-semibold text-[#002349]">Answer: </span>
                                    <span className="text-gray-900">{formatAnswer(answer, question)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic text-center py-4">No questions in this part</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 text-center">
                      <p className="text-gray-500 italic">No form structure available to display answers.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="max-w-7xl mx-auto">
              {/* ── Header ── */}
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(isUnitUser ? '/user-reports' : '/view-reports')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#002349]"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-4xl font-bold text-[#002349]">
                    {isCrossReport ? 'All Submissions' : 'റിപ്പോർട്ട് സമർപ്പണങ്ങൾ'}
                  </h2>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by district, area, unit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#002349] focus:border-transparent bg-white shadow-sm"
                  />
                </div>
              </div>

              {/* ── Cross-report filter bar ── */}
              {isCrossReport && (
                <div className="mb-5 flex flex-wrap gap-3 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349]"
                  >
                    <option value="">All Types</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="special">Special</option>
                  </select>
                  <select
                    value={reportForFilter}
                    onChange={(e) => { setReportForFilter(e.target.value); setCurrentPage(1); }}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349]"
                  >
                    <option value="">All Audiences</option>
                    <option value="district">District</option>
                    <option value="area">Area</option>
                    <option value="unit">Unit</option>
                  </select>
                  <select
                    value={selectedReportId}
                    onChange={(e) => { setSelectedReportId(e.target.value); setCurrentPage(1); }}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349] min-w-[180px]"
                  >
                    <option value="">All Reports</option>
                    {reportList.map(r => (
                      <option key={r._id} value={r._id}>{r.title}</option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349]"
                  >
                    <option value="">All Statuses</option>
                    <option value="submitted">Submitted</option>
                    <option value="pending">Pending</option>
                  </select>
                  {(typeFilter || reportForFilter || selectedReportId || statusFilter) && (
                    <button
                      onClick={() => { setTypeFilter(''); setReportForFilter(''); setSelectedReportId(''); setStatusFilter(''); }}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  )}
                  <span className="ml-auto self-center text-sm text-gray-500 font-medium">{filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}</span>
                </div>
              )}

              {/* ── Submissions Table ── */}
              {submissions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                  <p className="text-gray-600 text-lg font-medium">No submissions found</p>
                  <p className="text-gray-500 mt-2 text-sm">
                    {isCrossReport ? 'Try adjusting the filters above.' : "Users haven't submitted any responses yet."}
                  </p>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                  <p className="text-gray-600 text-lg font-medium">No submissions match your search</p>
                  <button onClick={() => setSearchTerm('')} className="mt-4 px-6 py-2.5 bg-[#002349] text-white rounded-xl font-semibold shadow-md hover:bg-[#1a3a5c]">
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-[#002349] to-[#1a3a5c] text-white">
                        <tr>
                          {isCrossReport && (
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Report</th>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                            {!isCrossReport && report
                              ? (report.reportFor === 'district' ? 'District' : report.reportFor === 'area' ? 'District / Area' : 'District / Area / Unit')
                              : 'User'}
                          </th>
                          {isCrossReport && (
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Submitted Date</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedSubmissions.map((submission) => {
                          const user = submission.userId;
                          const reportFor = isCrossReport
                            ? (submission.reportId?.reportFor || 'unit')
                            : report?.reportFor;
                          return (
                            <tr key={submission._id} className="hover:bg-blue-50/40 transition-colors">
                              {isCrossReport && (
                                <td className="px-6 py-4">
                                  <div className="text-sm font-semibold text-[#002349]">
                                    {submission.reportId?.title || '—'}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5 capitalize">
                                    {submission.reportId?.type || ''}{submission.reportId?.reportFor ? ` · ${submission.reportId.reportFor}` : ''}
                                  </div>
                                </td>
                              )}
                              <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-[#002349]">
                                  {getUserDisplayName(user, reportFor)}
                                </div>
                              </td>
                              {isCrossReport && (
                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    submission.status === 'submitted'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {submission.status}
                                  </span>
                                </td>
                              )}
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {formatDate(submission.submittedAt || submission.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {!isCrossReport ? (
                                  <button
                                    onClick={() => toggleSubmission(submission._id)}
                                    className="text-[#002349] hover:text-[#1a3a5c] font-semibold"
                                  >
                                    View Details
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => navigate(`/report-submissions/${submission.reportId?._id || submission.reportId}`)}
                                    className="text-[#002349] hover:text-[#1a3a5c] font-semibold"
                                  >
                                    View Report
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Pagination ── */}
              {filteredSubmissions.length > ITEMS_PER_PAGE && (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
                  <div>
                    Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredSubmissions.length)} of {filteredSubmissions.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Prev</button>
                    <span className="font-semibold text-[#002349]">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={cancelLogout}
        onConfirm={isUnitUser ? confirmUnitLogout : confirmAdminLogout}
        title={isUnitUser ? "ലോഗൗട്ട്" : "Logout"}
        message={isUnitUser ? "താങ്കൾ ലോഗൗട്ട് ചെയ്യാൻ തീർച്ചയാണോ?" : "Are you sure you want to logout from the admin dashboard?"}
        confirmText={isUnitUser ? "ലോഗൗട്ട്" : "Logout"}
        cancelText={isUnitUser ? "റദ്ദാക്കുക" : "Cancel"}
        type="logout"
      />
    </>
  );

  if (isUnitUser) {
    return wrapWithUnitSidebar(pageContent);
  }

  return wrapWithSidebar(pageContent);
};

export default ReportSubmissionsPage;

