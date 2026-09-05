import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { useForm } from '../contexts/FormContext';
import axios from 'axios';
import PartA from '../components/forms/monthly/PartA';
import PartB from '../components/forms/monthly/PartB';
import PartC from '../components/forms/monthly/PartC';
import PartD from '../components/forms/monthly/PartD';
import PartE from '../components/forms/monthly/PartE';
import ConfirmationModal from '../components/modals/ConfirmationModal';

const FormPage = ({ onBack, onSubmit, editingForm, isAdmin = false }) => {
  const { currentStep, nextStep, prevStep, formData, setFormData, validateCurrentStep } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const hasUnsavedChanges = currentStep > 1 || !!formData?.district;

  const handleCloseClick = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  // Load editing form data if provided
  React.useEffect(() => {
    if (editingForm) {
      // Ensure all required fields are present with proper defaults
      const normalizedFormData = {
        district: editingForm.district || '',
        partA: {
          totalPopulation: editingForm.partA?.totalPopulation || null,
          muslimPercentage: editingForm.partA?.muslimPercentage || null,
          hinduPercentage: editingForm.partA?.hinduPercentage || null,
          christianPercentage: editingForm.partA?.christianPercentage || null,
          othersPercentage: editingForm.partA?.othersPercentage || null,
          movementPercentage: editingForm.partA?.movementPercentage || null,
          majorityInReligiousOrganizations: editingForm.partA?.majorityInReligiousOrganizations || '',
          secondPosition: editingForm.partA?.secondPosition || '',
          thirdPosition: editingForm.partA?.thirdPosition || '',
          ourPosition: editingForm.partA?.ourPosition || '',
          morePoliticalInfluence: editingForm.partA?.morePoliticalInfluence || ''
        },
        partB: {
          organizations: editingForm.partB?.organizations || {},
          thawheedMaraa: editingForm.partB?.thawheedMaraa || { existing: 0, students: 0, nonWorkers: 0 },
          qscMen: editingForm.partB?.qscMen || { existing: 0, students: 0, nonWorkers: 0 },
          qscWomen: editingForm.partB?.qscWomen || { existing: 0, students: 0, nonWorkers: 0 },
          jumaMosques: editingForm.partB?.jumaMosques || { count: 0, averageAttendees: 0, nonWorkersApprox: 0 },
          institutions: editingForm.partB?.institutions || {}
        },
        partC: editingForm.partC || {},
        partD: editingForm.partD || {},
        partE: {
          areasWithoutPresence: editingForm.partE?.areasWithoutPresence || { description: '', type: 'urban' },
          panchayatsWithoutPresence: editingForm.partE?.panchayatsWithoutPresence || '',
          newComponentsLast5Years: editingForm.partE?.newComponentsLast5Years || { count: null, type: 'urban', details: '' },
          workersGrowthInLast5Years: editingForm.partE?.workersGrowthInLast5Years || { count: null, type: 'personalConnections' },
          componentsToFormIn6Months: editingForm.partE?.componentsToFormIn6Months || {
            jih: null,
            vanitha: null,
            solidarity: null,
            sio: null,
            gio: null,
            teenIndia: null,
            malarvadi: null
          }
        }
      };
      setFormData(normalizedFormData);
    }
  }, [editingForm, setFormData]);

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <PartA />;
      case 2:
        return <PartB />;
      case 3:
        return <PartC />;
      case 4:
        return <PartD />;
      case 5:
        return <PartE />;
      default:
        return <PartA />;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'PART-A (പൊതു വിവരങ്ങൾ)';
      case 2:
        return 'PART-B (സംഘടനാ സംവിധാനങ്ങൾ)';
      case 3:
        return 'PART-C (പൊതുവേദികൾ)';
      case 4:
        return 'PART-D (പൊതുസംവിധാനങ്ങൾ)';
      case 5:
        return 'PART-E (കൂടുതൽ വിവരങ്ങൾ)';
      default:
        return 'Form';
    }
  };

  const handleFormSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const token = isAdmin ? localStorage.getItem('adminToken') : localStorage.getItem('userToken');
      const endpoint = isAdmin ? '/api/admin/forms' : '/api/user/forms';
      
      let response;
      if (editingForm && editingForm._id) {
        // Update existing form
        response = await axios.put(`${import.meta.env.VITE_API_URL}${endpoint}/${editingForm._id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } else {
        // Create new form
        response = await axios.post(`${import.meta.env.VITE_API_URL}${endpoint}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }

      onSubmit(response.data);
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitError(error.response?.data?.message || 'Form submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Header with close button on same horizontal level */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-lg sm:text-xl lg:text-3xl font-bold text-gray-900 mb-0">
            {getStepTitle()}
          </h2>
          <p className="text-sm text-gray-600 mt-0">
            {currentStep === 1 && 'ജില്ലാ തലത്തിൽ പൊതു വിവരങ്ങൾ നൽകുക'}
            {currentStep === 2 && 'സംഘടനാ വിവരങ്ങൾ നൽകുക'}
            {currentStep === 3 && 'പൊതുവേദികളുടെ വിവരങ്ങൾ നൽകുക'}
            {currentStep === 4 && 'പൊതുസംവിധാനങ്ങളുടെ വിവരങ്ങൾ നൽകുക'}
            {currentStep === 5 && 'കൂടുതൽ വിവരങ്ങൾ നൽകുക'}
          </p>
        </div>
        {onBack && (
              <button
                onClick={handleCloseClick}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-gray-600 hover:text-[#002349] transition-all duration-300 hover:bg-gray-100 rounded-full flex-shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <ConfirmationModal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={onBack}
        title="Discard changes?"
        message="You have entered data in this form. Are you sure you want to leave without saving?"
        confirmText="Discard"
        cancelText="Keep editing"
        type="danger"
      />

      {/* Form content directly in the page */}
      {renderCurrentStep()}

      {/* Error Message */}
      {submitError && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-xs">{submitError}</p>
        </div>
      )}

      {/* Navigation and Progress Steps on same horizontal level */}
      <div className="flex flex-wrap items-center justify-between gap-y-3 mt-6 mb-4">
        {/* Back Button (left) */}
        <div className="flex-1">
          {currentStep > 1 && (
            <button
              onClick={prevStep}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 min-h-[44px] rounded-lg text-sm font-semibold flex items-center space-x-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              <span>തിരികെ</span>
              </button>
          )}
            </div>

        {/* Progress Steps (center) */}
        <div className="order-first flex w-full items-center justify-center space-x-2 sm:order-none sm:w-auto">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shadow-md transition-all duration-500 ${
                      step === currentStep
                        ? 'bg-gradient-to-br from-[#002349] to-[#1a3a5c] text-white'
                        : step < currentStep
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step < currentStep ? '✓' : step}
                  </div>
                  {step < 5 && (
                    <div
                  className={`w-6 h-0.5 mx-1 rounded-full transition-all duration-500 ${
                        step < currentStep ? 'bg-[#002349] shadow-md' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

        {/* Next/Submit Button (right) */}
        <div className="flex-1 flex justify-end">
          {currentStep < 5 ? (
            <button
              onClick={nextStep}
              disabled={!validateCurrentStep()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 min-h-[44px] rounded-lg text-sm font-semibold flex items-center space-x-2 transition-colors"
            >
              <span>അടുത്തത്</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFormSubmit}
              disabled={isSubmitting || !validateCurrentStep()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 min-h-[44px] rounded-lg text-sm font-semibold flex items-center space-x-2 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>സമർപ്പിക്കുന്നു...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{editingForm && editingForm._id ? 'ഫോം അപ്ഡേറ്റ് ചെയ്യുക' : 'ഫോം സമർപ്പിക്കുക'}</span>
                </>
              )}
            </button>
          )}
          </div>
        </div>
    </>
  );
};

export default FormPage;
