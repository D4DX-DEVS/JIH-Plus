import React, { useState } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAreaForm } from '../../../contexts/AreaFormContext';
import { validateNumericInput, handleNumericKeyDown, handleNumericPaste } from '../../../utils/validation';
import { getAuthToken, isAdminUser } from '../../../utils/auth';

const AreaPageF = ({ onSave, isSaving, isEditing = false }) => {
  const { formData, updateFormData, validateCurrentStep, prevStep } = useAreaForm();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wings = [
    { key: 'jih', label: 'JIH' },
    { key: 'vanitha', label: 'വനിത' },
    { key: 'solidarity', label: 'സോളിഡാരിറ്റി' },
    { key: 'sio', label: 'SIO' },
    { key: 'gio', label: 'GIO' },
    { key: 'teenIndia', label: 'ടീന്‍ ഇന്ത്യ' },
    { key: 'malarvadi', label: 'മലര്‍വാടി' }
  ];

  const handleWingGrowthChange = (wingKey, field, value) => {
    // Only allow numbers using our validation utility
    const cleaned = validateNumericInput(value);
    const numValue = cleaned === '' ? null : parseInt(cleaned) || 0;
    
    updateFormData('partF', {
      wingGrowth: {
        ...formData.partF.wingGrowth,
        [wingKey]: {
          ...formData.partF.wingGrowth[wingKey],
          [field]: numValue
        }
      }
    });
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    
    if (!validateCurrentStep()) {
      setError('Please fill in all required fields before submitting.');
      return;
    }

    if (isEditing && onSave) {
      // In editing mode, call the onSave function passed from parent
      onSave(formData);
      return;
    }

    // In creation mode, submit new survey
    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }

      // Use admin endpoint if user is admin, otherwise use regular endpoint
      const endpoint = isAdminUser()
        ? `${import.meta.env.VITE_API_URL}/api/admin/area-surveys`
        : `${import.meta.env.VITE_API_URL}/api/area/surveys`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('Area Report submitted successfully!');
        // Navigate after a short delay to show success message
        setTimeout(() => {
          if (isAdminUser()) {
            navigate('/admin-dashboard');
          } else {
            // Get user data to determine the correct area dashboard URL
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const areaId = userData.areaId || userData.area;
            navigate(`/area-dashboard/${areaId}`);
          }
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError('Error submitting Report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-4xl mx-auto hover:shadow-xl transition-all duration-500">
      {/* Header */}
      <div className="hidden lg:block mb-5">
        <h2 className="text-xl font-bold text-[#002349] mb-1.5">
          ഏരിയ തലം റിപ്പോർട്ട് - PART F
        </h2>
        <p className="text-sm text-gray-600">
          റിപ്പോർട്ട് കാലയളവിലെ വർദ്ധനവ്
        </p>
      </div>

      {/* Growth in Report Period */}
      <div className="mb-5">
        <h3 className="text-base font-bold text-[#002349] mb-3">
          1. റിപ്പോർട്ട് കാലയളവിലെ വർദ്ധനവ്
        </h3>
        
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full border-collapse min-w-full ih-table-compact">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-700 sticky left-0 bg-white z-[1]">വിംഗ്</th>
                <th className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700">പുതിയ ഘടകങ്ങള്‍ എണ്ണം</th>
                <th className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700">പുതുതായി വന്നവര്‍</th>
              </tr>
            </thead>
            <tbody>
              {wings.map(wing => (
                <tr key={wing.key} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="border border-gray-200 px-3 py-2 text-sm font-semibold text-[#002349] sticky left-0 bg-white z-[1]">{wing.label}</td>
                  <td className="border border-gray-200 px-3 py-2">
                    <input
                      type="text"
                      value={formData.partF.wingGrowth[wing.key]?.newComponents !== null && formData.partF.wingGrowth[wing.key]?.newComponents !== undefined ? formData.partF.wingGrowth[wing.key].newComponents : ''}
                      onChange={(e) => handleWingGrowthChange(wing.key, 'newComponents', e.target.value)}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={(e) => handleNumericPaste(e, (value) => handleWingGrowthChange(wing.key, 'newComponents', value))}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-xl text-center text-[16px] sm:text-sm focus:ring-1 focus:ring-[#002349] focus:border-transparent transition-all duration-300"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-200 px-3 py-2">
                    <input
                      type="text"
                      value={formData.partF.wingGrowth[wing.key]?.newMembers !== null && formData.partF.wingGrowth[wing.key]?.newMembers !== undefined ? formData.partF.wingGrowth[wing.key].newMembers : ''}
                      onChange={(e) => handleWingGrowthChange(wing.key, 'newMembers', e.target.value)}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={(e) => handleNumericPaste(e, (value) => handleWingGrowthChange(wing.key, 'newMembers', value))}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      disabled={wing.key === 'teenIndia' || wing.key === 'malarvadi'}
                      className={`w-full px-2 py-1.5 border border-gray-300 rounded-lg text-center text-[16px] sm:text-sm focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all duration-300 ${
                        wing.key === 'teenIndia' || wing.key === 'malarvadi' ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-5 bg-gradient-to-r from-[#002349]/10 to-[#957C3D]/10 p-4 rounded-xl border border-gray-200">
        <h3 className="text-base font-bold text-[#002349] mb-3">
          റിപ്പോർട്ട് സംഗ്രഹം
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <p className="font-medium text-gray-700"><strong className="text-[#002349]">ജില്ല:</strong> {formData.district}</p>
            <p className="font-medium text-gray-700"><strong className="text-[#002349]">ഏരിയ:</strong> {formData.area}</p>
            <p className="font-medium text-gray-700"><strong className="text-[#002349]">മാസം:</strong> {formData.month}</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-gray-700"><strong className="text-[#957C3D]">ആകെ ഘടകങ്ങൾ:</strong> {(formData.partA.kh || 0) + (formData.partA.vkh || 0)}</p>
            <p className="font-medium text-gray-700"><strong className="text-[#957C3D]">മാസാന്തയോഗം:</strong> {formData.partB.monthlyMeeting || 'തിരഞ്ഞെടുത്തിട്ടില്ല'}</p>
            <p className="font-medium text-gray-700"><strong className="text-[#957C3D]">പ്രധാന തീരുമാനങ്ങൾ:</strong> {(formData.partB.mainDecisions || []).length}</p>
          </div>
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-xs font-semibold">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-green-700 text-xs font-semibold">{success}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={prevStep}
          className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded-2xl text-sm min-h-[44px] font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>മുൻപത്തെ</span>
        </button>
        <button
          onClick={handleSubmit}
          disabled={!validateCurrentStep() || isSaving || isSubmitting}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-5 py-2 rounded-2xl text-sm min-h-[44px] font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out disabled:transform-none disabled:hover:translate-y-0 disabled:hover:scale-100"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>സമർപ്പിക്കുന്നു...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>{isEditing ? 'അപ്ഡേറ്റ് ചെയ്യുക' : 'സമർപ്പിക്കുക'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AreaPageF;
