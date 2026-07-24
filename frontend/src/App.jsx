import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorProvider } from './contexts/ErrorContext';
import LandingPage from './pages/LandingPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AreaDashboardPage from './pages/AreaDashboardPage';
import UnitDashboardPage from './pages/UnitDashboardPage';
import DistrictDashboardPage from './pages/DistrictDashboardPage';
import AreaSurveyPage from './pages/AreaSurveyPage';
import AreaSurveyDetailPage from './pages/AreaSurveyDetailPage';
import AreaSurveyEditPage from './pages/AreaSurveyEditPage';
import DistrictSurveyPage from './pages/DistrictSurveyPage';
import { validateUserToken, validateAdminToken } from './utils/auth';
import DistrictMonthlyDetailPage from './pages/DistrictMonthlyDetailPage';
import AreaMonthlyDetailPage from './pages/AreaMonthlyDetailPage';
import UnitMonthlyDetailPage from './pages/UnitMonthlyDetailPage';
import RuknForm from './components/forms/membership/RuknForm';
import KarkunForm from './components/forms/membership/KarkunForm';
import KarkunDetailPage from './pages/KarkunDetailPage';
import RuknDetailPage from './pages/RuknDetailPage';
import ReportsPage from './pages/ReportsPage';
import UserReportsPage from './pages/UserReportsPage';
import ReportSubmissionsPage from './pages/ReportSubmissionsPage';
import NotificationsPage from './pages/NotificationsPage';
import MembershipPage from './pages/MembershipPage';
import HelpDeskPage from './pages/HelpDeskPage';
import LocationMasterPage from './pages/LocationMasterPage';
import DynamicSubmissionsPage from './pages/DynamicSubmissionsPage';
import TargetsPage from './pages/TargetsPage';

// IHTHISABI imports
import { AuthProvider as IhthisabiAuthProvider, useAuth as useIhthisabiAuth } from './contexts/ihthisabi/AuthContext';
import Layout from './components/ihthisabi/Layout';
import ProtectedRoute from './components/ihthisabi/ProtectedRoute';
import LoginPage from './pages/ihthisabi/LoginPage';
import UserDashboard from './pages/ihthisabi/UserDashboard';
import AdminDashboard from './pages/ihthisabi/AdminDashboard';
import AllSubmissions from './pages/ihthisabi/AllSubmissions';
import Consolidation from './pages/ihthisabi/Consolidation';
import SubmissionForm from './pages/ihthisabi/SubmissionForm';
import SubmissionSuccess from './pages/ihthisabi/SubmissionSuccess';
import SubmissionDetails from './pages/ihthisabi/SubmissionDetails';
import ProfilePage from './pages/ihthisabi/ProfilePage';
import NotFound from './pages/ihthisabi/NotFound';
import UnitAdminDashboard from './pages/ihthisabi/UnitAdminDashboard';
import AlternativeSubmissionForm from './pages/ihthisabi/AlternativeSubmissionForm';
import FormManagement from './pages/ihthisabi/FormManagement';
import IhthisabiHelpDeskPage from './pages/ihthisabi/HelpDeskPage';
import ExpansionPortalLoginPage from './pages/ExpansionPortalLoginPage';
import ExpansionPortalDashboardPage from './pages/ExpansionPortalDashboardPage';

function App() {
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
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    setIsAdminAuthenticated(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorProvider>
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            isAuthenticated || isAdminAuthenticated ? (
              <Navigate to={isAdminAuthenticated ? "/expansion-portal/dashboard" : getDefaultDashboard()} replace />
            ) : (
              <LandingPage onLoginSuccess={handleLoginSuccess} />
            )
          } 
        />
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
          path="/membership"
          element={
            isAuthenticated || isAdminAuthenticated ? (
              <MembershipPage />
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
        <Route
          path="/rukn-form"
          element={
            <RuknForm />
          }
        />
        <Route
          path="/karkun-form"
          element={
            <KarkunForm />
          }
        />
        <Route
          path="/karkun/:id"
          element={
            isAuthenticated || isAdminAuthenticated ? (
              <KarkunDetailPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/rukn/:id"
          element={
            isAuthenticated || isAdminAuthenticated ? (
              <RuknDetailPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        
        {/* IHTHISABI Routes - Wrapped in AuthProvider */}
        <Route path="/ihthisabi/*" element={
          <IhthisabiAuthProvider>
            <IhthisabiRoutes />
          </IhthisabiAuthProvider>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorProvider>
  );
}

// IHTHISABI Routes Component
const IhthisabiRoutes = () => {
  const { isAuthenticated, user, loading } = useIhthisabiAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AIKYAM...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? (
            <Navigate to={
              user?.role === 'admin' ? '/ihthisabi/admin' : 
              user?.role === 'unitAdmin' ? '/ihthisabi/unitadmin' : 
              '/ihthisabi/dashboard'
            } replace />
          ) : (
            <LoginPage />
          )
        } 
      />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* User Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['rukn', 'unitAdmin']}>
              <UserDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/submit" 
          element={
            <ProtectedRoute allowedRoles={['rukn']}>
              <SubmissionForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/submission-success" 
          element={
            <ProtectedRoute allowedRoles={['rukn']}>
              <SubmissionSuccess />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/submissions/:id" 
          element={
            <ProtectedRoute allowedRoles={['rukn', 'admin', 'unitAdmin']}>
              <SubmissionDetails />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/alternative-submission" 
          element={
            <ProtectedRoute allowedRoles={['rukn', 'unitAdmin']}>
              <AlternativeSubmissionForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/alternative-submissions/:id" 
          element={
            <ProtectedRoute allowedRoles={['rukn', 'admin', 'unitAdmin']}>
              <AlternativeSubmissionForm />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/members" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/unit-admins" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/unit-reply" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/user-management" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/archive" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/abroad-countries" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/abroad-members" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/master-data" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/submissions" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AllSubmissions />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/consolidation" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Consolidation />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/form-management" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <FormManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/unitadmin" 
          element={
            <ProtectedRoute allowedRoles={['unitAdmin']}>
              <UnitAdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/unitadmin/submissions" 
          element={
            <ProtectedRoute allowedRoles={['unitAdmin']}>
              <UnitAdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/unitadmin/members" 
          element={
            <ProtectedRoute allowedRoles={['unitAdmin']}>
              <UnitAdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/unitadmin/submit-form" 
          element={
            <ProtectedRoute allowedRoles={['unitAdmin']}>
              <SubmissionForm userRole="unitAdmin" />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/unitadmin/submission-details/:id" 
          element={
            <ProtectedRoute allowedRoles={['unitAdmin']}>
              <SubmissionDetails userRole="unitAdmin" />
            </ProtectedRoute>
          } 
        />
        
        {/* Common Routes */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/help-desk" 
          element={
            <ProtectedRoute allowedRoles={['rukn', 'unitAdmin', 'admin']}>
              <IhthisabiHelpDeskPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Default redirect */}
        <Route 
          path="/" 
          element={
            <Navigate 
              to={
                isAuthenticated ? (
                  user?.role === 'admin' ? '/ihthisabi/admin' : 
                  user?.role === 'unitAdmin' ? '/ihthisabi/unitadmin' : 
                  '/ihthisabi/dashboard'
                ) : '/ihthisabi/login'
              } 
              replace 
            />
          } 
        />
      </Route>
      
      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;