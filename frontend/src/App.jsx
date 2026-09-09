import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ErrorProvider } from './contexts/ErrorContext';
import LandingPage from './pages/LandingPage';
import { currentTenant } from './tenants/current';
import FranchiseApp from './portal/FranchiseApp';
import { useJihPortalSession, renderJihRoutes } from './portal/JihPortalRoutes';

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
import UnitAdminDetails from './pages/ihthisabi/UnitAdminDetails';
import DistrictAdminDashboard from './pages/ihthisabi/DistrictAdminDashboard';
import DistrictAreaDetails from './pages/ihthisabi/DistrictAreaDetails';
import AlternativeSubmissionForm from './pages/ihthisabi/AlternativeSubmissionForm';
import FormManagement from './pages/ihthisabi/FormManagement';
import DynamicFormsAdmin from './pages/ihthisabi/DynamicFormsAdmin';
import MekhalaNazimManagement from './pages/ihthisabi/MekhalaNazimManagement';
import MekhalaNazimReports from './pages/ihthisabi/MekhalaNazimReports';
import IhthisabiHelpDeskPage from './pages/ihthisabi/HelpDeskPage';

// Members Application (Rukn / Karkoon) — the third section, with its own DB,
// admin, auth context and token key.
import { AuthProvider as MembersAuthProvider } from './contexts/members/AuthContext';
import MembersLayout from './components/members/Layout';
import MembersProtectedRoute from './components/members/ProtectedRoute';
import MembersLoginPage from './pages/members/LoginPage';
import MembersApplicantAccessPage from './pages/members/ApplicantAccessPage';
import MembersDashboard from './pages/members/Dashboard';
import MembersApplicationsPage from './pages/members/ApplicationsPage';
import MembersApplicationDetailPage from './pages/members/ApplicationDetailPage';
import MembersAccessLinksPage from './pages/members/AccessLinksPage';
import MembersFormsPage from './pages/members/FormsPage';
import MembersFormBuilderPage from './pages/members/FormBuilderPage';
import MembersWorkflowBuilderPage from './pages/members/WorkflowBuilderPage';
import MembersRolesPage from './pages/members/RolesPage';
import MembersAccountsPage from './pages/members/AccountsPage';
import MembersMasterDataPage from './pages/members/MasterDataPage';
import MembersNotificationsPage from './pages/members/NotificationsPage';

