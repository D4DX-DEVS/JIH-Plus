import React, { useState } from 'react';
import { ArrowRight, Building2, Lock, Mail, Shield, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthShell from '../components/auth/AuthShell';
import { AuthButton, AuthCheckbox, AuthError, AuthField, AuthInfoBanner, AuthTabs } from '../components/auth/AuthControls';
import { useTenant } from '../tenants/TenantContext';

// "Remember me" keeps the last successful login name so the next visit only
// needs the password. Storage is namespaced per franchise (see tenants/bootstrap).
const REMEMBERED_USERNAME_KEY = 'rememberedUsername';
const REMEMBERED_ADMIN_EMAIL_KEY = 'rememberedAdminEmail';

const readRemembered = (key) => localStorage.getItem(key) || '';
const storeRemembered = (key, remember, value) => {
  if (remember) localStorage.setItem(key, value);
  else localStorage.removeItem(key);
};

const LOGIN_TABS = [
  { value: 'user', label: 'User Login', icon: Users, id: 'user-login-tab', controls: 'user-login-panel' },
  { value: 'admin', label: 'Admin Login', icon: Shield, id: 'admin-login-tab', controls: 'admin-login-panel' },
];

const ExpansionPortalLoginPage = ({ onLoginSuccess, onAdminLoginSuccess }) => {
  const navigate = useNavigate();
  const tenant = useTenant();
  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'admin'

  // User login state
  const [username, setUsername] = useState(() => readRemembered(REMEMBERED_USERNAME_KEY));
  const [password, setPassword] = useState('');
  const [rememberUser, setRememberUser] = useState(() => Boolean(readRemembered(REMEMBERED_USERNAME_KEY)));
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState('');

  // Admin login state
  const [adminEmail, setAdminEmail] = useState(() => readRemembered(REMEMBERED_ADMIN_EMAIL_KEY));
  const [adminPassword, setAdminPassword] = useState('');
  const [rememberAdmin, setRememberAdmin] = useState(() => Boolean(readRemembered(REMEMBERED_ADMIN_EMAIL_KEY)));
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
      storeRemembered(REMEMBERED_USERNAME_KEY, rememberUser, normalizedUsername);

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
      storeRemembered(REMEMBERED_ADMIN_EMAIL_KEY, rememberAdmin, adminEmail);

      onAdminLoginSuccess?.();
    } catch (error) {
      setAdminError(error.response?.data?.message || 'An error occurred during login');
    } finally {
      setAdminLoading(false);
    }
  };

  const clearUserForm = () => {
    setUsername('');
    setPassword('');
    setUserError('');
  };

  const clearAdminForm = () => {
    setAdminEmail('');
    setAdminPassword('');
    setAdminError('');
  };

  const forgotPassword = (
    <button
      type="button"
      onClick={() => navigate('/help-desk')}
      className="min-h-[44px] text-[15px] font-semibold text-[#1d4fa8] transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a5fc4]/40"
    >
      Forgot password?
    </button>
  );

  return (
    <AuthShell title={tenant.label} caps subtitle="Choose your account type to continue.">
      <AuthTabs tabs={LOGIN_TABS} value={activeTab} onChange={handleTabChange} />

      {activeTab === 'user' && (
        <form
          id="user-login-panel"
          role="region"
          aria-labelledby="user-login-tab"
          onSubmit={handleUserLogin}
          className="mt-5 space-y-5"
          aria-busy={userLoading}
        >
          <AuthInfoBanner
            icon={tenant.isFranchise ? Users : Building2}
            title="District, area or unit user"
            description="Sign in with your assigned username and password."
          />
          <AuthField
            id="username"
            label="Username"
            icon={User}
            value={username}
            onChange={(e) => { setUsername(e.target.value); if (userError) setUserError(''); }}
            placeholder="Enter username"
            disabled={userLoading}
            required
            showRequiredMark={false}
            invalid={Boolean(userError)}
            describedBy={userError ? 'user-login-error' : undefined}
            autoComplete="username"
            autoFocus
          />
          <AuthField
            id="password"
            label="Password"
            icon={Lock}
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (userError) setUserError(''); }}
            placeholder="Enter password"
            disabled={userLoading}
            required
            showRequiredMark={false}
            invalid={Boolean(userError)}
            describedBy={userError ? 'user-login-error' : undefined}
            autoComplete="current-password"
          />

          {userError && <AuthError id="user-login-error" message={userError} />}

          <div className="flex items-center justify-between gap-3">
            <AuthCheckbox
              id="remember-user"
              label="Remember me"
              checked={rememberUser}
              onChange={(e) => setRememberUser(e.target.checked)}
              disabled={userLoading}
            />
            {forgotPassword}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AuthButton type="button" variant="secondary" onClick={clearUserForm} disabled={userLoading}>
              Clear
            </AuthButton>
            <AuthButton
              type="submit"
              loading={userLoading}
              loadingLabel="Verifying..."
            >
              Login
              <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
            </AuthButton>
          </div>
        </form>
      )}

      {activeTab === 'admin' && (
        <form
          id="admin-login-panel"
          role="region"
          aria-labelledby="admin-login-tab"
          onSubmit={handleAdminLogin}
          className="mt-5 space-y-5"
          aria-busy={adminLoading}
        >
          <AuthInfoBanner
            icon={Shield}
            title="Portal administrator"
            description="Use your administrator email and password."
          />
          <AuthField
            id="adminEmail"
            label="Admin Email"
            icon={Mail}
            type="email"
            value={adminEmail}
            onChange={(e) => { setAdminEmail(e.target.value); if (adminError) setAdminError(''); }}
            placeholder="Enter admin email"
            disabled={adminLoading}
            required
            showRequiredMark={false}
            invalid={Boolean(adminError)}
            describedBy={adminError ? 'admin-login-error' : undefined}
            autoComplete="username"
            autoFocus
          />
          <AuthField
            id="adminPassword"
            label="Password"
            icon={Lock}
            type="password"
            value={adminPassword}
            onChange={(e) => { setAdminPassword(e.target.value); if (adminError) setAdminError(''); }}
            placeholder="Enter password"
            disabled={adminLoading}
            required
            showRequiredMark={false}
            invalid={Boolean(adminError)}
            describedBy={adminError ? 'admin-login-error' : undefined}
            autoComplete="current-password"
          />

          {adminError && <AuthError id="admin-login-error" message={adminError} />}

          <div className="flex items-center justify-between gap-3">
            <AuthCheckbox
              id="remember-admin"
              label="Remember me"
              checked={rememberAdmin}
              onChange={(e) => setRememberAdmin(e.target.checked)}
              disabled={adminLoading}
            />
            {forgotPassword}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AuthButton type="button" variant="secondary" onClick={clearAdminForm} disabled={adminLoading}>
              Clear
            </AuthButton>
            <AuthButton
              type="submit"
              loading={adminLoading}
              loadingLabel="Signing in..."
            >
              Login
              <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
            </AuthButton>
          </div>
        </form>
      )}
    </AuthShell>
  );
};

export default ExpansionPortalLoginPage;
