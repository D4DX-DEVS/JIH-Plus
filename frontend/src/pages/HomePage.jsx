import React, { useState } from 'react';
import { Calendar, FileText, LogOut, User, BarChart3, Home, Info, Bell, ChevronRight, Star, TrendingUp, Users, Shield, Clock } from 'lucide-react';
import jihLogo from '../assets/LogoColor.png';

const HomePage = ({
  onLogout,
  onNavigateToYearly,
  onNavigateToMonthly,
  onNavigateToStats,
  onNavigateToNotifications,
  onNavigateToReports = () => {},
  userData
}) => {
  // The overview is all this page renders; membership moved to its own section.
  const [activeTab] = useState('overview');

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
                  className="w-full min-h-[44px] bg-[#957C3D] hover:bg-[#8A6F35] text-white py-2 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 text-xs hover:shadow-md ease-out"
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
                  className="w-full min-h-[44px] bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 text-xs hover:shadow-md ease-out"
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
                  className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 text-xs hover:shadow-md ease-out"
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
                  className="w-full min-h-[44px] bg-[#002349] hover:bg-[#1a3a5c] text-white py-2 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 text-xs hover:shadow-md ease-out"
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

      </main>
      
    </div>
    </>
  );
};

export default HomePage;