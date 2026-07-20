import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, AlertTriangle } from 'lucide-react'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Error Icon */}
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100">
          <AlertTriangle className="h-12 w-12 text-red-600" />
        </div>

        {/* Error Message */}
        <div>
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            404
          </h1>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Page Not Found
          </h2>
          <p className="text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Branding */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-primary mb-2">
            IHTHISABI REPORT
          </h3>
          <p className="text-gray-600 text-sm">&nbsp;</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('dashboard')}
            className="w-full btn-primary py-3 text-base font-medium"
          >
            <Home className="w-5 h-5 mr-2 inline" />
            Go to Dashboard
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="w-full btn-outline py-3 text-base font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2 inline" />
            Go Back
          </button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact the administrator.
          </p>
        </div>
      </div>
    </div>
  )
}

export default NotFound
