import React, { createContext, useContext } from 'react';
import { DEFAULT_TENANT } from './registry';

// Defaults to the master portal, so JIH pages can call useTenant() without a
// provider; FranchiseApp wraps its tree in <TenantProvider>.
const TenantContext = createContext(DEFAULT_TENANT);

export const TenantProvider = ({ tenant, children }) => (
  <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
);

export const useTenant = () => useContext(TenantContext);
