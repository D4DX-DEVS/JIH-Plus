import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Home, FileText, Calendar } from 'lucide-react'

const SubmissionSuccess = () => {
  const navigate = useNavigate()

  return (
    <div className="ih-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Success Animation */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-12 w-12 text-green-600 animate-pulse" />
          </div>
          
          {/* Branding — the mobile app bar already names the app/screen, so this
              splash heading is desktop-only to avoid a duplicate header on phones. */}
          <div className="hidden lg:block mb-8">
            <h1 className="text-4xl font-bold text-accent mb-2">
              IHTHISABI REPORT
            </h1>
            <p className="text-gray-600 text-lg">&nbsp;</p>
          </div>

          {/* Success Message */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Submission Successful!
            </h2>
            <p className="text-gray-600 mb-6">
              Your 3-month activity report has been submitted successfully. 
              Thank you for your contribution to the IHTHISABI REPORT community.
            </p>

            {/* Submission Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center text-sm text-gray-600 mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                Submitted on {new Date().toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <p className="text-xs text-gray-500 text-center">
                Your submission is now under review
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('dashboard')}
                className="w-full btn-primary py-3 text-base font-medium"
              >
                <Home className="w-5 h-5 mr-2 inline" />
                Back to Dashboard
              </button>
              
            </div>
          </div>

          {/* Footer Message */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Keep up the great work! Your dedication helps strengthen our community.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubmissionSuccess
