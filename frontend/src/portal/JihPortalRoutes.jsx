import React, { useState, useEffect } from 'react';
import { Route, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLoginPage from '../pages/AdminLoginPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import AreaDashboardPage from '../pages/AreaDashboardPage';
import UnitDashboardPage from '../pages/UnitDashboardPage';
import DistrictDashboardPage from '../pages/DistrictDashboardPage';
import AreaSurveyPage from '../pages/AreaSurveyPage';
import AreaSurveyDetailPage from '../pages/AreaSurveyDetailPage';
import AreaSurveyEditPage from '../pages/AreaSurveyEditPage';
import DistrictSurveyPage from '../pages/DistrictSurveyPage';
import { validateUserToken, validateAdminToken } from '../utils/auth';
import DistrictMonthlyDetailPage from '../pages/DistrictMonthlyDetailPage';
import AreaMonthlyDetailPage from '../pages/AreaMonthlyDetailPage';
import UnitMonthlyDetailPage from '../pages/UnitMonthlyDetailPage';
import ReportsPage from '../pages/ReportsPage';
import UserReportsPage from '../pages/UserReportsPage';
import ReportSubmissionsPage from '../pages/ReportSubmissionsPage';
import NotificationsPage from '../pages/NotificationsPage';
import HelpDeskPage from '../pages/HelpDeskPage';
import LocationMasterPage from '../pages/LocationMasterPage';
import DynamicSubmissionsPage from '../pages/DynamicSubmissionsPage';
import TargetsPage from '../pages/TargetsPage';
import ExpansionPortalLoginPage from '../pages/ExpansionPortalLoginPage';
import ExpansionPortalDashboardPage from '../pages/ExpansionPortalDashboardPage';

/**
 * The JIH Portal, shell-agnostic.
 *
 * `useJihPortalSession` owns the user/admin token state and the logout
 * handlers; `renderJihRoutes` returns the portal's <Route> elements. App.jsx
 * mounts them at the site root for the master portal and FranchiseApp.jsx
 * mounts the very same elements under a franchise basename (e.g. /womens), so
 * a franchise is the JIH Portal byte-for-byte with its own data.
 */
export function useJihPortalSession() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Validate both user and admin tokens
        const [userValid, adminValid] = await Promise.all([
          validateUserToken(),
          validateAdminToken()
        ]);
        
        setIsAuthenticated(userValid);
        setIsAdminAuthenticated(adminValid);
      } catch (error) {
        console.error('Error checking authentication:', error);
        // On error, assume not authenticated
        setIsAuthenticated(false);
        setIsAdminAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    setIsAdminAuthenticated(false);
    toast.success('Logged out successfully');
  };

  // Helper function to determine default dashboard based on user data
  const getDefaultDashboard = () => {
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const role = userData.role;
      
      if (role === 'area' && userData.areaId) {
        return `/area-dashboard/${userData.areaId}`;
      } else if (role === 'unit' && userData.unitId) {
        return `/unit-dashboard/${userData.unitId}`;
      } else if (role === 'district' && userData.districtId) {
        return `/district-dashboard/${userData.districtId}`;
      }
      return '/dashboard'; // fallback to default dashboard
    } catch (error) {
      console.error('Error parsing user data:', error);
      return '/dashboard';
    }
  };

  return {
    isAuthenticated,
    isAdminAuthenticated,
    isLoading,
    handleLoginSuccess,
    handleAdminLoginSuccess,
    handleLogout,
    handleAdminLogout,
    getDefaultDashboard
  };
}

