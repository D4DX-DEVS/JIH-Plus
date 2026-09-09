import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorProvider } from '../contexts/ErrorContext';
import { TenantProvider } from '../tenants/TenantContext';
import { renderJihRoutes } from './JihPortalRoutes';

// "/" inside a franchise is not a landing page: it sends a logged-in user to
// their dashboard and a logged-out one back to the shared portal chooser,
// which lives outside this router's basename (hence the hard navigation).
// Every existing `navigate('/')` in the JIH pages therefore keeps working.
const LeaveToLanding = () => {
  useEffect(() => {
    window.location.replace('/');
  }, []);
  return null;
};

const FranchiseHome = ({ session }) => {
  if (session.isAdminAuthenticated) {
    return <Navigate to="/expansion-portal/dashboard" replace />;
  }
  if (session.isAuthenticated) {
    return <Navigate to={session.getDefaultDashboard()} replace />;
  }
  return <LeaveToLanding />;
};

/**
 * The JIH Portal route tree mounted under a franchise basename (e.g. /womens).
 * Pages keep their absolute `navigate('/admin-dashboard')` calls; the router
 * basename turns them into /womens/admin-dashboard.
 */
export default function FranchiseApp({ tenant, session }) {
  return (
    <TenantProvider tenant={tenant}>
      <ErrorProvider>
        <BrowserRouter basename={tenant.basePath}>
          <Routes>
            <Route path="/" element={<FranchiseHome session={session} />} />
            {renderJihRoutes(session)}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorProvider>
    </TenantProvider>
  );
}
