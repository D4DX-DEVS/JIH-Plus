import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  SendHorizontal,
  Save,
  AlertCircle,
  Pencil,
  Trash2,
  Eye,
  Download,
  FileText
} from 'lucide-react';
import DistrictAdminSidebar from '../components/sidebars/DistrictAdminSidebar';
import AreaAdminSidebar from '../components/sidebars/AreaAdminSidebar';
import UnitAdminSidebar from '../components/sidebars/UnitAdminSidebar';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import DynamicFormRenderer from '../components/reportRenderer/DynamicFormRenderer';
import SubmissionPreviewModal from '../components/reportRenderer/SubmissionPreviewModal';
import { downloadDynamicReportPdf } from '../utils/dynamicReportPdfGenerator';
import MobileTopBar from '../components/sidebars/MobileTopBar';

const statusBadgeClass = (status) => {
  if (status === 'submitted') {
    return 'bg-green-100 text-green-800 border border-green-200';
  }
  return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
};

const typeBadgeClass = (type) => {
  if (type === 'monthly') {
    return 'bg-blue-100 text-blue-800';
  }
  if (type === 'special') {
    return 'bg-purple-100 text-purple-800';
  }
  return 'bg-gray-100 text-gray-800';
};

const UserReportsPage = ({ onBack, userData }) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const navigate = useNavigate();
  const location = useLocation();
  const [reports, setReports] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentPageInfo, setCurrentPageInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeType, setActiveType] = useState(location.state?.initialType || ''); // 'monthly' | 'yearly' | 'special' | ''
  const [statusFilter, setStatusFilter] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isDistrictSidebarOpen, setIsDistrictSidebarOpen] = useState(false);
  const [isAreaSidebarOpen, setIsAreaSidebarOpen] = useState(false);
  const [isUnitSidebarOpen, setIsUnitSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null); // { report, submission }
  const [downloadingId, setDownloadingId] = useState(null);

  const storedUserData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('userData') || '{}');
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return {};
    }
  }, []);

  const resolvedUserData = userData || storedUserData;
  const isDistrictUser = resolvedUserData?.role === 'district';
  const isAreaUser = resolvedUserData?.role === 'area';
  const isUnitUser = resolvedUserData?.role === 'unit';
  const districtDashboardPath = resolvedUserData?.districtId ? `/district-dashboard/${resolvedUserData.districtId}` : '/district-dashboard';
  const districtName = resolvedUserData?.district || resolvedUserData?.districtName || '—';
  const areaId =
    resolvedUserData?.areaId ||
    resolvedUserData?.area_id ||
    resolvedUserData?.areaCode ||
    resolvedUserData?.area;
  const areaDashboardPath = areaId ? `/area-dashboard/${areaId}` : '/area-dashboard';
  const areaName =
    resolvedUserData?.area ||
    resolvedUserData?.areaName ||
    resolvedUserData?.districtArea ||
    '—';

  const areaTabStateMap = {
    monthly: { initialTab: 'monthly' },
    units: { initialTab: 'units' },
    stats: { initialTab: 'stats' },
    membership: { initialTab: 'membership' }
  };

  const goToAreaDashboard = (tabId) => {
    const state = areaTabStateMap[tabId] ? { ...areaTabStateMap[tabId] } : {};
    if (tabId === 'notifications') {
      state.showNotifications = true;
    }
    navigate(areaDashboardPath, { state });
  };

  const handleReportTypeSelect = (type) => {
    setActiveType(type);
    setSelectedReport(null);
    setSelectedReportId(null);
    setAnswers({});
    setSubmissionInfo(null);
    setCurrentPageInfo(null);
  };

  // activeTab/view for sidebars: show the selected type tab as active
  const sidebarActiveReportTab = activeType ? `${activeType}-report-type` : '';

  const handleAreaSidebarNavigate = (viewId) => {
    setIsAreaSidebarOpen(false);
    if (viewId === 'dynamic-reports') {
      return;
    }
    if (viewId === 'notifications') {
      navigate('/notifications', { replace: true });
      return;
    }
    if (viewId === 'membership') {
      navigate('/membership', { state: { roleHint: 'area' } });
      return;
    }
    goToAreaDashboard(viewId);
  };

  const handleAreaDynamicShortcut = () => setIsAreaSidebarOpen(false);
  const handleAreaNotificationsShortcut = () => {
    setIsAreaSidebarOpen(false);
    navigate('/notifications', { replace: true });
  };

  const handleAreaNavigateToMembership = () => {
    setIsAreaSidebarOpen(false);
    navigate('/membership', { state: { roleHint: 'area' } });
  };

  const handleAreaLogout = () => {
    setShowLogoutModal(true);
  };

  // Unit user handlers
  const unitId = resolvedUserData?.unitId || resolvedUserData?.unit_id || resolvedUserData?.unit;
  const unitName = resolvedUserData?.unit || resolvedUserData?.unitName || '—';
  const unitAreaName = resolvedUserData?.area || resolvedUserData?.areaName || '—';
  const unitDashboardPath = unitId ? `/unit-dashboard/${unitId}` : '/unit-dashboard';

  const handleDistrictSidebarNavigate = (viewId) => {
    setIsDistrictSidebarOpen(false);
    if (viewId === 'membership') {
      navigate('/membership', { state: { roleHint: 'district' } });
      return;
    }
    if (viewId === 'notifications') {
      navigate('/notifications', { replace: true });
      return;
    }
    if (viewId === 'reports') {
      // Already on dynamic reports; stay here
      return;
    }
    navigate(districtDashboardPath, { state: { activeView: viewId } });
  };

  const goToUnitDashboard = (tabId) => {
    navigate(unitDashboardPath, { state: { initialTab: tabId } });
  };

  const handleUnitSidebarNavigate = (viewId) => {
    setIsUnitSidebarOpen(false);
    if (viewId === 'dynamic-reports') {
      return;
    }
    if (viewId === 'notifications') {
      navigate('/notifications', { replace: true });
      return;
    }
    if (viewId === 'membership') {
      navigate('/membership', { state: { roleHint: 'unit' } });
      return;
    }
    goToUnitDashboard(viewId);
  };

  const handleUnitDynamicShortcut = () => setIsUnitSidebarOpen(false);
  const handleUnitNotificationsShortcut = () => {
    setIsUnitSidebarOpen(false);
    navigate('/notifications', { replace: true });
  };

  const handleUnitLogout = () => {
    setShowLogoutModal(true);
  };

  const loadReports = async () => {
    try {
      setListLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) {
        setFeedback({ type: 'error', message: 'Session expired. Please login again.' });
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/user/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.success) {
        setReports(response.data.data || []);
      } else {
        setFeedback({ type: 'error', message: response.data?.message || 'Failed to load reports' });
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Unable to load reports. Please try again.'
      });
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Preselect a report when navigated here directly from a dashboard's "Active Reports" section
  useEffect(() => {
    const preselectReportId = location.state?.reportId;
    if (preselectReportId) {
      handleSelectReport(preselectReportId);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const populateAnswersFromSubmission = (submission) => {
    if (!submission) { setAnswers({}); return; }
    // New format: formData
    if (submission.formData && typeof submission.formData === 'object' && Object.keys(submission.formData).length > 0) {
      setAnswers(submission.formData);
      return;
    }
    // Legacy: answers array
    if (!Array.isArray(submission.answers)) { setAnswers({}); return; }
    const mapped = {};
    submission.answers.forEach((answer) => {
      if (answer?.partId !== undefined && answer?.questionId !== undefined &&
          !Number.isNaN(Number(answer.partId)) && !Number.isNaN(Number(answer.questionId))) {
        mapped[`${answer.partId}_${answer.questionId}`] = answer.answer;
      }
    });
    setAnswers(mapped);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Try to redirect to appropriate dashboard based on user role
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (userData.districtId) {
        window.location.href = `/district-dashboard/${userData.districtId}`;
      } else if (userData.areaId) {
        window.location.href = `/area-dashboard/${userData.areaId}`;
      } else if (userData.unitId) {
        window.location.href = `/unit-dashboard/${userData.unitId}`;
      } else {
        window.location.href = '/';
      }
    }
  };

  const handleSelectReport = async (reportId, options = {}) => {
    const { force = false } = options;
    if (!force && reportId === selectedReportId) return;
    setSelectedReportId(reportId);
    setFeedback({ type: '', message: '' });
    setDetailLoading(true);
    setSelectedReport(null);
    setAnswers({});
    setSubmissionInfo(null);
    setIsEditing(false);
    setCurrentPageInfo(null);

    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        setFeedback({ type: 'error', message: 'Session expired. Please login again.' });
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_BASE_URL}/api/user/reports/${reportId}/view`, {
        headers
      });

      if (!response.data?.success || !response.data.data) {
        setFeedback({
          type: 'error',
          message: response.data?.message || 'Unable to load report details.'
        });
        return;
      }

      const { report, submission } = response.data.data;
      setSelectedReport(report);
      if (submission) {
        setSubmissionInfo(submission);
        populateAnswersFromSubmission(submission);
      }
    } catch (error) {
      console.error('Error loading report detail:', error);
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Unable to load report detail.'
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEditFromList = async (reportId) => {
    await handleSelectReport(reportId, { force: true });
    setIsEditing(true);
  };

  const openDeleteModal = (reportId, title) => {
    setDeleteTarget({ id: reportId, title });
    setShowDeleteModal(true);
  };

  const openPreview = async (reportId) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        setFeedback({ type: 'error', message: 'Session expired. Please login again.' });
        setPreviewOpen(false);
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/user/reports/${reportId}/view`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.success && response.data.data) {
        setPreviewData(response.data.data);
      } else {
        setFeedback({ type: 'error', message: response.data?.message || 'Unable to load submission preview.' });
        setPreviewOpen(false);
      }
    } catch (error) {
      console.error('Error loading submission preview:', error);
      setFeedback({ type: 'error', message: error.response?.data?.message || 'Unable to load submission preview.' });
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewData(null);
  };

  const handleDownloadPdf = async (reportId) => {
    setDownloadingId(reportId);
    setFeedback({ type: '', message: '' });
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        setFeedback({ type: 'error', message: 'Session expired. Please login again.' });
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/user/reports/${reportId}/view`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { report, submission } = response.data?.data || {};
      if (!response.data?.success || !submission) {
        setFeedback({ type: 'error', message: 'No submission found to download.' });
        return;
      }
      await downloadDynamicReportPdf(report, submission, resolvedUserData);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setFeedback({ type: 'error', message: error.response?.data?.message || 'Failed to generate PDF.' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreviewDownload = async () => {
    if (!previewData?.report || !previewData?.submission) return;
    setDownloadingId(previewData.report._id);
    try {
      await downloadDynamicReportPdf(previewData.report, previewData.submission, resolvedUserData);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setFeedback({ type: 'error', message: 'Failed to generate PDF.' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleAnswerChange = (key, value) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleCheckboxValue = (key, option) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      if (current.includes(option)) {
        return { ...prev, [key]: current.filter((item) => item !== option) };
      }
      return { ...prev, [key]: [...current, option] };
    });
  };

  const buildPayloadAnswers = () => {
    if (!selectedReport) return [];
    const payload = [];
    selectedReport.parts.forEach((part, partIndex) => {
      part.questions.forEach((question, questionIndex) => {
        const key = `${partIndex}_${questionIndex}`;
        let value = answers[key];
        if (value === undefined || value === null || value === '') {
          return;
        }
        if (question.answerType === 'number') {
          const parsed = Number(value);
          if (!Number.isNaN(parsed)) {
            value = parsed;
          }
        }
        payload.push({
          partId: String(partIndex),
          questionId: String(questionIndex),
          answer: question.answerType === 'checkbox' ? value || [] : value
        });
      });
    });
    return payload;
  };

  const validateRequiredAnswers = () => {
    if (!selectedReport) return [];
    const missing = [];
    selectedReport.parts.forEach((part, partIndex) => {
      part.questions.forEach((question, questionIndex) => {
        if (!question.isRequired) return;
        const key = `${partIndex}_${questionIndex}`;
        const value = answers[key];
        const isEmpty =
          value === undefined ||
          value === null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
          missing.push(`${part.partName || `Part ${partIndex + 1}`}: ${question.questionText}`);
        }
      });
    });
    return missing;
  };

  const submitReport = async (desiredStatus = 'submitted', formDataOverride = null, lastPageOverride = null) => {
    if (!selectedReport) return;
    setFeedback({ type: '', message: '' });

    const isNewFormat = selectedReport.pages && selectedReport.pages.length > 0;

    // For legacy format, validate required answers
    if (!isNewFormat && desiredStatus === 'submitted') {
      const missingRequired = validateRequiredAnswers();
      if (missingRequired.length > 0) {
        setFeedback({
          type: 'error',
          message: `Please answer all required questions. Missing: ${missingRequired.slice(0, 3).join(', ')}${missingRequired.length > 3 ? '...' : ''}`
        });
        return;
      }
    }

    try {
      setSubmitLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) { setFeedback({ type: 'error', message: 'Session expired. Please login again.' }); return; }

      const hasExistingSubmission = Boolean(submissionInfo);
      const endpoint = hasExistingSubmission
        ? `${API_BASE_URL}/api/user/reports/${selectedReport._id}/submission`
        : `${API_BASE_URL}/api/user/reports/${selectedReport._id}/submit`;
      const method = hasExistingSubmission ? 'put' : 'post';

      let body;
      if (isNewFormat) {
        // New format: send formData
        body = { formData: formDataOverride || answers, status: desiredStatus };
        if (Number.isInteger(lastPageOverride)) {
          body.lastPage = lastPageOverride;
        }
      } else {
        // Legacy format: send answers array
        const payloadAnswers = buildPayloadAnswers();
        body = { answers: payloadAnswers, status: desiredStatus, extra: submissionInfo?.extra || {} };
      }

      const response = await axios[method](endpoint, body, { headers: { Authorization: `Bearer ${token}` } });

      if (response.data?.success) {
        setFeedback({
          type: 'success',
          message:
            desiredStatus === 'submitted'
              ? 'Report submitted successfully.'
              : 'Draft saved successfully.'
        });
        const newSubmission = response.data.data;
        setSubmissionInfo(newSubmission);
        populateAnswersFromSubmission(newSubmission);
        setIsEditing(false);
        setReports((prev) =>
          prev.map((report) =>
            report._id === selectedReport._id
              ? { ...report, status: desiredStatus === 'submitted' ? 'submitted' : 'pending' }
              : report
          )
        );
        await handleSelectReport(selectedReport._id, { force: true });
      } else {
        setFeedback({
          type: 'error',
          message: response.data?.message || 'Unable to submit report.'
        });
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Failed to submit the report.'
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const reportCounts = useMemo(() => {
    if (listLoading) return null;
    return {
      monthly: reports.filter(r => r.type === 'monthly').length,
      quarterly: reports.filter(r => r.type === 'quarterly').length,
      yearly: reports.filter(r => r.type === 'yearly').length,
      special: reports.filter(r => r.type === 'special').length,
    };
  }, [reports, listLoading]);

  const filteredReports = useMemo(() => {
    return reports
      .filter((report) =>
        `${report.title} ${report.type}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((report) => (activeType ? report.type === activeType : true))
      .filter((report) =>
        statusFilter ? (statusFilter === 'submitted' ? report.status === 'submitted' : report.status !== 'submitted') : true
      );
  }, [reports, searchTerm, activeType, statusFilter]);

  // The report's "reportFor" field only tells us the target user type
  // (unit/area/district). Show the viewer's own entity name instead.
  const targetEntityName = isDistrictUser
    ? districtName
    : isAreaUser
      ? areaName
      : isUnitUser
        ? unitName
        : '';

  const pageContent = (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          {selectedReport && (
            <button
              onClick={() => {
                setSelectedReport(null);
                setSelectedReportId(null);
                setAnswers({});
                setSubmissionInfo(null);
                setIsEditing(false);
                setCurrentPageInfo(null);
              }}
              className="inline-flex items-center justify-center p-2 rounded-lg text-[#002349] hover:bg-gray-100 transition-colors"
              title="Back to Reports List"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-[#002349] break-words">റിപ്പോർട്ട് ശേഖരണം</h1>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-2 sm:p-3 shadow-sm">
            <span className="flex h-7 w-7 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#002349]/10 text-[#002349]">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-base sm:text-xl font-bold text-[#002349] leading-none">{reports.length}</p>
              <p className="text-[9px] sm:text-[11px] leading-tight text-gray-500 mt-0.5">ആകെ</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl border border-green-200 bg-green-50 p-2 sm:p-3 shadow-sm">
            <span className="flex h-7 w-7 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-base sm:text-xl font-bold text-green-700 leading-none">
                {reports.filter((r) => r.status === 'submitted').length}
              </p>
              <p className="text-[9px] sm:text-[11px] leading-tight text-green-700/70 mt-0.5">സമർപ്പിച്ചത്</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl border border-amber-200 bg-amber-50 p-2 sm:p-3 shadow-sm">
            <span className="flex h-7 w-7 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-base sm:text-xl font-bold text-amber-700 leading-none">
                {reports.filter((r) => r.status !== 'submitted').length}
              </p>
              <p className="text-[9px] sm:text-[11px] leading-tight text-amber-700/70 mt-0.5">ബാക്കിയായത്</p>
            </div>
          </div>
        </div>
      </div>

      {feedback.message && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-800'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {feedback.message}
        </div>
      )}

      {!selectedReport && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or type..."
                className="w-full h-10 pl-10 pr-4 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all duration-300 hover:border-[#002349]/50 bg-white shadow-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 border border-gray-300 rounded-xl px-3 text-sm focus:ring-2 focus:ring-[#002349] focus:border-[#002349] bg-white shadow-sm w-full sm:w-auto"
            >
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden min-w-0">
            {listLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-600 text-sm">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Loading reports...
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="py-12 px-6 text-center text-gray-600 text-sm">
                No reports found. Try adjusting your search.
              </div>
            ) : (
              <>
                {/* Mobile: report name + a single Open action only — the full
                    table needs horizontal scroll to reach the action column,
                    which is a critical UX problem on small screens. */}
                <div className="sm:hidden divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <div key={report._id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <p className="flex-1 min-w-0 text-sm font-semibold text-[#002349] break-words">{report.title}</p>
                      <button
                        onClick={() => handleSelectReport(report._id)}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#002349] text-white font-semibold text-xs shadow-sm hover:bg-[#1a3a5c] transition-colors"
                      >
                        Open Report
                      </button>
                    </div>
                  ))}
                </div>

                {/* Tablet / desktop: full detail table */}
                <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gradient-to-r from-[#002349] to-[#1a3a5c] text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Report</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Parts / Qs</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredReports.map((report) => (
                      <tr
                        key={report._id}
                        className="hover:bg-gradient-to-br hover:from-[#002349]/5 hover:to-[#957C3D]/5 transition-all duration-300"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-[#002349]">{report.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize inline-flex items-center justify-center ${typeBadgeClass(
                              report.type
                            )}`}
                          >
                            {report.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {report.legacy ? (
                            <>
                              <div className="text-sm text-gray-800">{report.pageCount ?? 0} / {report.questionsCount || 0}</div>
                              <p className="text-[11px] text-gray-500">Parts / Questions</p>
                            </>
                          ) : (
                            <>
                              <div className="text-sm text-gray-800">{report.pageCount ?? 0}p · {report.fieldCount ?? 0}f</div>
                              <p className="text-[11px] text-gray-500">Pages / Fields</p>
                            </>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center ${statusBadgeClass(
                              report.status
                            )}`}
                          >
                            {report.status === 'submitted' ? (
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Submitted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {report.status === 'submitted' ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openPreview(report._id)}
                                title="Preview Submission"
                                className="p-2 rounded-lg text-[#002349] hover:bg-gray-100 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadPdf(report._id)}
                                title="Download PDF"
                                disabled={downloadingId === report._id}
                                className="p-2 rounded-lg text-[#002349] hover:bg-gray-100 transition-colors disabled:opacity-50"
                              >
                                {downloadingId === report._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleEditFromList(report._id)}
                                title="Edit Submission"
                                className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(report._id, report.title)}
                                title="Delete Submission"
                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSelectReport(report._id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#002349] text-white font-semibold text-sm shadow-sm hover:bg-[#1a3a5c] hover:shadow-md transition-all duration-200"
                            >
                              Open Report
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {detailLoading && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center text-gray-600">
          <Loader2 className="w-6 h-6 mb-3 animate-spin inline-block" />
          Loading report details...
        </div>
      )}

      {!detailLoading && selectedReport && (() => {
        const isNewFormat = selectedReport.pages && selectedReport.pages.length > 0;
        const currentStatus = submissionInfo?.status || reports.find(r => r._id === selectedReportId)?.status;
        const isSubmitted = currentStatus === 'submitted';
        const isReadOnly = isSubmitted && !isEditing;

        return (
          <div className="space-y-5">
            {/* Report header */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-4 sm:p-6 space-y-3">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-medium truncate">
                    {targetEntityName || selectedReport.reportFor || 'REPORT'}
                  </p>
                  <h2 className="text-lg sm:text-xl font-bold text-[#002349] mt-1">{selectedReport.title}</h2>
                  {selectedReport.description && <p className="text-sm text-gray-600 mt-1">{selectedReport.description}</p>}
                  {isNewFormat && currentPageInfo?.title && (
                    <p className="text-base sm:text-lg font-semibold text-[#957C3D] mt-2">
                      {currentPageInfo.title}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize inline-flex items-center justify-center ${typeBadgeClass(selectedReport.type)}`}>
                    {selectedReport.type}
                  </span>
                  {currentStatus && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center ${statusBadgeClass(currentStatus)}`}>
                      {currentStatus === 'submitted'
                        ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Submitted</span>
                        : <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>}
                    </span>
                  )}
                </div>
              </div>
              {submissionInfo?.submittedAt && (
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700">
                  Last submitted on {new Date(submissionInfo.submittedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              )}
            </div>

            {/* Form content */}
            {isNewFormat ? (
              // New multi-page format — use DynamicFormRenderer
              <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
                <DynamicFormRenderer
                  key={selectedReport._id + (submissionInfo?._id || 'new')}
                  report={selectedReport}
                  initialData={answers}
                  initialPage={submissionInfo?.lastPage || 0}
                  disabled={isReadOnly}
                  onPageChange={(index, page) => setCurrentPageInfo({ index, title: page?.title || '' })}
                  onSaveDraft={(formData, pageIdx) => submitReport('pending', formData, pageIdx)}
                  onSubmit={(formData, pageIdx) => submitReport('submitted', formData, pageIdx)}
                  submitting={submitLoading}
                  allowSubmitOnEveryPage={isSubmitted && isEditing}
                  onCancelEdit={isSubmitted && isEditing ? () => setIsEditing(false) : undefined}
                />
                {isSubmitted && !isEditing && (
                  <div className="p-4 border-t border-gray-100 space-y-3">
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">റിപ്പോർട്ട് വിജയകരമായി സമർപ്പിച്ചു!</p>
                        <p className="text-green-600 text-xs mt-0.5">Your report has been submitted successfully.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <button onClick={() => setIsEditing(true)} className="px-4 py-2 rounded-xl border border-blue-200 text-sm font-semibold text-blue-700 hover:bg-blue-50 flex items-center gap-2">
                        <Pencil className="w-4 h-4" /> Edit Submission
                      </button>
                      <button onClick={() => openDeleteModal(selectedReport._id, selectedReport.title)} disabled={submitLoading} className="px-4 py-2 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-60">
                        <Trash2 className="w-4 h-4" /> Delete Submission
                      </button>
                    </div>
                  </div>
                )}
                {isSubmitted && isEditing && (
                  <div className="p-4 border-t border-gray-100">
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Editing a submitted report. Use the Submit button above to update.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Legacy parts-based format
              <>
                {selectedReport.parts?.map((part, partIndex) => (
                  <div key={partIndex} className="border border-gray-100 rounded-2xl p-4 sm:p-5 bg-white shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Section {partIndex + 1}</p>
                        <h3 className="text-lg font-semibold text-[#002349]">{part.partName || 'Unnamed Section'}</h3>
                      </div>
                      <span className="text-xs text-gray-500">Questions: {part.questions?.length || 0}</span>
                    </div>
                    <div className="space-y-5">
                      {part.questions?.map((question, questionIndex) => {
                        const key = `${partIndex}_${questionIndex}`;
                        const value = answers[key] ?? (question.answerType === 'checkbox' ? [] : '');
                        const inputClass = `border border-gray-200 rounded-lg px-3 py-2 text-sm ${isReadOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`;

                        // text/number questions: label and input sit on the same row.
                        if (['text', 'number'].includes(question.answerType)) {
                          return (
                            <div key={questionIndex} className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <span className="text-sm font-semibold text-gray-900 sm:w-1/2 sm:flex-shrink-0">
                                {question.questionText}
                                {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                              </span>
                              <div className="flex-1 min-w-0">
                                {question.answerType === 'text' ? (
                                  <input type="text" value={value || ''} onChange={e => handleAnswerChange(key, e.target.value)} placeholder={question.placeholder || 'Enter your answer'} disabled={isReadOnly} className={`w-full ${inputClass}`} />
                                ) : (
                                  <input type="number" value={value ?? ''} onChange={e => handleAnswerChange(key, e.target.value)} disabled={isReadOnly} className={`w-full sm:w-40 ${inputClass}`} />
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={questionIndex} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                            <label className="flex items-start justify-between gap-3">
                              <span className="text-sm font-semibold text-gray-900">
                                {question.questionText}
                                {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                              </span>
                              <span className="text-[11px] uppercase tracking-wide text-gray-400">{question.answerType}</span>
                            </label>
                            <div className="mt-3">
                              {question.answerType === 'textarea' && (
                                <textarea value={value || ''} onChange={e => handleAnswerChange(key, e.target.value)} placeholder={question.placeholder || 'Enter your answer'} rows={3} disabled={isReadOnly} className={`w-full ${inputClass}`} />
                              )}
                              {question.answerType === 'date' && (
                                <input type="date" value={value || ''} onChange={e => handleAnswerChange(key, e.target.value)} disabled={isReadOnly} className={inputClass} />
                              )}
                              {['radio', 'dropdown'].includes(question.answerType) && (
                                question.answerType === 'radio' ? (
                                  <div className="space-y-2">
                                    {question.options?.map((option, idx) => (
                                      <label key={idx} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                        <input type="radio" name={key} value={option} checked={value === option} onChange={() => handleAnswerChange(key, option)} disabled={isReadOnly} className="text-blue-600 focus:ring-blue-500" />
                                        {option}
                                      </label>
                                    ))}
                                  </div>
                                ) : (
                                  <select value={value || ''} onChange={e => handleAnswerChange(key, e.target.value)} disabled={isReadOnly} className={`w-full ${inputClass}`}>
                                    <option value="" disabled>Select an option</option>
                                    {question.options?.map((option, idx) => <option key={idx} value={option}>{option}</option>)}
                                  </select>
                                )
                              )}
                              {question.answerType === 'checkbox' && (
                                <div className="space-y-2">
                                  {question.options?.map((option, idx) => (
                                    <label key={idx} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                      <input type="checkbox" value={option} checked={Array.isArray(value) && value.includes(option)} onChange={() => toggleCheckboxValue(key, option)} disabled={isReadOnly} className="text-blue-600 focus:ring-blue-500" />
                                      {option}
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {/* Legacy submit buttons */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-4 sm:p-6">
                  {isSubmitted ? (
                    isEditing ? (
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Editing a submitted report.
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => { setIsEditing(false); populateAnswersFromSubmission(submissionInfo); }} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel Edit</button>
                          <button onClick={() => submitReport('submitted')} disabled={submitLoading} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
                            {submitLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : <><SendHorizontal className="w-4 h-4" /> Update Submission</>}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold">റിപ്പോർട്ട് വിജയകരമായി സമർപ്പിച്ചു!</p>
                            <p className="text-green-600 text-xs mt-0.5">Your report has been submitted successfully.</p>
                          </div>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                          <button onClick={() => setIsEditing(true)} className="px-4 py-2.5 rounded-xl border border-blue-200 text-sm font-semibold text-blue-700 hover:bg-blue-50 flex items-center gap-2"><Pencil className="w-4 h-4" /> Edit Submission</button>
                          <button onClick={() => openDeleteModal(selectedReport._id, selectedReport.title)} disabled={submitLoading} className="px-4 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-60"><Trash2 className="w-4 h-4" /> Delete Submission</button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => submitReport('pending')} disabled={submitLoading} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save Draft
                      </button>
                      <button onClick={() => submitReport('submitted')} disabled={submitLoading} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
                        {submitLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><SendHorizontal className="w-4 h-4" /> Submit Report</>}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })()}

      <SubmissionPreviewModal
        open={previewOpen}
        loading={previewLoading}
        data={previewData}
        onClose={closePreview}
        onDownload={handlePreviewDownload}
        downloading={previewData?.report && downloadingId === previewData.report._id}
      />
    </div>
  );

  const deleteSubmission = async () => {
    const targetId = deleteTarget?.id || selectedReport?._id;
    if (!targetId) return;
    setSubmitLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.delete(
        `${API_BASE_URL}/api/user/reports/${targetId}/submission`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.success) {
        if (selectedReport?._id === targetId) {
          setSubmissionInfo(null);
          setAnswers({});
          setIsEditing(false);
        }
        setFeedback({ type: 'success', message: 'Submission deleted successfully.' });
        setReports((prev) =>
          prev.map((r) =>
            r._id === targetId ? { ...r, status: 'pending' } : r
          )
        );
      } else {
        setFeedback({ type: 'error', message: response.data?.message || 'Failed to delete submission.' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'Failed to delete submission.' });
    } finally {
      setSubmitLoading(false);
      setDeleteTarget(null);
    }
  };

  const confirmLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    setShowLogoutModal(false);
    // Use window.location for immediate redirect to prevent navigation issues
    window.location.href = '/';
  };

  if (isAreaUser) {
    return (
      <>
        <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
          <AreaAdminSidebar
            activeTab={sidebarActiveReportTab || 'dynamic-reports'}
            onNavigate={handleAreaSidebarNavigate}
            onLogout={() => setShowLogoutModal(true)}
            onNotifications={handleAreaNotificationsShortcut}
            onDynamicReports={handleAreaDynamicShortcut}
            onNavigateToMembership={handleAreaNavigateToMembership}
            onReportTypeSelect={handleReportTypeSelect}
            reportCounts={reportCounts}
            areaName={areaName}
            districtName={districtName}
            isMobileOpen={isAreaSidebarOpen}
            onMobileToggle={() => setIsAreaSidebarOpen((prev) => !prev)}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <MobileTopBar
              title="റിപ്പോർട്ടുകൾ"
            />
            <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6 min-w-0">{pageContent}</div>
            </main>
          </div>
        </div>
        <ConfirmationModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
          title="ലോഗൗട്ട്"
          message="താങ്കൾ ലോഗൗട്ട് ചെയ്യാൻ തീർച്ചയാണോ?"
          confirmText="ലോഗൗട്ട്"
          cancelText="റദ്ദാക്കുക"
          type="logout"
        />
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={deleteSubmission}
          title="സബ്മിഷൻ ഡിലീറ്റ്"
          message="ഈ സബ്മിഷൻ ഡിലീറ്റ് ചെയ്യണോ? ഇത് തിരിച്ചുകിട്ടില്ല."
          confirmText="ഡിലീറ്റ്"
          cancelText="റദ്ദാക്കുക"
          type="danger"
        />
      </>
    );
  }

  if (isDistrictUser) {
    return (
      <>
        <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
          <DistrictAdminSidebar
            activeView={sidebarActiveReportTab || 'reports'}
            onNavigate={handleDistrictSidebarNavigate}
            onLogout={() => setShowLogoutModal(true)}
            onNotifications={() => navigate('/notifications', { replace: true })}
            onDynamicReports={() => handleDistrictSidebarNavigate('reports')}
            onNavigateToMembership={() => handleDistrictSidebarNavigate('membership')}
            onReportTypeSelect={handleReportTypeSelect}
            reportCounts={reportCounts}
            districtName={districtName}
            isMobileOpen={isDistrictSidebarOpen}
            onMobileToggle={() => setIsDistrictSidebarOpen((prev) => !prev)}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <MobileTopBar
              title="റിപ്പോർട്ടുകൾ"
            />
            <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6 min-w-0">{pageContent}</div>
            </main>
          </div>
        </div>
        <ConfirmationModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
          title="ലോഗൗട്ട്"
          message="താങ്കൾ ലോഗൗട്ട് ചെയ്യാൻ തീർച്ചയാണോ?"
          confirmText="ലോഗൗട്ട്"
          cancelText="റദ്ദാക്കുക"
          type="logout"
        />
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={deleteSubmission}
          title="സബ്മിഷൻ ഡിലീറ്റ്"
          message="ഈ സബ്മിഷൻ ഡിലീറ്റ് ചെയ്യണോ? ഇത് തിരിച്ചുകിട്ടില്ല."
          confirmText="ഡിലീറ്റ്"
          cancelText="റദ്ദാക്കുക"
          type="danger"
        />
      </>
    );
  }

  if (isUnitUser) {
    return (
      <>
        <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
          <UnitAdminSidebar
            activeTab={sidebarActiveReportTab || 'dynamic-reports'}
            onNavigate={handleUnitSidebarNavigate}
            onLogout={() => setShowLogoutModal(true)}
            onNotifications={handleUnitNotificationsShortcut}
            onDynamicReports={handleUnitDynamicShortcut}
            onNavigateToMembership={() => navigate('/membership', { state: { roleHint: 'unit' } })}
            onReportTypeSelect={handleReportTypeSelect}
            reportCounts={reportCounts}
            unitName={unitName}
            areaName={unitAreaName}
            districtName={districtName}
            isMobileOpen={isUnitSidebarOpen}
            onMobileToggle={() => setIsUnitSidebarOpen((prev) => !prev)}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <MobileTopBar
              title="റിപ്പോർട്ടുകൾ"
            />
            <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6 min-w-0">{pageContent}</div>
            </main>
          </div>
        </div>
        <ConfirmationModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
          title="ലോഗൗട്ട്"
          message="താങ്കൾ ലോഗൗട്ട് ചെയ്യാൻ തീർച്ചയാണോ?"
          confirmText="ലോഗൗട്ട്"
          cancelText="റദ്ദാക്കുക"
          type="logout"
        />
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={deleteSubmission}
          title="സബ്മിഷൻ ഡിലീറ്റ്"
          message="ഈ സബ്മിഷൻ ഡിലീറ്റ് ചെയ്യണോ? ഇത് തിരിച്ചുകിട്ടില്ല."
          confirmText="ഡിലീറ്റ്"
          cancelText="റദ്ദാക്കുക"
          type="danger"
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-x-hidden">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-w-0 overflow-x-hidden">{pageContent}</main>
      </div>
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="ലോഗൗട്ട്"
        message="താങ്കൾ ലോഗൗട്ട് ചെയ്യാൻ തീർച്ചയാണോ?"
        confirmText="ലോഗൗട്ട്"
        cancelText="റദ്ദാക്കുക"
        type="logout"
      />
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={deleteSubmission}
        title="സബ്മിഷൻ ഡിലീറ്റ്"
        message="ഈ സബ്മിഷൻ ഡിലീറ്റ് ചെയ്യണോ? ഇത് തിരിച്ചുകിട്ടില്ല."
        confirmText="ഡിലീറ്റ്"
        cancelText="റദ്ദാക്കുക"
        type="danger"
      />
    </>
  );
};

export default UserReportsPage;