export const renderJihRoutes = (session) => {
  const {
    isAuthenticated,
    isAdminAuthenticated,
    handleLoginSuccess,
    handleAdminLoginSuccess,
    handleLogout,
    handleAdminLogout,
    getDefaultDashboard
  } = session;

  return (
    <>
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? (
              <Navigate to={getDefaultDashboard()} replace />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/admin-login" 
          element={
            isAdminAuthenticated ? (
              <Navigate to="/admin-dashboard" replace />
            ) : (
              <AdminLoginPage onLoginSuccess={handleAdminLoginSuccess} />
            )
          } 
        />
        <Route
          path="/expansion-portal/login"
          element={
            isAdminAuthenticated ? (
              <Navigate to="/expansion-portal/dashboard" replace />
            ) : isAuthenticated ? (
              <Navigate to={getDefaultDashboard()} replace />
            ) : (
              <ExpansionPortalLoginPage
                onLoginSuccess={handleLoginSuccess}
                onAdminLoginSuccess={handleAdminLoginSuccess}
              />
            )
          }
        />
        <Route
          path="/expansion-portal/dashboard"
          element={
            isAdminAuthenticated ? (
              <ExpansionPortalDashboardPage onLogout={handleAdminLogout} />
            ) : (
              <Navigate to="/expansion-portal/login" replace />
            )
          }
        />
        <Route 
          path="/admin-dashboard" 
          element={
            isAdminAuthenticated ? (
              <AdminDashboardPage onLogout={handleAdminLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/admin/master-data"
          element={
            isAdminAuthenticated ? (
              <LocationMasterPage onLogout={handleAdminLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/admin/dynamic-submissions/:type"
          element={
            isAdminAuthenticated ? (
              <DynamicSubmissionsPage scope="admin" onLogout={handleAdminLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/district/dynamic-submissions/:type"
          element={
            isAuthenticated ? (
              <DynamicSubmissionsPage scope="district" onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/area/dynamic-submissions/:type"
          element={
            isAuthenticated ? (
              <DynamicSubmissionsPage scope="area" onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route 
          path="/create-report" 
          element={
            isAdminAuthenticated ? (
              <ReportsPage onLogout={handleAdminLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/view-reports" 
          element={
            isAdminAuthenticated ? (
              <ReportsPage onLogout={handleAdminLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/view-report/:id" 
          element={
            isAdminAuthenticated ? (
              <ReportsPage onLogout={handleAdminLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/edit-report/:id" 
          element={
            isAdminAuthenticated ? (
              <ReportsPage onLogout={handleAdminLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route
          path="/targets"
          element={
            isAdminAuthenticated || isAuthenticated ? (
              <TargetsPage onLogout={isAdminAuthenticated ? handleAdminLogout : handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route 
          path="/report-submissions" 
          element={
            isAdminAuthenticated ? (
              <ReportSubmissionsPage onLogout={handleAdminLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/report-submissions/:id" 
          element={
            isAdminAuthenticated ? (
              <ReportSubmissionsPage onLogout={handleAdminLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/form" 
          element={
            isAuthenticated ? (
              <Navigate to={getDefaultDashboard()} replace />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/district-dashboard/:districtId"
          element={
            isAuthenticated ? (
              <DistrictDashboardPage onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route 
          path="/area-dashboard/:areaId" 
          element={
            isAuthenticated ? (
              <AreaDashboardPage onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route 
          path="/unit-dashboard/:unitId" 
          element={
            isAuthenticated || isAdminAuthenticated ? (
              <UnitDashboardPage onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/user-reports"
          element={
            isAuthenticated ? (
              <UserReportsPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/notifications"
          element={
            isAuthenticated || isAdminAuthenticated ? (
              <NotificationsPage 
                onLogout={isAdminAuthenticated ? handleAdminLogout : handleLogout}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/help-desk"
          element={<HelpDeskPage />}
        />
        <Route 
          path="/area-survey" 
          element={
            isAuthenticated || isAdminAuthenticated ? (
              <AreaSurveyPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route 
          path="/area-survey-detail/:surveyId" 
          element={
            isAuthenticated ? (
              <AreaSurveyDetailPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route 
          path="/area-survey-edit/:surveyId" 
          element={
            isAuthenticated ? (
              <AreaSurveyEditPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route 
          path="/district-survey" 
          element={
            isAuthenticated || isAdminAuthenticated ? (
              <DistrictSurveyPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        {/* Monthly detail routes (admin or user with access) */}
        <Route
          path="/monthly/district/:id"
          element={
            isAuthenticated || isAdminAuthenticated ? (
              <DistrictMonthlyDetailPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/monthly/area/:id"
          element={
            isAuthenticated || isAdminAuthenticated ? (
              <AreaMonthlyDetailPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/monthly/unit/:id"
          element={
            isAuthenticated || isAdminAuthenticated ? (
              <UnitMonthlyDetailPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
    </>
  );
};
