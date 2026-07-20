import React, { useState } from 'react';
import { ArrowRight, Shield, Eye, EyeOff, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jihLogo from '../assets/LogoColor.png';
import d4dxLogo from '../assets/d4dx_logo.png';

const AdminLoginPage = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/login`, {
        email: email,
        password: password
      });

      // Store admin token and data in localStorage
      localStorage.setItem('adminToken', response.data.token);
      localStorage.setItem('adminData', JSON.stringify(response.data.admin));

      // Call the callback to handle successful login
      onLoginSuccess();
    } catch (error) {
      console.error('Admin login error:', error);
      setError(error.response?.data?.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative">
      {/* Home Icon - Floating */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-6 right-6 z-50 text-[#002349] hover:text-[#1a3a5c] transition-colors duration-300 cursor-pointer"
        aria-label="Back to Home"
      >
        <Home className="w-6 h-6" />
      </button>

      {/* Main Content */}
      <main className="h-full overflow-hidden max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Logo and Heading Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-4">
            <img src={jihLogo} alt="JIH Logo" className="h-20 sm:h-20 w-auto mx-auto" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#002349] mb-3 tracking-tight" style={{ fontFamily: 'Cinzel, serif' }}>
            Admin Access Portal
          </h1>
          
        </div>

        {/* Admin Login Form */}
        <div className="max-w-md mx-auto">

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#002349] mb-2">
                Admin Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-[#002349] text-center text-sm transition-all duration-200 bg-gray-50 hover:bg-white"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#002349] mb-2">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-2.5 pr-12 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-[#002349] text-center text-sm transition-all duration-200 bg-gray-50 hover:bg-white"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-xs font-medium text-center">{error}</p>
              </div>
            )}

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading}
                className="mx-auto max-w-xs bg-[#002349] hover:bg-[#1a3a5c] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 text-sm shadow-md hover:shadow-lg"
              >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Login as Administrator</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 text-center">
              <strong>Security Notice:</strong> This is a restricted administrative area. 
              Only authorized personnel should access this portal.
            </p>
          </div>
        </div>

        {/* D4DX Footer */}
        <div className="text-center mt-28 pb-8">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="text-sm text-gray-600">Powered by</span>
            <img src={d4dxLogo} alt="D4DX Logo" className="h-6 w-auto" />
            <span className="text-sm font-semibold text-[#002349]">D4DX Innovations LLP</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLoginPage;


