import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import { currentTenant } from './tenants/current'
import { installTenantAdapters } from './tenants/bootstrap'
import App from './App.jsx'

// Franchise portals (/womens/...) patch API prefix + storage namespace before
// any page module runs; the master portal is untouched.
installTenantAdapters(currentTenant)
import PWAUpdatePrompt from './components/PWAUpdatePrompt.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <PWAUpdatePrompt />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#BFA181',
            secondary: '#fff',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  </StrictMode>,
)