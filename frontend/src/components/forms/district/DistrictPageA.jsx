import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useDistrictForm } from '../../../contexts/DistrictFormContext';
import { validateNumericInput, handleNumericKeyDown, handleNumericPaste } from '../../../utils/validation';

const DistrictPageA = () => {
  const { formData, updateFormData, nextStep, validateCurrentStep } = useDistrictForm();
  const [error, setError] = useState('');

  // Auto-fill district from logged-in user data
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      console.log('User data for auto-fill:', user);
      console.log('Current form data:', formData);
      
      // Get district name - try to get actual name, not ID
      let districtName = user.district || user.districtName || '';
      
      // If we already have the district name, set it immediately
      if (districtName && !formData.district) {
        console.log('Setting district name from user data:', districtName);
        updateFormData('district', districtName);
      } else if (user.districtId && !formData.district) {
        // Fallback: show district ID if name is not available
        console.log('Using district ID as fallback:', user.districtId);
        updateFormData('district', user.districtId);
      }
      
      // If we have IDs but not names, try to fetch the names
      const fetchNames = async () => {
        try {
          const token = localStorage.getItem('userToken');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          
          // Fetch district name if we only have ID
          if (user.districtId && !districtName) {
            try {
              console.log('Fetching district name for ID:', user.districtId);
              const districtsResp = await fetch(`${import.meta.env.VITE_API_URL}/api/user/hierarchy/districts`, { headers });
              const districtsData = await districtsResp.json();
              console.log('Districts response:', districtsData);
              if (districtsData.success && districtsData.data) {
                const district = districtsData.data.find(d => (d.id || d._id) === user.districtId);
                if (district) {
                  districtName = district.title || district.name || districtName;
                  console.log('Found district name:', districtName);
                  
                  // Update form data with the fetched name
                  if (districtName && !formData.district) {
                    console.log('Setting district name from API:', districtName);
                    updateFormData('district', districtName);
                  }
                }
              }
            } catch (e) {
              console.log('Could not fetch district name:', e);
            }
          }
        } catch (error) {
          console.error('Error fetching names:', error);
        }
      };
      
      // Always try to fetch names if we have IDs but no names
      if (user.districtId && !districtName) {
        fetchNames();
      }
    }
  }, [updateFormData]);

  const handleInputChange = (field, value, wing = null) => {
    const normalizedNumber = value === '' ? null : Math.max(0, parseInt(value, 10) || 0);
    if (wing && (field === 'present' || field === 'leave' || field === 'absent')) {
      // For attendance fields (Part A)
      updateFormData('partA', {
        attendance: {
          ...(formData.partA?.attendance || {}),
          [wing]: {
            ...(formData.partA?.attendance?.[wing] || {}),
            [field]: normalizedNumber
          }
        }
      });
    } else if (wing && (field === 'componentVisits' || field === 'areaVisits' || field === 'newComponentFormationAttempts' || field === 'newPersonConnections')) {
      // For part C activities with specific wing
      updateFormData('partC', {
        activities: {
          ...(formData.partC?.activities || {}),
          [wing]: {
            ...(formData.partC?.activities?.[wing] || {}),
            [field]: normalizedNumber
          }
        }
      });
    }
  };

  const handleCheckboxChange = (field, checked) => {
    updateFormData('partB', {
      focusAreas: {
        ...formData.partB.focusAreas,
        [field]: checked
      }
    });
  };

  const handleTextInputChange = (field, value) => {
    updateFormData('partB', {
      focusAreas: {
        ...formData.partB.focusAreas,
        [field]: value
      }
    });
  };

  const handleNext = () => {
    setError('');
    if (validateCurrentStep()) {
      nextStep();
    } else {
      setError('Please fill in all required fields before proceeding.');
    }
  };

  const handleBack = () => {
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
  };

  const wings = [
    { key: 'jih', label: 'JIH' },
    { key: 'vanitha', label: 'വനിത' },
    { key: 'solidarity', label: 'സോളിഡാരിറ്റി' },
    { key: 'sio', label: 'SIO' },
    { key: 'gio', label: 'GIO' }
  ];

  const focusAreas = [
    { key: 'newAreaExpansionWorkshop', label: 'പുതിയ പ്രദേശങ്ങളിൽ പ്രസ്ഥാന വ്യാപനം ലക്ഷ്യംവെച്ച് വർക്‌ഷോപ്പ്' },
    { key: 'workerTraining', label: 'പ്രവർത്തകര്‍ക്ക് പരിശീലനം' },
    { key: 'newAreaAgendaPreparation', label: 'പുതിയ പ്രദേശത്തേക്കുള്ള അജണ്ട തയ്യാറാക്കല്‍' },
    { key: 'fulltimeRecruitment', label: 'ഫുള്‍ടൈമറുടെ നിയമനം' },
    { key: 'schoolGuardianClusterFormation', label: 'സ്‌കൂള്‍ രക്ഷിതാക്കളുടെ ക്ലസ്റ്റര്‍ രൂപീകരണം' },
    { key: 'reliefBeneficiaryDataCollection', label: 'റിലീഫ് ഗുണഭോക്താക്കളുടെ ഡാറ്റാ ശേഖരണം' },
    { key: 'workerDeploymentToNewAreas', label: 'പുതിയ പ്രദേശത്തേക്ക് പ്രവർത്തകരെ വിന്യസിക്കല്‍' },
    { key: 'weeklyMeetingEffectiveness', label: 'വാരാന്തയോഗങ്ങളുടെ ഫലപ്രാപ്തി ഉറപ്പാക്കല്‍' },
    { key: 'khatibUtilization', label: 'ഖത്തീബുമാരെ ഉപയോഗപെടുത്തല്‍' },
    { key: 'madrasaMovementGrowthCalculation', label: 'മദ്‌റസയിലൂടെയുള്ള പ്രസ്ഥാന വളര്‍ച്ചയുടെ കണക്കെടുപ്പ്' },
    { key: 'schoolCenteredWork', label: 'സ്‌കൂളുകള്‍ കേന്ദ്രീകരിച്ചുള്ള പ്രവർത്തനം' },
    { key: 'staffHalkaFormation', label: 'സ്റ്റാഫ് ഹല്‍ഖാ രൂപീകരണം' },
    { key: 'islamicCollegeAlumniDiscovery', label: 'ഇസ്്‌ലാമിയ കോളേജുകളിലെ പൂര്‍വ്വ വിദ്യാര്‍ത്ഥികളെ കണ്ടെത്തല്‍' },
    { key: 'quranStudyCenterWork', label: 'ഖുര്‍ആന്‍ സ്റ്റഡി സെന്റര്‍ കേന്ദ്രീകരിച്ചുള്ള പ്രവർത്തനങ്ങള്‍' },
    { key: 'artsScienceCampusLeadership', label: 'ജില്ലയിലെ Arts & Science കോളജ് കാമ്പസില്‍ ഫ്രറ്റേണിറ്റി, SIO, GIO, സാനിധ്യം ഉറപ്പാക്കല്‍' },
    { key: 'hajjUmrahGroupDiscovery', label: 'ഹജ്ജ്/ ഉംറ ഗ്രൂപ്പില്‍ പോയവരെ കണ്ടെത്തല്‍' },
    { key: 'majorMuslimCenterStructure', label: 'പ്രാധാന മുസ്ലിം കേന്ദ്രങ്ങളില്‍ പ്രസ്ഥാന ഘടന ഉറപ്പുവരുത്തല്‍' },
    { key: 'weakAreaFinancialSupport', label: 'ദുര്‍ബല ഏരിയകള്‍ക്ക് സാമ്പത്തിക സഹായം' },
    { key: 'qscTeacherOrientation', label: 'QSC അധ്യപകര്‍ക്ക് ഓറിയന്റേഷന്‍' },
    { key: 'khatibOrientation', label: 'ഖത്തീബുമാര്‍ക്ക് ഓറിയന്റേഷന്‍' },
    { key: 'institutionBearingOrientation', label: 'സ്ഥാപന ഭാരവാഹികള്‍ക്ക് ഓറിയന്റേഷന്‍' },
    { key: 'selectedWorkerTraining', label: 'തെരെഞ്ഞെടുക്കപെട്ട പ്രവർത്തകര്‍ക്ക് പരിശീലനം' }
  ];

  return (
    <div className="p-4 sm:p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
      {/* Header: hidden on mobile, the page header / MobileTopBar already names this screen there. */}
      <div className="hidden lg:block mb-8">
        <h2 className="text-2xl font-bold text-[#002349] mb-2">
          ജില്ലാ തലം റിപ്പോർട്ട് - PART A
        </h2>
        <p className="text-gray-600 font-medium">
          ജില്ലാ തലത്തിൽ പൊതു വിവരങ്ങൾ നൽകുക
        </p>
      </div>

      {/* District Display (Auto-filled and disabled) */}
      <div className="mb-8">
        <div>
          <label className="block text-lg font-semibold text-[#002349] mb-3">
            ജില്ല:
          </label>
          <input
            type="text"
            value={formData.district}
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl bg-gray-50 text-lg cursor-not-allowed font-medium"
            disabled
            readOnly
          />
        </div>
      </div>

      {/* Report Period */}
      <div className="mb-8">
        <label className="block text-lg font-semibold text-[#002349] mb-3">
          1. റിപ്പോർട്ട് കാലയളവ്:
        </label>
        <select
          value={formData.month}
          onChange={(e) => updateFormData('month', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-lg transition-all duration-300 hover:border-[#002349]/50"
        >
          <option value="">തിരഞ്ഞെടുക്കുക</option>
          <option value="January">ജനുവരി</option>
          <option value="February">ഫെബ്രുവരി</option>
          <option value="March">മാർച്ച്</option>
          <option value="April">ഏപ്രിൽ</option>
          <option value="May">മേയ്</option>
          <option value="June">ജൂൺ</option>
          <option value="July">ജൂലൈ</option>
          <option value="August">ഓഗസ്റ്റ്</option>
          <option value="September">സെപ്റ്റംബർ</option>
          <option value="October">ഒക്ടോബർ</option>
          <option value="November">നവംബർ</option>
          <option value="December">ഡിസംബർ</option>
        </select>
      </div>

      {/* Part A - District Subcommittee Attendance */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          2. ജില്ലാ സബ്കമ്മിറ്റി ചേർന്നത്
        </h3>
        
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">വിംഗ്</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">ഹാജർ</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">ലീവ്</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">ആബ്‌സന്റ്</th>
              </tr>
            </thead>
            <tbody>
              {wings.map((wing) => (
                <tr key={wing.key} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="border border-gray-200 px-4 py-3 font-semibold text-[#002349]">{wing.label}</td>
                  <td className="border border-gray-200 px-4 py-3">
                    <input
                      type="text"
                      value={formData.partA.attendance[wing.key].present || ''}
                      onChange={(e) => {
                        const cleaned = validateNumericInput(e.target.value);
                        handleInputChange('present', cleaned, wing.key);
                      }}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('present', value, wing.key))}
                      className="w-full px-2 py-1 border border-gray-300 rounded-xl text-center text-[16px] sm:text-base focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all duration-300"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-200 px-4 py-3">
                    <input
                      type="text"
                      min={0}
                      value={formData.partA.attendance[wing.key].leave || ''}
                      onChange={(e) => {
                        const cleaned = validateNumericInput(e.target.value);
                        handleInputChange('leave', cleaned, wing.key);
                      }}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('leave', value, wing.key))}
                      className="w-full px-2 py-1 border border-gray-300 rounded-xl text-center text-[16px] sm:text-base focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all duration-300"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-200 px-4 py-3">
                    <input
                      type="text"
                      min={0}
                      value={formData.partA.attendance[wing.key].absent || ''}
                      onChange={(e) => {
                        const cleaned = validateNumericInput(e.target.value);
                        handleInputChange('absent', cleaned, wing.key);
                      }}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('absent', value, wing.key))}
                      className="w-full px-2 py-1 border border-gray-300 rounded-xl text-center text-[16px] sm:text-base focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all duration-300"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Part B - Focus Areas */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          3. താഴെപറയുന്നവയിൽ ഫോകസ് ചെയ്ത മേഖലകൾ
        </h3>
        
        <div className="space-y-3">
          {focusAreas.map((area) => (
            <label key={area.key} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-2xl hover:bg-gradient-to-r hover:from-[#002349]/5 hover:to-[#957C3D]/5 cursor-pointer transition-all duration-300 hover:shadow-md">
              <input
                type="checkbox"
                checked={formData.partB.focusAreas[area.key]}
                onChange={(e) => handleCheckboxChange(area.key, e.target.checked)}
                className="mt-1 h-4 w-4 text-[#002349] focus:ring-[#002349] border-gray-300 rounded"
              />
              <span className="text-gray-800 leading-relaxed font-medium">{area.label}</span>
            </label>
          ))}
          
          {/* Other Focus Areas Text Input */}
          <div className="mt-6">
            <label className="block text-lg font-semibold text-[#002349] mb-2">
              മറ്റുള്ളവ (വ്യക്തമാക്കുക):
            </label>
            <textarea
              value={formData.partB.focusAreas.otherFocusAreas || ''}
              onChange={(e) => handleTextInputChange('otherFocusAreas', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-lg transition-all duration-300 hover:border-[#002349]/50"
              rows={3}
              placeholder="മറ്റ് ഫോകസ് ചെയ്ത മേഖലകൾ ഇവിടെ നൽകുക..."
            />
          </div>
        </div>
      </div>

      {/* Part C - District Subcommittee Activities */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          4. ജില്ലാ സബ്കമ്മിറ്റി നടത്തിയ പ്രവർത്തനങ്ങൾ
        </h3>
        
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">വിംഗ്</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">ഘടക സന്ദർശനങ്ങൾ</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">ഏരിയ സന്ദർശനങ്ങൾ</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">പുതിയ ഘടക ശ്രമങ്ങൾ</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">പുതിയ വ്യക്തികളെ കണ്ടെത്തൽ ശ്രമങ്ങൾ</th>
              </tr>
            </thead>
            <tbody>
              {wings.map((wing) => (
                <tr key={wing.key} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="border border-gray-200 px-4 py-3 font-semibold text-[#002349]">{wing.label}</td>
                  <td className="border border-gray-200 px-4 py-3">
                    <input
                      type="text"
                      value={formData.partC?.activities?.[wing.key]?.componentVisits || ''}
                      onChange={(e) => {
                        const cleaned = validateNumericInput(e.target.value);
                        handleInputChange('componentVisits', cleaned, wing.key);
                      }}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('componentVisits', value, wing.key))}
                      className="w-full px-2 py-1 border border-gray-300 rounded-xl text-center text-[16px] sm:text-base focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all duration-300"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-200 px-4 py-3">
                    <input
                      type="text"
                      value={formData.partC?.activities?.[wing.key]?.areaVisits || ''}
                      onChange={(e) => {
                        const cleaned = validateNumericInput(e.target.value);
                        handleInputChange('areaVisits', cleaned, wing.key);
                      }}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('areaVisits', value, wing.key))}
                      className="w-full px-2 py-1 border border-gray-300 rounded-xl text-center text-[16px] sm:text-base focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all duration-300"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-200 px-4 py-3">
                    <input
                      type="text"
                      value={formData.partC?.activities?.[wing.key]?.newComponentFormationAttempts || ''}
                      onChange={(e) => {
                        const cleaned = validateNumericInput(e.target.value);
                        handleInputChange('newComponentFormationAttempts', cleaned, wing.key);
                      }}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('newComponentFormationAttempts', value, wing.key))}
                      className="w-full px-2 py-1 border border-gray-300 rounded-xl text-center text-[16px] sm:text-base focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all duration-300"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-200 px-4 py-3">
                    <input
                      type="text"
                      value={formData.partC?.activities?.[wing.key]?.newPersonConnections || ''}
                      onChange={(e) => {
                        const cleaned = validateNumericInput(e.target.value);
                        handleInputChange('newPersonConnections', cleaned, wing.key);
                      }}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('newPersonConnections', value, wing.key))}
                      className="w-full px-2 py-1 border border-gray-300 rounded-xl text-center text-[16px] sm:text-base focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all duration-300"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-2xl p-4">
          <p className="text-red-600 text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-12 flex justify-between">
        <button
          onClick={handleBack}
          className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-8 py-3 rounded-2xl font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg transform hover:scale-105 ease-out hover:shadow-gray-500/50"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>തിരികെ</span>
        </button>
        
        <button
          onClick={handleNext}
          disabled={!validateCurrentStep()}
          className="bg-gradient-to-r from-[#002349] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#002349] disabled:from-gray-400 disabled:to-gray-400 text-white px-8 py-3 rounded-2xl font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg transform hover:scale-105 ease-out hover:shadow-[#002349]/50 disabled:transform-none"
        >
          <span>അടുത്തത്</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default DistrictPageA;
