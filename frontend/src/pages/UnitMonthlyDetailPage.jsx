import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Edit, Trash2, FileText, Calendar, User } from 'lucide-react';
import { downloadMonthlyDetailPDF } from '../utils/monthlyPdfGenerator.jsx';
import axios from 'axios';
import UnitSurveyView from '../components/forms/unit/UnitSurveyView';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import MobileTopBar from '../components/sidebars/MobileTopBar';

const UnitMonthlyDetailPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const survey = state?.survey || null;
  const [adminData, setAdminData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [totalForms, setTotalForms] = useState(0);
  const [totalSurveys, setTotalSurveys] = useState(0);

  useEffect(() => {
    const storedAdminData = localStorage.getItem('adminData');
    if (storedAdminData) {
      setAdminData(JSON.parse(storedAdminData));
    }
    // Load totals for sidebar
    loadTotals();
  }, []);

  const loadTotals = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const [formsRes, surveysRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/admin/forms?page=1&limit=1`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/admin/monthly-surveys/all-levels?page=1&limit=1`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setTotalForms(formsRes.data?.totalForms || 0);
      setTotalSurveys(surveysRes.data?.totalSurveys || 0);
    } catch (error) {
      console.error('Error loading totals:', error);
    }
  };

  const handleBack = () => {
    navigate('/admin-dashboard', { state: { activeTab: 'monthly' } });
  };

  const handleEdit = () => {
    navigate('/unit-survey', { state: { editingSurvey: survey, isAdmin: true } });
  };

  const handleSidebarNavigate = (tabId) => {
    if (tabId === 'yearly' || tabId === 'monthly' || tabId === 'stats') {
      navigate('/admin-dashboard', { state: { activeTab: tabId } });
    }
  };

  const handleNavigateToReports = () => {
    navigate('/view-reports');
  };

  const handleNavigateToNotifications = () => {
    navigate('/notifications');
  };


  const handleDownloadCSV = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/user/users/export-csv`,
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
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV download error:', error);
      alert('Failed to download CSV. Please try again.');
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    setShowLogoutModal(false);
    navigate('/', { replace: true });
  };

  if (!survey) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
        <AdminSidebar
          activeTab="monthly"
          onTabChange={handleSidebarNavigate}
          onNavigateToReports={handleNavigateToReports}
          onDownloadCSV={handleDownloadCSV}
          onNavigateToNotifications={handleNavigateToNotifications}
          onLogout={handleLogout}
          adminEmail={adminData?.email || 'Admin'}
          totalForms={totalForms}
          totalSurveys={totalSurveys}
          isMobileOpen={isSidebarOpen}
          onMobileToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <div className="flex-1 relative z-10 box-border flex flex-col min-w-0 overflow-hidden">
          <MobileTopBar
            title="പ്രതിമാസ റിപ്പോർട്ട്"
          />
          <div className="flex-1 bg-white flex items-center justify-center pb-24 lg:pb-0">
            <div className="text-center">
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-8 max-w-md shadow-lg animate-fade-in">
                <p className="text-yellow-700 mb-6 font-semibold">No report data passed. Go back and open from admin dashboard.</p>
                <button
                  onClick={handleBack}
                  className="bg-gradient-to-r from-[#002349] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#002349] text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-500 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out hover:shadow-[#002349]/50"
                >
                  Back to Admin
                </button>
              </div>
            </div>
          </div>
        </div>
        <ConfirmationModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
          title="Confirm Logout"
          message="Are you sure you want to logout?"
          confirmText="Logout"
          cancelText="Cancel"
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
      <AdminSidebar
        activeTab="monthly"
        onTabChange={handleSidebarNavigate}
        onNavigateToReports={handleNavigateToReports}
        onDownloadCSV={handleDownloadCSV}
        onNavigateToNotifications={handleNavigateToNotifications}
        onLogout={handleLogout}
        adminEmail={adminData?.email || 'Admin'}
        totalForms={totalForms}
        totalSurveys={totalSurveys}
        isMobileOpen={isSidebarOpen}
        onMobileToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex-1 relative z-10 box-border flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar
          title="പ്രതിമാസ റിപ്പോർട്ട്"
        />
        <div className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          <UnitSurveyView 
            survey={survey} 
            onBack={handleBack} 
            onEdit={handleEdit}
          />
        </div>
      </div>

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
      />
    </div>
  );
};

export default UnitMonthlyDetailPage;