function App() {
  // JIH Portal session (tokens + logout handlers). A franchise reuses it as-is:
  // the storage adapter installed in main.jsx namespaces its tokens.
  const session = useJihPortalSession();
  const { isAuthenticated, isAdminAuthenticated, isLoading, handleLoginSuccess, getDefaultDashboard } = session;

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

  // Franchise portals (e.g. /womens) render the JIH route tree under their own
  // basename and never see the master landing page, IHTHISABI or Members.
  if (currentTenant.isFranchise) {
    return <FranchiseApp tenant={currentTenant} session={session} />;
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
        {renderJihRoutes(session)}
        
        {/* IHTHISABI Routes - Wrapped in AuthProvider */}
        <Route path="/ihthisabi/*" element={
          <IhthisabiAuthProvider>
            <IhthisabiRoutes />
          </IhthisabiAuthProvider>
        } />

        {/* MEMBERS APPLICATION Routes.
            The applicant flow sits outside the provider: it runs on a temporary
            access-link session, not a members admin login. */}
        <Route path="/members/apply/:token" element={<MembersApplicantAccessPage />} />
        <Route path="/members/*" element={
          <MembersAuthProvider>
            <MembersRoutes />
          </MembersAuthProvider>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorProvider>
  );
}

// IHTHISABI Routes Component
const IhthisabiRoutes = () => {
  const { isAuthenticated, user, initializing } = useIhthisabiAuth();

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
              user?.role === 'districtAdmin' ? '/ihthisabi/districtadmin' :
              user?.role === 'mekhalaNazim' ? '/ihthisabi/mekhalanazim' :
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
            <ProtectedRoute allowedRoles={['rukn', 'admin', 'unitAdmin', 'districtAdmin']}>
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
            <ProtectedRoute allowedRoles={['rukn', 'admin', 'unitAdmin', 'districtAdmin']}>
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
          path="/unitadmin/details"
          element={
            <ProtectedRoute allowedRoles={['unitAdmin']}>
              <UnitAdminDetails />
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
        <Route
          path="/districtadmin"
          element={
            <ProtectedRoute allowedRoles={['districtAdmin']}>
              <DistrictAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/districtadmin/submissions"
          element={
            <ProtectedRoute allowedRoles={['districtAdmin']}>
              <DistrictAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/districtadmin/members"
          element={
            <ProtectedRoute allowedRoles={['districtAdmin']}>
              <DistrictAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/districtadmin/areas/:area"
          element={
            <ProtectedRoute allowedRoles={['districtAdmin']}>
              <DistrictAreaDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/district-admins"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/mekhala-nazims"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MekhalaNazimManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dynamic-forms"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DynamicFormsAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dynamic-forms/create"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DynamicFormsAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dynamic-forms/submissions/:submissionId"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DynamicFormsAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dynamic-forms/:formId"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DynamicFormsAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dynamic-forms/:formId/edit"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DynamicFormsAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dynamic-forms/:formId/submissions"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DynamicFormsAdmin />
            </ProtectedRoute>
          }
        />

        {/* Mekhala Nazim Routes — assigned reports only */}
        <Route
          path="/mekhalanazim"
          element={
            <ProtectedRoute allowedRoles={['mekhalaNazim']}>
              <MekhalaNazimReports view="list" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mekhalanazim/reports/:reportId"
          element={
            <ProtectedRoute allowedRoles={['mekhalaNazim']}>
              <MekhalaNazimReports view="form" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mekhalanazim/submissions/:submissionId"
          element={
            <ProtectedRoute allowedRoles={['mekhalaNazim']}>
              <MekhalaNazimReports view="submission" />
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
            <ProtectedRoute allowedRoles={['rukn', 'unitAdmin', 'admin', 'districtAdmin', 'mekhalaNazim']}>
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
                  user?.role === 'districtAdmin' ? '/ihthisabi/districtadmin' :
                  user?.role === 'mekhalaNazim' ? '/ihthisabi/mekhalanazim' :
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

// Unmatched /members/* deep links land here instead of silently bouncing to
// the dashboard, matching the ihthisabi routes' NotFound behavior.
const MembersNotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h2>
        <p className="text-gray-600 mb-4">This page doesn't exist or has moved.</p>
        <button onClick={() => navigate('/members')} className="px-4 py-2 rounded-lg bg-[#5b21b6] text-white">
          Go to dashboard
        </button>
      </div>
    </div>
  );
};

// MEMBERS APPLICATION Routes Component
const MembersRoutes = () => (
  <Routes>
    <Route path="/login" element={<MembersLoginPage />} />

    <Route
      path="/"
      element={
        <MembersProtectedRoute>
          <MembersLayout />
        </MembersProtectedRoute>
      }
    >
      <Route index element={<MembersDashboard />} />
      <Route path="applications" element={<MembersApplicationsPage />} />
      <Route path="applications/:id" element={<MembersApplicationDetailPage />} />
      <Route path="notifications" element={<MembersNotificationsPage />} />

      <Route
        path="access-links"
        element={
          <MembersProtectedRoute canCreateAccessLinksOnly>
            <MembersAccessLinksPage />
          </MembersProtectedRoute>
        }
      />

      {/* Configuration — super admin only */}
      <Route path="forms" element={<MembersProtectedRoute superAdminOnly><MembersFormsPage /></MembersProtectedRoute>} />
      <Route path="forms/:id" element={<MembersProtectedRoute superAdminOnly><MembersFormBuilderPage /></MembersProtectedRoute>} />
      <Route path="workflows" element={<MembersProtectedRoute superAdminOnly><MembersWorkflowBuilderPage /></MembersProtectedRoute>} />
      <Route path="roles" element={<MembersProtectedRoute superAdminOnly><MembersRolesPage /></MembersProtectedRoute>} />
      <Route path="accounts" element={<MembersProtectedRoute superAdminOnly><MembersAccountsPage /></MembersProtectedRoute>} />
      <Route path="master-data" element={<MembersProtectedRoute superAdminOnly><MembersMasterDataPage /></MembersProtectedRoute>} />
    </Route>

    <Route path="*" element={<MembersNotFound />} />
  </Routes>
);

export default App;