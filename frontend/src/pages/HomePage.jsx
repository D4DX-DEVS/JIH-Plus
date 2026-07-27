import React, { useState, useEffect } from 'react';
import { Calendar, FileText, LogOut, User, BarChart3, Home, Info, Bell, ChevronRight, Star, TrendingUp, Users, Shield, Clock } from 'lucide-react';
import jihLogo from '../assets/LogoColor.png';
import axios from 'axios';
import KarkunForm from '../components/forms/membership/KarkunForm';
import RuknForm from '../components/forms/membership/RuknForm';
import RejectionModal from '../components/modals/RejectionModal';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import SuggestionModal from '../components/modals/SuggestionModal';

const HomePage = ({
  onLogout,
  onNavigateToYearly,
  onNavigateToMonthly,
  onNavigateToStats,
  onNavigateToNotifications,
  onNavigateToReports = () => {},
  userData,
  defaultTab = 'overview'
}) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const [activeTab, setActiveTab] = useState(defaultTab === 'membership' ? 'membership' : 'overview'); // 'overview', 'membership'
  const [membershipTab, setMembershipTab] = useState('karkun');
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipData, setMembershipData] = useState({ karkun: [], rukn: [] });
  const [showKarkunForm, setShowKarkunForm] = useState(false);
  const [selectedKarkunForm, setSelectedKarkunForm] = useState(null);
  const [showRuknForm, setShowRuknForm] = useState(false);
  const [selectedRuknForm, setSelectedRuknForm] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionData, setRejectionData] = useState(null);
  const [showDeleteKarkunModal, setShowDeleteKarkunModal] = useState(false);
  const [showDeleteRuknModal, setShowDeleteRuknModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalContext, setApprovalContext] = useState(null); // { formId, name }
  const [formToDelete, setFormToDelete] = useState(null); // { id, name }

  useEffect(() => {
    setActiveTab(defaultTab === 'membership' ? 'membership' : 'overview');
  }, [defaultTab]);

  // Membership is now handled by dedicated MembershipPage route

  const loadMembershipData = async () => {
    try {
      setMembershipLoading(true);
      const token = localStorage.getItem('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const karkunResp = await axios.get(`${API_BASE_URL}/api/karkun/district/mine`, { headers });
      const ruknResp = await axios.get(`${API_BASE_URL}/api/rukn/district/mine`, { headers });
      setMembershipData({ karkun: karkunResp.data?.data || [], rukn: ruknResp.data?.data || [] });
    } catch (e) {
      console.error('District: error loading membership', e);
      setMembershipData({ karkun: [], rukn: [] });
    } finally {
      setMembershipLoading(false);
    }
  };

  const handleVerifyKarkunDistrict = async (formId, status) => {
    if (status === 'rejected') {
      setRejectionData({ formId, type: 'karkun' });
      setShowRejectionModal(true);
      return;
    }
    
    try {
      const token = localStorage.getItem('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.put(`${API_BASE_URL}/api/karkun/${formId}/verify/district`, { status }, { headers });
      const updated = res.data?.data;
      if (updated?._id) {
        setMembershipData(prev => ({ ...prev, karkun: prev.karkun.map(f => (f._id === updated._id ? { ...f, ...updated } : f)) }));
      } else {
        await loadMembershipData();
      }
    } catch (e) {
      console.error('District verify error', e);
      alert(e.response?.data?.message || 'Verification failed');
    }
  };

  const handleConfirmRejection = async (comments) => {
    if (!rejectionData) return;
    
    try {
      const token = localStorage.getItem('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const endpoint = rejectionData.type === 'karkun' 
        ? `${API_BASE_URL}/api/karkun/${rejectionData.formId}/verify/district`
        : `${API_BASE_URL}/api/rukn/${rejectionData.formId}/verify/district`;
      
      const res = await axios.put(endpoint, { status: 'rejected', comments }, { headers });
      const updated = res.data?.data;
      if (updated?._id) {
        setMembershipData(prev => ({ ...prev, [rejectionData.type]: prev[rejectionData.type].map(f => (f._id === updated._id ? { ...f, ...updated } : f)) }));
      } else {
        await loadMembershipData();
      }
    } catch (e) {
      console.error('Rejection error', e);
      alert(e.response?.data?.message || 'Rejection failed');
    }
  };

  const handleViewKarkunForm = (form) => {
    setSelectedKarkunForm(form);
    setShowKarkunForm(true);
  };

  const handleBackFromKarkunForm = () => {
    setShowKarkunForm(false);
    setSelectedKarkunForm(null);
  };

  const handleDeleteKarkun = (form) => {
    setFormToDelete({ id: form._id, name: form.name });
    setShowDeleteKarkunModal(true);
  };

  const confirmDeleteKarkun = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      if (!formToDelete?.id) return;
      await axios.delete(`${API_BASE_URL}/api/karkun/${formToDelete.id}`, { headers });
      setMembershipData(prev => ({ ...prev, karkun: prev.karkun.filter(f => f._id !== formToDelete.id) }));
    } catch (e) {
      console.error('Delete karkun error', e);
    } finally {
      setShowDeleteKarkunModal(false);
      setFormToDelete(null);
    }
  };

  const handleVerifyRuknDistrict = async (formId, status) => {
    if (status === 'rejected') {
      setRejectionData({ formId, type: 'rukn' });
      setShowRejectionModal(true);
      return;
    }
    
    if (status === 'approved') {
      const form = membershipData.rukn.find(f => f._id === formId);
      setApprovalContext({ formId, name: form?.name || '' });
      setShowApprovalModal(true);
    }
  };

  const closeApprovalModal = () => {
    setShowApprovalModal(false);
    setApprovalContext(null);
  };

  const handleConfirmRuknApproval = async (suggestion) => {
    if (!approvalContext?.formId) {
      closeApprovalModal();
      return;
    }

    try {
      const token = localStorage.getItem('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {
        status: 'approved',
        opinion: suggestion,
        comments: suggestion
      };
      const res = await axios.put(`${API_BASE_URL}/api/rukn/${approvalContext.formId}/verify/district`, payload, { headers });
      const updated = res.data?.data;
      if (updated?._id) {
        setMembershipData(prev => ({ ...prev, rukn: prev.rukn.map(f => (f._id === updated._id ? { ...f, ...updated } : f)) }));
      } else {
        await loadMembershipData();
      }
    } catch (e) {
      console.error('District approve Rukn error', e);
      alert(e.response?.data?.message || 'Approval failed');
    } finally {
      closeApprovalModal();
    }
  };

  const handleViewRuknForm = (form) => {
    setSelectedRuknForm(form);
    setShowRuknForm(true);
  };

  const handleBackFromRuknForm = () => {
    setShowRuknForm(false);
    setSelectedRuknForm(null);
  };

  const handleDeleteRukn = (form) => {
    setFormToDelete({ id: form._id, name: form.name });
    setShowDeleteRuknModal(true);
  };

  const confirmDeleteRukn = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      if (!formToDelete?.id) return;
      await axios.delete(`${API_BASE_URL}/api/rukn/${formToDelete.id}`, { headers });
      setMembershipData(prev => ({ ...prev, rukn: prev.rukn.filter(f => f._id !== formToDelete.id) }));
    } catch (e) {
      console.error('Delete rukn error', e);
    } finally {
      setShowDeleteRuknModal(false);
      setFormToDelete(null);
    }
  };

  const hideHeader = userData?.role === 'district';

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInUpDelay {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out;
        }
        
        .animate-fade-in-up-delay {
          animation: fadeInUpDelay 0.8s ease-out 0.3s both;
        }
        
        .animate-slide-in-left {
          animation: slideInLeft 0.6s ease-out;
        }
        
        .animate-slide-in-right {
          animation: slideInRight 0.6s ease-out 0.2s both;
        }
        
        .animate-slide-in-up {
          animation: slideInUp 0.6s ease-out 0.4s both;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    <div className="min-h-screen">
      {/* Header */}
      {!hideHeader && (
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:py-6 gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => window.location.href = '/'}
                className="text-gray-600 hover:text-[#002349] transition-colors flex items-center space-x-2 text-sm font-medium"
              >
                <span>← Back</span>
              </button>
              <img src={jihLogo} alt="JIH Logo" className="h-8 sm:h-12 w-auto" />
              <h1 className="text-lg sm:text-2xl font-bold text-[#002349] text-center sm:text-left">
                JIH Plus
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <span className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                Welcome, {userData?.name || 'User'} • District: {userData?.district || 'Unknown'}
              </span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={onNavigateToNotifications}
                  className="bg-[#957C3D] hover:bg-[#8A6F35] text-white px-4 py-2 rounded-2xl transition-all duration-500 flex items-center space-x-2 text-sm font-medium hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out"
                >
                  <Bell className="w-4 h-4 hover:animate-pulse" />
                  <span>Notifications</span>
                </button>
                <button
                  onClick={onLogout}
                  className="text-gray-600 hover:text-[#002349] transition-all duration-500 flex items-center space-x-2 text-sm font-medium border border-gray-300 hover:border-[#002349] px-4 py-2 rounded-2xl hover:shadow-md transform hover:-translate-y-1 hover:scale-105 ease-out"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      )}

      {/* No tab controls; navigation handled externally */}

      {/* Main Content */}
      <main className="px-3 sm:px-5 lg:px-6 py-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Hero Section */}
            <div className="text-center mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-[#002349] mb-2 animate-fade-in-up hover:text-[#1a3a5c] transition-colors duration-300">
                റിപ്പോർട്ട് സിസ്റ്റത്തിലേക്ക് സ്വാഗതം
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto text-sm leading-relaxed animate-fade-in-up-delay hover:text-gray-700 transition-colors duration-300">
                വാർഷിക അല്ലെങ്കിൽ പ്രതിമാസ റിപ്പോർട്ട് പൂരിപ്പിക്കാൻ താഴെയുള്ള ഓപ്ഷനുകളിൽ ഒന്ന് തിരഞ്ഞെടുക്കുക
              </p>
            </div>

            {/* Survey Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                  {/* Monthly Survey Card */}
              <div className="bg-white rounded-xl shadow-md transition-all duration-300 border border-gray-200 hover:border-[#957C3D] p-4 group hover:-translate-y-0.5 hover:shadow-lg">
                <div className="text-center mb-3">
                  <div className="w-10 h-10 bg-white border border-[#957C3D] rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-105 transition-all duration-300 ease-out">
                    <Calendar className="w-5 h-5 text-[#957C3D]" />
                  </div>
                  <div className="inline-flex items-center px-2 py-1 bg-[#957C3D] text-white rounded-full text-xs font-semibold mb-3">
                    പ്രതിമാസ
                    </div>
                  <h3 className="text-base font-bold text-[#957C3D] mb-1 group-hover:text-[#8A6F35] transition-colors duration-300">
                      പ്രതിമാസ റിപ്പോർട്ട്
                    </h3>
                  <p className="text-gray-600 text-xs leading-relaxed mb-3">
                    പ്രതിമാസ വിപുലീകരണ റിപ്പോർട്ട് ഫോം പൂരിപ്പിക്കുക
                  </p>
                  <div className="flex items-center justify-center text-gray-500 text-xs mb-3 group-hover:text-gray-600 transition-colors duration-300">
                    <TrendingUp className="w-3 h-3 text-[#957C3D] mr-2 group-hover:animate-pulse" />
                    ഓരോ മാസവും പുതിയ ഡാറ്റ
                  </div>
                    </div>
                    <button
                      onClick={onNavigateToMonthly}
                  className="w-full bg-[#957C3D] hover:bg-[#8A6F35] text-white py-2 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 text-xs hover:shadow-md ease-out"
                    >
                  <Calendar className="w-3 h-3 group-hover:rotate-12 transition-transform duration-300" />
                      <span>തുറക്കുക</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-2 transition-transform duration-300" />
                    </button>
                  </div>

              {/* Statistics Card */}
              <div className="bg-white rounded-xl shadow-md transition-all duration-300 border border-gray-200 hover:border-slate-600 p-4 group hover:-translate-y-0.5 hover:shadow-lg">
                <div className="text-center mb-3">
                  <div className="w-10 h-10 bg-white border border-slate-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm transition-all duration-300 ease-out group-hover:scale-105">
                    <BarChart3 className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="inline-flex items-center px-2 py-1 bg-slate-600 text-white rounded-full text-xs font-semibold mb-3 group-hover:bg-slate-700 transition-colors duration-300">
                    വിശകലനം
                    </div>
                  <h3 className="text-base font-bold text-slate-700 mb-1 text-center pr-1 group-hover:text-slate-800 transition-colors duration-300">
                      സ്ഥിതിവിവരക്കണക്കുകൾ
                    </h3>
                  <p className="text-gray-600 text-xs leading-relaxed mb-3 text-center pr-1 group-hover:text-gray-700 transition-colors duration-300">
                    ഡാറ്റയുടെ വിശദമായ സ്ഥിതിവിവരക്കണക്കുകൾ
                  </p>
                  <div className="flex items-center justify-center text-gray-500 text-xs mb-3 group-hover:text-gray-600 transition-colors duration-300">
                    <Users className="w-3 h-3 text-[#957C3D] mr-2 group-hover:animate-pulse" />
                    തത്സമയ ഡാറ്റ ഇൻസൈറ്റ്സ്
                  </div>
                </div>
                <button
                  onClick={onNavigateToStats}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 text-xs hover:shadow-md ease-out"
                >
                  <BarChart3 className="w-3 h-3 group-hover:rotate-12 transition-transform duration-300" />
                  <span>കാണുക</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-2 transition-transform duration-300" />
                </button>
              </div>

              {/* Dynamic Reports Card */}
              <div className="bg-white rounded-xl shadow-md transition-all duration-300 border border-gray-200 hover:border-emerald-600 p-4 group hover:-translate-y-0.5 hover:shadow-lg">
                <div className="text-center mb-3">
                  <div className="w-10 h-10 bg-white border border-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm transition-all duration-300 ease-out group-hover:scale-105">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="inline-flex items-center px-2 py-1 bg-emerald-600 text-white rounded-full text-xs font-semibold mb-3 group-hover:bg-emerald-700 transition-colors duration-300">
                    ഡൈനാമിക്
                  </div>
                  <h3 className="text-base font-bold text-emerald-700 mb-1 group-hover:text-emerald-800 transition-colors duration-300">
                    റിലേഷൻ റിപ്പോർട്ടുകൾ
                  </h3>
                  <p className="text-gray-600 text-xs leading-relaxed mb-3 group-hover:text-gray-700 transition-colors duration-300">
                    ഡൈനാമിക് റിപ്പോർട്ടുകൾ പൂരിപ്പിക്കുക
                  </p>
                  <div className="flex items-center justify-center text-gray-500 text-xs mb-3 group-hover:text-gray-600 transition-colors duration-300">
                    <Clock className="w-3 h-3 text-[#957C3D] mr-2 group-hover:animate-pulse" />
                    റിയൽടൈം സമർപ്പണങ്ങൾ
                  </div>
                </div>
                <button
                  onClick={onNavigateToReports}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 text-xs hover:shadow-md ease-out"
                >
                  <FileText className="w-3 h-3 group-hover:rotate-12 transition-transform duration-300" />
                  <span>കാണുക</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-2 transition-transform duration-300" />
                </button>
              </div>

              {/* Yearly Survey Card */}
              <div className="bg-white rounded-xl shadow-md transition-all duration-300 border border-gray-200 hover:border-[#002349] p-4 group hover:-translate-y-0.5 hover:shadow-lg">
                <div className="text-center mb-3">
                  <div className="w-10 h-10 bg-white border border-[#002349] rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm transition-all duration-300 ease-out group-hover:scale-105">
                    <FileText className="w-5 h-5 text-[#002349]" />
              </div>
                  <div className="inline-flex items-center px-2 py-1 bg-[#002349] text-white rounded-full text-xs font-semibold mb-3 group-hover:bg-[#1a3a5c] transition-colors duration-300">
                    വാർഷിക
                    </div>
                  <h3 className="text-base font-bold text-[#002349] mb-1 group-hover:text-[#1a3a5c] transition-colors duration-300">
                      വാർഷിക റിപ്പോർട്ട്
                    </h3>
                  <p className="text-gray-600 text-xs leading-relaxed mb-3 group-hover:text-gray-700 transition-colors duration-300">
                    വാർഷിക വിപുലീകരണ റിപ്പോർട്ട് ഫോം പൂരിപ്പിക്കുക
                  </p>
                  <div className="flex items-center justify-center text-gray-500 text-xs mb-3 group-hover:text-gray-600 transition-colors duration-300">
                    <Star className="w-3 h-3 text-[#957C3D] mr-2 group-hover:animate-pulse" />
                    വർഷത്തിലൊരിക്കൽ മാത്രം
                  </div>
                    </div>
                    <button
                      onClick={onNavigateToYearly}
                  className="w-full bg-[#002349] hover:bg-[#1a3a5c] text-white py-2 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 text-xs hover:shadow-md ease-out"
                    >
                  <FileText className="w-3 h-3 group-hover:rotate-12 transition-transform duration-300" />
                      <span>തുറക്കുക</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-2 transition-transform duration-300" />
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <section className="animate-fade-in-up transition-all duration-500 space-y-3">
              <h3 className="text-base font-bold text-[#002349] flex items-center hover:text-[#1a3a5c] transition-colors duration-300">
                <Shield className="w-5 h-5 mr-2 hover:animate-pulse" />
                സിസ്റ്റം സംഗ്രഹം
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md hover:bg-white transition-all duration-300 group">
                  <div className="w-9 h-9 bg-white border border-[#002349] rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-105 transition-all duration-300 ease-out">
                    <span className="text-base font-bold text-[#002349] group-hover:text-[#1a3a5c] transition-colors duration-300">1</span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#002349] mb-1 group-hover:text-[#1a3a5c] transition-colors duration-300">വാർഷിക റിപ്പോർട്ട്</h4>
                  <p className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors duration-300">പ്രതിവർഷം ഒരിക്കൽ</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md hover:bg-white transition-all duration-300 group">
                  <div className="w-9 h-9 bg-white border border-[#957C3D] rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-105 transition-all duration-300 ease-out">
                    <span className="text-base font-bold text-[#957C3D] group-hover:text-[#8A6F35] transition-colors duration-300">12</span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#957C3D] mb-1 group-hover:text-[#8A6F35] transition-colors duration-300">പ്രതിമാസ റിപ്പോർട്ട്</h4>
                  <p className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors duration-300">പ്രതിമാസം പുതിയ ഡാറ്റ</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md hover:bg-white transition-all duration-300 group">
                  <div className="w-9 h-9 bg-white border border-slate-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-105 transition-all duration-300 ease-out">
                    <BarChart3 className="w-5 h-5 text-slate-600 group-hover:text-slate-700 transition-colors duration-300" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-1 group-hover:text-slate-800 transition-colors duration-300">ഡാറ്റ ഇൻസൈറ്റ്സ്</h4>
                  <p className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors duration-300">തത്സമയ വിശകലനം</p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Info content merged into overview */}
        {activeTab === 'overview' && (
          <section className="animate-fade-in transition-all duration-500 mt-8 space-y-5">
            {/* Header */}
            <div>
              <div className="inline-flex items-center justify-center w-10 h-10 bg-white border border-[#957C3D] rounded-full mb-2 shadow-sm transition-all duration-300 ease-out">
                <Info className="w-5 h-5 text-[#957C3D]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#957C3D] mb-2 animate-fade-in-up hover:text-[#8A6F35] transition-colors duration-300">
                റിപ്പോർട്ട് സംബന്ധിച്ച് അറിയേണ്ട കാര്യങ്ങൾ
              </h2>
              <p className="text-gray-600 max-w-2xl text-sm leading-relaxed animate-fade-in-up-delay hover:text-gray-700 transition-colors duration-300">
                സിസ്റ്റം ഉപയോഗിക്കുന്നതിനുള്ള മാർഗ്ഗനിർദ്ദേശങ്ങൾ
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                {/* Survey Guidelines */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md hover:bg-white transition-all duration-300 animate-slide-in-left group">
                <h3 className="text-base font-bold text-[#002349] mb-3 flex items-center group-hover:text-[#1a3a5c] transition-colors duration-300">
                  <FileText className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                    റിപ്പോർട്ട് നിർദ്ദേശങ്ങൾ
                  </h3>
                <div className="space-y-2">
                  <div className="flex items-start space-x-3 group/item hover:bg-white p-2 rounded-xl transition-all duration-300">
                    <div className="w-3 h-3 bg-[#002349] rounded-full mt-2 flex-shrink-0 group-hover/item:scale-150 group-hover/item:rotate-45 transition-all duration-300"></div>
                    <span className="text-gray-700 leading-relaxed text-sm group-hover/item:text-gray-800 transition-colors duration-300">എല്ലാ ഫീൽഡുകളും കൃത്യമായി പൂരിപ്പിക്കുക</span>
                    </div>
                  <div className="flex items-start space-x-3 group/item hover:bg-white p-2 rounded-xl transition-all duration-300">
                    <div className="w-3 h-3 bg-[#957C3D] rounded-full mt-2 flex-shrink-0 group-hover/item:scale-150 group-hover/item:rotate-45 transition-all duration-300"></div>
                    <span className="text-gray-700 leading-relaxed text-sm group-hover/item:text-gray-800 transition-colors duration-300">പ്രതിമാസ റിപ്പോർട്ട് ഓരോ മാസവും പൂരിപ്പിക്കാം</span>
                    </div>
                  <div className="flex items-start space-x-3 group/item hover:bg-white p-2 rounded-xl transition-all duration-300">
                    <div className="w-3 h-3 bg-slate-600 rounded-full mt-2 flex-shrink-0 group-hover/item:scale-150 group-hover/item:rotate-45 transition-all duration-300"></div>
                    <span className="text-gray-700 leading-relaxed text-sm group-hover/item:text-gray-800 transition-colors duration-300">സമർപ്പിച്ച റിപ്പോർട്ട് പിന്നീട് എഡിറ്റ് ചെയ്യാനും കാണാനും കഴിയും</span>
                    </div>
                  <div className="flex items-start space-x-3 group/item hover:bg-white p-2 rounded-xl transition-all duration-300">
                    <div className="w-3 h-3 bg-[#002349] rounded-full mt-2 flex-shrink-0 group-hover/item:scale-150 group-hover/item:rotate-45 transition-all duration-300"></div>
                    <span className="text-gray-700 leading-relaxed text-sm group-hover/item:text-gray-800 transition-colors duration-300">വാർഷിക റിപ്പോർട്ട് വർഷത്തിൽ ഒരിക്കൽ മാത്രം പൂരിപ്പിക്കേണ്ടതാണ്</span>
                  </div>
                  </div>
                </div>

                {/* System Features */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md hover:bg-white transition-all duration-300 animate-slide-in-right group">
                <h3 className="text-base font-bold text-[#957C3D] mb-3 flex items-center group-hover:text-[#8A6F35] transition-colors duration-300">
                  <BarChart3 className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                    സിസ്റ്റം സവിശേഷതകൾ
                  </h3>
                <div className="space-y-2">
                  <div className="flex items-start space-x-3 group/item hover:bg-white p-2 rounded-xl transition-all duration-300">
                    <div className="w-3 h-3 bg-slate-600 rounded-full mt-2 flex-shrink-0 group-hover/item:scale-150 group-hover/item:rotate-45 transition-all duration-300"></div>
                    <span className="text-gray-700 leading-relaxed text-sm group-hover/item:text-gray-800 transition-colors duration-300">സ്ഥിതിവിവരക്കണക്കുകൾ വിഭാഗത്തിൽ നിങ്ങളുടെ ജില്ലയുടെ പുരോഗതി കാണാം</span>
                    </div>
                  <div className="flex items-start space-x-3 group/item hover:bg-white p-2 rounded-xl transition-all duration-300">
                    <div className="w-3 h-3 bg-[#002349] rounded-full mt-2 flex-shrink-0 group-hover/item:scale-150 group-hover/item:rotate-45 transition-all duration-300"></div>
                    <span className="text-gray-700 leading-relaxed text-sm group-hover/item:text-gray-800 transition-colors duration-300">സുരക്ഷിത ഡാറ്റ സംഭരണവും ബാക്കപ്പും</span>
                    </div>
                  <div className="flex items-start space-x-3 group/item hover:bg-white p-2 rounded-xl transition-all duration-300">
                    <div className="w-3 h-3 bg-[#957C3D] rounded-full mt-2 flex-shrink-0 group-hover/item:scale-150 group-hover/item:rotate-45 transition-all duration-300"></div>
                    <span className="text-gray-700 leading-relaxed text-sm group-hover/item:text-gray-800 transition-colors duration-300">തത്സമയ ഡാറ്റ അപ്ഡേറ്റുകളും റിപ്പോർട്ടുകളും</span>
                    </div>
                  <div className="flex items-start space-x-3 group/item hover:bg-white p-2 rounded-xl transition-all duration-300">
                    <div className="w-3 h-3 bg-slate-600 rounded-full mt-2 flex-shrink-0 group-hover/item:scale-150 group-hover/item:rotate-45 transition-all duration-300"></div>
                    <span className="text-gray-700 leading-relaxed text-sm group-hover/item:text-gray-800 transition-colors duration-300">യൂസർ-ഫ്രണ്ട്ലി ഇന്റർഫേസ്</span>
                  </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md hover:bg-white transition-all duration-300 animate-fade-in-up group">
              <h4 className="text-base font-bold text-[#002349] mb-2 flex items-center group-hover:text-[#1a3a5c] transition-colors duration-300">
                <Shield className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                സഹായം ആവശ്യമുണ്ടോ?
              </h4>
              <p className="text-gray-700 leading-relaxed text-sm group-hover:text-gray-800 transition-colors duration-300">
                  സിസ്റ്റം ഉപയോഗിക്കുന്നതിൽ എന്തെങ്കിലും പ്രശ്നമുണ്ടെങ്കിൽ നിങ്ങളുടെ സിസ്റ്റം അഡ്മിനിസ്ട്രേറ്ററുമായി ബന്ധപ്പെടുക
                </p>
            </div>
          </section>
        )}

        {/* Membership is now handled by dedicated MembershipPage route */}
        {false && activeTab === 'membership' && (
          <div className="space-y-6">
            {showKarkunForm && selectedKarkunForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-gray-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-[#002349]">Karkun Application</h3>
                    <button onClick={handleBackFromKarkunForm} className="text-gray-600 hover:text-[#002349] transition-colors text-sm flex items-center">Close</button>
                  </div>
                  <div className="p-4">
                    <KarkunForm initialData={selectedKarkunForm} isReadOnly={true} onBack={handleBackFromKarkunForm} />
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center px-4 sm:px-6 pt-4">
                <button className={`mr-3 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${membershipTab==='karkun' ? 'bg-[#002349] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => setMembershipTab('karkun')}>Karkun</button>
                <button className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${membershipTab==='rukn' ? 'bg-[#002349] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => setMembershipTab('rukn')}>Rukn</button>
              </div>
            </div>
            {membershipTab === 'karkun' && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-500">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-[#002349]">കർക്കുൻ അപേക്ഷകൾ (District)</h3>
                  <p className="text-sm text-gray-600 mt-1">Total: {membershipData.karkun.length} applications</p>
                </div>
                {membershipLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002349]"></div>
                    <span className="ml-2 text-gray-600 font-medium">Loading Karkun data...</span>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review Status</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {membershipData.karkun.map((form) => (
                          <tr
                            key={form._id}
                            onClick={() => handleViewKarkunForm(form)}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{form.name || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{form.mobile || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
  {/* Unit */}
  <span
    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
      form?.verification?.unitAdmin?.status === 'approved'
        ? 'bg-green-100 text-green-700'
        : form?.verification?.unitAdmin?.status === 'rejected'
        ? 'bg-red-100 text-red-700'
        : 'bg-yellow-100 text-yellow-700'
    }`}
  >
    Unit: {form?.verification?.unitAdmin?.status || 'pending'}
  </span>

  {/* Area */}
  <span
    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
      form?.verification?.unitAdmin?.status === 'rejected'
        ? 'bg-gray-200 text-gray-500'
        : form?.verification?.areaAdmin?.status === 'approved'
        ? 'bg-green-100 text-green-700'
        : form?.verification?.areaAdmin?.status === 'rejected'
        ? 'bg-red-100 text-red-700'
        : 'bg-yellow-100 text-yellow-700'
    }`}
  >
    Area:{' '}
    {form?.verification?.unitAdmin?.status === 'rejected'
      ? 'N/A'
      : form?.verification?.areaAdmin?.status || 'pending'}
  </span>

  {/* District */}
  <span
    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
      form?.verification?.unitAdmin?.status === 'rejected' ||
      form?.verification?.areaAdmin?.status === 'rejected'
        ? 'bg-gray-200 text-gray-500'
        : form?.verification?.districtAdmin?.status === 'approved'
        ? 'bg-green-100 text-green-700'
        : form?.verification?.districtAdmin?.status === 'rejected'
        ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-700'
    }`}
  >
    District:{' '}
    {form?.verification?.unitAdmin?.status === 'rejected' ||
    form?.verification?.areaAdmin?.status === 'rejected'
      ? 'N/A'
      : form?.verification?.districtAdmin?.status || 'pending'}
  </span>

  {/* State */}
  <span
    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
      form?.verification?.unitAdmin?.status === 'rejected' ||
      form?.verification?.areaAdmin?.status === 'rejected' ||
      form?.verification?.districtAdmin?.status === 'rejected'
        ? 'bg-gray-200 text-gray-500'
        : form?.verification?.stateAdmin?.status === 'approved'
        ? 'bg-green-100 text-green-700'
        : form?.verification?.stateAdmin?.status === 'rejected'
        ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-700'
    }`}
  >
    State:{' '}
    {form?.verification?.unitAdmin?.status === 'rejected' ||
    form?.verification?.areaAdmin?.status === 'rejected' ||
    form?.verification?.districtAdmin?.status === 'rejected'
      ? 'N/A'
      : form?.verification?.stateAdmin?.status || 'pending'}
  </span>

  {/* Final */}
  <span
    className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
      form?.status === 'approved'
        ? 'bg-green-600 text-white'
        : form?.status === 'rejected'
        ? 'bg-red-600 text-white'
        : 'bg-blue-600 text-white'
    }`}
  >
    Final: {(form?.status || 'pending').replace('_', ' ')}
  </span>
</div>

                              {(form?.verification?.unitAdmin?.comments || form?.verification?.areaAdmin?.comments || form?.verification?.districtAdmin?.comments) && (
                                <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                                  {form?.verification?.unitAdmin?.comments && (<div><span className="font-semibold">Unit reason:</span> {form.verification.unitAdmin.comments}</div>)}
                                  {form?.verification?.areaAdmin?.comments && (<div><span className="font-semibold">Area reason:</span> {form.verification.areaAdmin.comments}</div>)}
                                  {form?.verification?.districtAdmin?.comments && (<div><span className="font-semibold">District reason:</span> {form.verification.districtAdmin.comments}</div>)}
                                  {form?.verification?.stateAdmin?.comments && (<div><span className="font-semibold">State reason:</span> {form.verification.districtAdmin.comments}</div>)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewKarkunForm(form);
                                }}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#002349] bg-white border border-[#002349] rounded-xl hover:bg-gradient-to-r hover:from-[#002349] hover:to-[#1a3a5c] hover:text-white transition-all duration-300"
                              >
                                View
                              </button>
                              {form?.verification?.areaAdmin?.status === 'approved' && (form?.verification?.districtAdmin?.status || 'pending') === 'pending' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVerifyKarkunDistrict(form._id, 'approved');
                                    }}
                                    className="ml-2 inline-flex items-center px-3 py-1.5 text-xs font-semibold text-green-700 bg-white border border-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all duration-300"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVerifyKarkunDistrict(form._id, 'rejected');
                                    }}
                                    className="ml-2 inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-300"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteKarkun(form);
                                }}
                                className="ml-2 inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-300"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {showRuknForm && selectedRuknForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-gray-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-[#002349]">Rukn Application</h3>
                    <button onClick={handleBackFromRuknForm} className="text-gray-600 hover:text-[#002349] transition-colors text-sm flex items-center">Close</button>
                  </div>
                  <div className="p-4">
                    <RuknForm initialData={selectedRuknForm} isReadOnly={true} onBack={handleBackFromRuknForm} />
                  </div>
                </div>
              </div>
            )}

            {membershipTab === 'rukn' && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-500">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-[#002349]">റുക്കുൻ അപേക്ഷകൾ (District)</h3>
                  <p className="text-sm text-gray-600 mt-1">Total: {membershipData.rukn.length} applications</p>
                </div>
                {membershipLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002349]"></div>
                    <span className="ml-2 text-gray-600 font-medium">Loading Rukn data...</span>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review Status</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {membershipData.rukn.map((form) => (
                          <tr
                            key={form._id}
                            onClick={() => handleViewRuknForm(form)}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{form.name || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{form.mobile || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${form?.verification?.unitAdmin?.status==='approved'?'bg-green-100 text-green-700':form?.verification?.unitAdmin?.status==='rejected'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>Unit: {form?.verification?.unitAdmin?.status || 'pending'}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${form?.verification?.districtAdmin?.status==='approved'?'bg-green-100 text-green-700':form?.verification?.districtAdmin?.status==='rejected'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-700'}`}>District: {form?.verification?.districtAdmin?.status || 'pending'}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${form?.verification?.stateAdmin?.status==='approved'?'bg-green-100 text-green-700':form?.verification?.stateAdmin?.status==='rejected'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-700'}`}>State: {form?.verification?.stateAdmin?.status || 'pending'}</span>
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${form?.status === 'approved' ? 'bg-green-600 text-white' : form?.status === 'rejected' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>Final: {(form?.status || 'pending').replace('_',' ')}</span>
                              </div>
                              {(form?.verification?.unitAdmin?.comments || form?.verification?.districtAdmin?.comments || form?.verification?.stateAdmin?.comments) && (
                                <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                                  {form?.verification?.unitAdmin?.comments && (<div><span className="font-semibold">Unit reason:</span> {form.verification.unitAdmin.comments}</div>)}
                                  {form?.verification?.districtAdmin?.comments && (<div><span className="font-semibold">District reason:</span> {form.verification.districtAdmin.comments}</div>)}
                                  {form?.verification?.stateAdmin?.comments && (<div><span className="font-semibold">State reason:</span> {form.verification.stateAdmin.comments}</div>)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewRuknForm(form);
                                }}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#002349] bg-white border border-[#002349] rounded-xl hover:bg-gradient-to-r hover:from-[#002349] hover:to-[#1a3a5c] hover:text-white transition-all duration-300"
                              >
                                View
                              </button>
                              {form?.verification?.unitAdmin?.status === 'approved' && (form?.verification?.districtAdmin?.status || 'pending') === 'pending' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVerifyRuknDistrict(form._id, 'approved');
                                    }}
                                    className="ml-2 inline-flex items-center px-3 py-1.5 text-xs font-semibold text-green-700 bg-white border border-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all duration-300"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVerifyRuknDistrict(form._id, 'rejected');
                                    }}
                                    className="ml-2 inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-300"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRukn(form);
                                }}
                                className="ml-2 inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-300"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      
      <RejectionModal
        isOpen={showRejectionModal}
        onClose={() => {
          setShowRejectionModal(false);
          setRejectionData(null);
        }}
        onConfirm={handleConfirmRejection}
        title="Reject Application"
        message="Please enter the reason for rejection:"
        confirmText="Reject"
        cancelText="Cancel"
      />

      <ConfirmationModal
        isOpen={showDeleteKarkunModal}
        onClose={() => {
          setShowDeleteKarkunModal(false);
          setFormToDelete(null);
        }}
        onConfirm={confirmDeleteKarkun}
        title="Delete Karkun Application"
        message={`Are you sure you want to delete the Karkun application${formToDelete?.name ? ` for ${formToDelete.name}` : ''}? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="red"
      />

      <ConfirmationModal
        isOpen={showDeleteRuknModal}
        onClose={() => {
          setShowDeleteRuknModal(false);
          setFormToDelete(null);
        }}
        onConfirm={confirmDeleteRukn}
        title="Delete Rukn Application"
        message={`Are you sure you want to delete the Rukn application${formToDelete?.name ? ` for ${formToDelete.name}` : ''}? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="red"
      />

      <SuggestionModal
        isOpen={showApprovalModal}
        onClose={closeApprovalModal}
        onSubmit={handleConfirmRuknApproval}
        title="Approve Rukn Application"
        message={`You can record district-level suggestions for ${approvalContext?.name || 'this applicant'}. These notes will appear in the application form.`}
        confirmText="Approve"
        placeholder="Enter suggestions or recommendations (optional)"
      />
    </div>
    </>
  );
};

export default HomePage;