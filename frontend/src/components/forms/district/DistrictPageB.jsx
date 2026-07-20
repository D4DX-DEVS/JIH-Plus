import React, { useState } from 'react';
import { ArrowLeft, Check, CheckCircle } from 'lucide-react';
import { useDistrictForm } from '../../../contexts/DistrictFormContext';
import { getAuthToken, isAdminUser } from '../../../utils/auth';
import { validateNumericInput, handleNumericKeyDown, handleNumericPaste } from '../../../utils/validation';

const DistrictPageB = ({ onSave, isEditing = false }) => {
  const { formData, updateFormData, prevStep, validateCurrentStep } = useDistrictForm();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (field, value, wing = null) => {
    if (wing) {
      // For wing growth fields
      updateFormData('partE', {
        wingGrowth: {
          ...formData.partE.wingGrowth,
          [wing]: {
            ...formData.partE.wingGrowth[wing],
            [field]: value === '' ? null : parseInt(value) || 0
          }
        }
      });
    } else if (field === 'male' || field === 'female') {
      // For invitation counts
      updateFormData('partD', {
        invitations: {
          ...formData.partD.invitations,
          [field]: value === '' ? null : parseInt(value) || 0
        }
      });
    }
  };

  const handleAttendanceChange = (wingKey, type, value) => {
    const stringValue = String(value || '');
    const numericValue = stringValue.replace(/[^0-9]/g, '');
    const numValue = numericValue === '' ? null : parseInt(numericValue) || 0;
    updateFormData('partA', {
      attendance: {
        ...formData.partA.attendance,
        [wingKey]: {
          ...formData.partA.attendance[wingKey],
          [type]: numValue
        }
      }
    });
  };

  const handleCheckboxChange = (field, value) => {
    updateFormData('partD', {
      categories: {
        ...formData.partD.categories,
        [field]: value
      }
    });
  };

  const handleTextInputChange = (field, value) => {
    updateFormData('partD', {
      categories: {
        ...formData.partD.categories,
        [field]: value
      }
    });
  };

  const handleCountChange = (categoryKey, genderKey, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    updateFormData('partD', {
      categoriesCounts: {
        ...formData.partD.categoriesCounts,
        [categoryKey]: {
          ...formData.partD.categoriesCounts?.[categoryKey],
          [genderKey]: numericValue === '' ? 0 : parseInt(numericValue) || 0
        }
      }
    });
  };

  const validateInvitations = () => {
    const categoriesCounts = formData.partD.categoriesCounts || {};
    const totalMaleInput = parseInt(formData.partD.invitations.male || 0, 10);
    const totalFemaleInput = parseInt(formData.partD.invitations.female || 0, 10);
  
    let maleSum = 0;
    let femaleSum = 0;
  
    Object.values(categoriesCounts).forEach((counts) => {
      maleSum += parseInt(counts?.male || 0, 10);
      femaleSum += parseInt(counts?.female || 0, 10);
    });
  
    // Compare sums with total inputs
    return maleSum === totalMaleInput && femaleSum === totalFemaleInput;
  };
  

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    
    try {
      // Validate required fields before submitting
      if (!formData.district) {
        setError('District is required. Please go back and fill in the district field.');
        return;
      }
      
      if (!formData.month) {
        setError('Month is required. Please go back and select a month.');
        return;
      }

        // New validation for male/female counts
        if (!validateInvitations()) {
          setError('ആൺ / പെൺ മൊത്തം എണ്ണം, ഓരോ വിഭാഗത്തിന്റെയും എണ്ണത്തിന്റെ മൊത്തവുമായി പൊരുത്തപ്പെടണം.');
          return;
        }

      // If editing and onSave function is provided, use it
      if (isEditing && onSave) {
        onSave(formData);
        return;
      }

      console.log('Submitting district report with data:', formData);
      console.log('Part D categories:', formData.partD?.categories);
      console.log('Part D categoriesCounts:', formData.partD?.categoriesCounts);
      
      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }

      // Use admin endpoint if user is admin, otherwise use regular endpoint
      const endpoint = isAdminUser() 
        ? `${import.meta.env.VITE_API_URL}/api/admin/district-surveys`
        : `${import.meta.env.VITE_API_URL}/api/district/surveys`;
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      console.log('Response status:', response.status);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const raw = await response.text();
        console.error('Non-JSON response:', raw);
        throw new Error(`Unexpected response from server (status ${response.status}).`);
      }

      const result = await response.json();
      console.log('Response result:', result);
      
      if (result.success) {
        setSuccess('District report submitted successfully!');
        // Navigate after a short delay to show success message
        setTimeout(() => {
          if (isAdminUser()) {
            window.location.href = '/admin-dashboard';
          } else {
            // Reset form or redirect back to the dashboard
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData.districtId) {
              window.location.href = `/district-dashboard/${userData.districtId}`;
            } else {
              // Fallback: try to get districtId from token
              const token = localStorage.getItem('userToken');
              if (token) {
                try {
                  const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                  if (tokenPayload.districtId) {
                    window.location.href = `/district-dashboard/${tokenPayload.districtId}`;
                    return;
                  }
                } catch (e) {
                  console.error('Error parsing token:', e);
                }
              }
              window.location.href = '/';
            }
          }
        }, 2000);
      } else {
        setError('Error submitting report: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      setError('Error submitting report. Please try again. Error: ' + error.message);
    }
  };

  const wings = [
    { key: 'jih', label: 'JIH' },
    { key: 'vanitha', label: 'വനിത' },
    { key: 'solidarity', label: 'സോളിഡാരിറ്റി' },
    { key: 'sio', label: 'SIO' },
    { key: 'gio', label: 'GIO' },
    { key: 'teenIndia', label: 'ടീൻ ഇന്ത്യ' },
    { key: 'malarvadi', label: 'മലർവാടി' }
  ];

  const categories = [
    { key: 'personalConnection', label: 'വ്യക്തിബന്ധം' },
    { key: 'literaryConnection', label: 'സാഹിത്യബന്ധം' },
    { key: 'qscStudent', label: 'QSC പഠിതാവ്' },
    { key: 'regularKhutbaListener', label: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാള്‍' },
    { key: 'prabodhanamReader', label: 'പ്രബോധനം വായനക്കാരന്‍' },
    { key: 'pfBeneficiary', label: 'PF ഗുണഭോക്താവ്' },
    { key: 'bzBeneficiary', label: 'BZ ഗുണഭോക്താവ്' },
    { key: 'localReliefBeneficiary', label: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്' },
    { key: 'aaramamReader', label: 'ആരാമം വായനക്കാരി' },
    { key: 'thawheedulMaraStudent', label: 'തംഹീദുല്‍ മർഅ പഠിതാവ്' },
    { key: 'madrasaAlumni', label: 'മദ്‌റസ പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി' },
    { key: 'islamicCollegeAlumni', label: 'ഇസ്‌ലാമിയ കോളജ് പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി' },
    { key: 'neighborhoodMember', label: 'അയൽകൂട്ടം അംഗം' },
    { key: 'palliativeConnection', label: 'പാലിയേറ്റീവ് ബന്ധം' },
    { key: 'friendsClubMember', label: 'Friends Club അംഗം' },
    { key: 'mediaReader', label: 'മാധ്യമം വായനക്കാരന്‍' },
    { key: 'ayahDarsQuranStudent', label: 'ആയാത് ദർസെ ഖുര്‍ആന്‍ പഠിതാവ്' },
    { key: 'heavenGuardian', label: 'ഹെവൻസിലെ രക്ഷിതാവ്' },
    { key: 'schoolGuardian', label: 'സ്‌കൂളിലെ രക്ഷിതാവ്' },
    { key: 'arabicCollegeGuardian', label: 'അറബികോളജ് രക്ഷിതാവ്' },
    { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാര്‍ത്ഥി' },
    { key: 'artsCollegeStudent', label: 'ആർട്‌സ് കോളജ് വിദ്യാര്‍ത്ഥി' },
    { key: 'artsCollegeGuardian', label: 'ആർട്‌സ് കോളജ് രക്ഷിതാവ്' },
    { key: 'publicCampusStudent', label: 'പൊതു കാമ്പസിലെ വിദ്യാര്‍ത്ഥി' },
    { key: 'otherNGOs', label: 'മറ്റു NGO കള്‍' },
    { key: 'mahallConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
    { key: 'fulltimeWorkerConnection', label: 'ഫുള്‍െൈടം പ്രവർത്തകനുമായുള്ള ബന്ധം' }
  ];

  return (
    <div className="p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#002349] mb-2">
          ജില്ലാ തലം റിപ്പോർട്ട് - PART B
        </h2>
        <p className="text-gray-600 font-medium">
          പുതിയ വ്യക്തികളെ സംഘടനയിലേക്ക് ക്ഷണിക്കൽ & വര്‍ധനവ്
        </p>
      </div>

     
      {/* Part D - New Person Invitations */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          1. പുതിയ വ്യക്തികളെ സംഘടനയിലേക്ക് ക്ഷണിച്ചത്
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-lg font-semibold text-[#002349] mb-2">
              ആണ്‍
            </label>
            <input
              type="text"
              value={formData.partD.invitations.male || ''}
              onChange={(e) => {
                const cleaned = validateNumericInput(e.target.value);
                handleInputChange('male', cleaned);
              }}
              onKeyDown={handleNumericKeyDown}
              onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('male', value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#002349] focus:border-transparent text-lg transition-all duration-300 hover:border-[#002349]/50"
              placeholder="എണ്ണം നൽകുക"
            />
          </div>

          <div>
            <label className="block text-lg font-semibold text-[#002349] mb-2">
              പെണ്‍
            </label>
            <input
              type="text"
              value={formData.partD.invitations.female || ''}
              onChange={(e) => {
                const cleaned = validateNumericInput(e.target.value);
                handleInputChange('female', cleaned);
              }}
              onKeyDown={handleNumericKeyDown}
              onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('female', value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#002349] focus:border-transparent text-lg transition-all duration-300 hover:border-[#002349]/50"
              placeholder="എണ്ണം നൽകുക"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
  {categories.map((category, index) => (
    <div
      key={category.key}
      className="p-4 border border-gray-200 rounded-lg"
    >
      {/* Numbered label */}
      <div className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
        <span className="font-bold text-gray-900">{index + 1}.</span>
        <span>{category.label}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Male Section */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.partD.categories[category.key]?.male || false}
              onChange={(e) =>
                handleCheckboxChange(category.key, {
                  ...formData.partD.categories[category.key],
                  male: e.target.checked,
                })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-blue-800">ആൺ</span>
          </div>
          {formData.partD.categories[category.key]?.male && (
            <input
              type="text"
              value={
                formData.partD.categoriesCounts?.[category.key]?.male || ""
              }
              onChange={(e) =>
                handleCountChange(category.key, "male", e.target.value)
              }
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="എണ്ണം"
              min="0"
            />
          )}
        </div>

        {/* Female Section */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.partD.categories[category.key]?.female || false}
              onChange={(e) =>
                handleCheckboxChange(category.key, {
                  ...formData.partD.categories[category.key],
                  female: e.target.checked,
                })
              }
              className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-pink-800">പെൺ </span>
          </div>
          {formData.partD.categories[category.key]?.female && (
            <input
              type="text"
              value={
                formData.partD.categoriesCounts?.[category.key]?.female || ""
              }
              onChange={(e) =>
                handleCountChange(category.key, "female", e.target.value)
              }
              className="w-full px-3 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              placeholder="എണ്ണം"
              min="0"
            />
          )}
        </div>
      </div>
    </div>
  ))}
</div>
  
      </div>

      {/* Part E - Growth in Report Period */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          2. റിപ്പോർട്ട് കാലയളവിലെ വര്‍ധനവ് (ജില്ലാ സബ്കമ്മിറ്റിയുടെത് മാത്രം ചേർക്കുക)
        </h3>
        
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">വിംഗ്</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">പുതിയ ഘടകങ്ങൾ എണ്ണം</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">പുതുതായി വന്നവർ</th>
              </tr>
            </thead>
            <tbody>
              {wings.map((wing) => (
                <tr key={wing.key} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="border border-gray-200 px-4 py-3 font-semibold text-[#002349]">{wing.label}</td>
                  <td className="border border-gray-200 px-4 py-3">
                    <input
                      type="text"
                      value={formData.partE.wingGrowth[wing.key].newComponents || ''}
                      onChange={(e) => handleInputChange('newComponents', e.target.value, wing.key)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-xl text-center focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all duration-300"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-200 px-4 py-3">
                    <input
                      type="text"
                      value={formData.partE.wingGrowth[wing.key].newMembers || ''}
                      onChange={(e) => handleInputChange('newMembers', e.target.value, wing.key)}
                      disabled={wing.key === 'teenIndia' || wing.key === 'malarvadi'}
                      className={`w-full px-2 py-1 border border-gray-300 rounded-xl text-center focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all duration-300 ${
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

      {/* Error and Success Messages */}
      {error && (
        <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-2xl p-4">
          <p className="text-red-600 text-sm font-semibold">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-2xl p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-700 text-sm font-semibold">{success}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-12 flex justify-between">
        <button
          onClick={prevStep}
          className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-8 py-3 rounded-2xl font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg transform hover:scale-105 ease-out hover:shadow-gray-500/50"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>മുമ്പത്തേത്</span>
        </button>
        
        <button
          onClick={handleSubmit}
          disabled={!formData.district || !formData.month||!validateInvitations()}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 text-white px-8 py-3 rounded-2xl font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg transform hover:scale-105 ease-out hover:shadow-green-500/50 disabled:transform-none"
        >
          <Check className="w-5 h-5" />
          <span>{isEditing ? 'അപ്ഡേറ്റ് ചെയ്യുക' : 'സബ്മിറ്റ് ചെയ്യുക'}</span>
        </button>
      </div>
    </div>
  );
};

export default DistrictPageB;
