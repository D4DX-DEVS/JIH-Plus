import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Shield, Users, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BrandLogo from '../components/branding/BrandLogo';

const ExpansionPortalLoginPage = ({ onLoginSuccess, onAdminLoginSuccess }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'admin'

  // User login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState('');

  // Admin login state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setUserError('');
    setAdminError('');
  };

  const handleUserLogin = async (e) => {
    e.preventDefault();
    setUserLoading(true);
    setUserError('');

    try {
      const normalizedUsername = username.trim().toLowerCase();
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/user/login/unified`,
        { username: normalizedUsername, password: password.trim() },
        { headers: { 'Content-Type': 'application/json' } }
      );

      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('userData', JSON.stringify(response.data.user));

      const userType = response.data.userType;
      const userData = response.data.user;

      onLoginSuccess?.();

      switch (userType) {
        case 'district':
          navigate(`/district-dashboard/${encodeURIComponent(userData.districtId)}`);
          break;
        case 'area':
          navigate(`/area-dashboard/${encodeURIComponent(userData.areaId)}`);
          break;
        case 'unit':
          navigate(`/unit-dashboard/${encodeURIComponent(userData.unitId)}`);
          break;
        default:
          setUserError('Invalid user type received from server');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setUserError(error.response?.data?.message || 'Invalid credentials. Please check and try again.');
      } else if (error.response?.status === 400) {
        setUserError(error.response?.data?.message || 'Invalid request. Please check your credentials.');
      } else if (error.response?.status >= 500) {
        setUserError('Server error. Please try again later.');
      } else if (!error.response) {
        setUserError('Network error. Please check your connection and try again.');
      } else {
        setUserError(error.response?.data?.message || 'An error occurred during login');
      }
    } finally {
      setUserLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError('');

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/login`, {
        email: adminEmail,
        password: adminPassword
      });

      localStorage.setItem('adminToken', response.data.token);
      localStorage.setItem('adminData', JSON.stringify(response.data.admin));

      onAdminLoginSuccess?.();
    } catch (error) {
      setAdminError(error.response?.data?.message || 'An error occurred during login');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
      <div className="mobile-readable-content min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative">
        {/* Return to portal selection */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="fixed left-3.5 top-3.5 z-50 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-[#002349] transition-colors duration-300 hover:bg-white/70 hover:text-[#1a3a5c]"
        >
          <ArrowLeft className="h-4 w-4" />
          All portals
        </button>

        {/* Main Content */}
        <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-md w-full space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto flex items-center justify-center mb-4">
                <BrandLogo alt="JIH Logo" size="xl" />
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold text-[#002349] mb-3 tracking-tight"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                JIH Portal
              </h1>
              <p className="text-sm text-gray-600">Choose your account type to continue.</p>
            </div>

            {/* Tab Toggle */}
            <div className="flex justify-center gap-4 mb-6" role="group" aria-label="Login type">
              <button
                type="button"
                id="user-login-tab"
                aria-pressed={activeTab === 'user'}
                aria-controls="user-login-panel"
                onClick={() => handleTabChange('user')}
                className={`min-h-[44px] px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === 'user'
                    ? 'bg-[#002349] text-white shadow-md'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>User Login</span>
              </button>
              <button
                type="button"
                id="admin-login-tab"
                aria-pressed={activeTab === 'admin'}
                aria-controls="admin-login-panel"
                onClick={() => handleTabChange('admin')}
                className={`min-h-[44px] px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === 'admin'
                    ? 'bg-[#002349] text-white shadow-md'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin Login</span>
              </button>
            </div>

            {/* User Login Form */}
            {activeTab === 'user' && (
              <div id="user-login-panel" role="region" aria-labelledby="user-login-tab" className="space-y-5 animate-fade-in">
                <form onSubmit={handleUserLogin} className="space-y-5" aria-busy={userLoading}>
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-[#002349]">
                    <p className="font-semibold">District, area or unit user</p>
                    <p className="mt-0.5 text-xs text-gray-600">Sign in with your assigned username and password.</p>
                  </div>
                  <div>
                    <label htmlFor="username" className="block text-xs font-semibold text-[#002349] mb-2">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); if (userError) setUserError(''); }}
                      placeholder="Enter username"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-[#002349] text-base transition-all duration-200 bg-gray-50 hover:bg-white"
                      disabled={userLoading}
                      aria-invalid={Boolean(userError)}
                      aria-describedby={userError ? 'user-login-error' : undefined}
                      autoComplete="username"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-[#002349] mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if (userError) setUserError(''); }}
                        placeholder="Enter password"
                        className="w-full px-4 py-2.5 pr-10 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-[#002349] text-base transition-all duration-200 bg-gray-50 hover:bg-white"
                        disabled={userLoading}
                        aria-invalid={Boolean(userError)}
                        aria-describedby={userError ? 'user-login-error' : undefined}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-[#002349]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {userError && (
                    <div id="user-login-error" role="alert" aria-live="assertive" className="bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-start space-x-2 animate-fade-in">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-700 font-medium">{userError}</p>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => { setUsername(''); setPassword(''); setUserError(''); }}
                      className="flex-1 min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-3 rounded-lg transition-all duration-200 text-xs shadow-sm hover:shadow-md"
                      disabled={userLoading}
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      disabled={userLoading || !username.trim() || !password.trim()}
                      className="flex-1 min-h-[44px] bg-[#957C3D] hover:bg-[#c9a854] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 text-xs shadow-md hover:shadow-lg"
                    >
                      {userLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Login</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Admin Login Form */}
            {activeTab === 'admin' && (
              <div id="admin-login-panel" role="region" aria-labelledby="admin-login-tab" className="space-y-5 animate-fade-in">
                <form onSubmit={handleAdminLogin} className="space-y-5" aria-busy={adminLoading}>
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-[#002349]">
                    <p className="font-semibold">Portal administrator</p>
                    <p className="mt-0.5 text-xs text-gray-600">Use your administrator email and password.</p>
                  </div>
                  <div>
                    <label htmlFor="adminEmail" className="block text-xs font-semibold text-[#002349] mb-2">
                      Admin Email
                    </label>
                    <input
                      id="adminEmail"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => { setAdminEmail(e.target.value); if (adminError) setAdminError(''); }}
                      placeholder="admin@example.com"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-[#002349] text-center text-base transition-all duration-200 bg-gray-50 hover:bg-white"
                      disabled={adminLoading}
                      aria-invalid={Boolean(adminError)}
                      aria-describedby={adminError ? 'admin-login-error' : undefined}
                      autoComplete="username"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label htmlFor="adminPassword" className="block text-xs font-semibold text-[#002349] mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="adminPassword"
                        type={showAdminPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => { setAdminPassword(e.target.value); if (adminError) setAdminError(''); }}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 pr-10 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-[#002349] text-base transition-all duration-200 bg-gray-50 hover:bg-white"
                        disabled={adminLoading}
                        aria-invalid={Boolean(adminError)}
                        aria-describedby={adminError ? 'admin-login-error' : undefined}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-[#002349]"
                        aria-label={showAdminPassword ? "Hide password" : "Show password"}
                      >
                        {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {adminError && (
                    <div id="admin-login-error" role="alert" aria-live="assertive" className="bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-start space-x-2 animate-fade-in">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-700 font-medium">{adminError}</p>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <button
                      type="submit"
                      disabled={adminLoading || !adminEmail.trim() || !adminPassword.trim()}
                      className="w-full min-h-[44px] bg-[#002349] hover:bg-[#1a3a5c] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 text-sm shadow-md hover:shadow-lg"
                    >
                      {adminLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Signing in...</span>
                        </>
                      ) : (
                        'Sign In as Admin'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default ExpansionPortalLoginPage;
