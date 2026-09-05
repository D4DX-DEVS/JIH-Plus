import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import { validateNumericInput, handleNumericKeyDown, handleNumericPaste, createNumericInputHandler } from '../../../utils/validation';

const UnitPageA = ({ onNext, formData, setFormData }) => {
  const [localData, setLocalData] = useState({
    district: '',
    area: '',
    component: '',
    workers: {
      rukkun: '',
      karkun: '',
      activeAssociate: ''
    },
    partA: {
      codes: '',
      spokenPersons: {
        male: '',
        female: ''
      },
            authorityPersons: {
              vyakthibandham: false,
              sahitiyabandham: false,
              qscStudent: false,
              regularKhutbaListener: false,
              prabodhanamReader: false,
              pfBeneficiary: false,
              bzBeneficiary: false,
              regionalReliefBeneficiary: false,
              aaramamReader: false,
              tamheedulManhabStudent: false,
              institutionAlumni: false,
              islamicCollegeAlumni: false,
              neighborhoodGroupMember: false,
              palliativeConnection: false,
              friendsClubMember: false,
              mediaReader: false,
              ayathulDursalQuranStudent: false,
              heavensGuardian: false,
              schoolGuardian: false,
              arabicCollegeGuardian: false,
              arabicCollegeStudent: false,
              artsCollegeStudent: false,
              artsCollegeGuardian: false,
              publicCampusStudent: false,
              otherNGOs: false,
              mahalluConnection: false,
              fullTimeWorkerConnection: false
            },
      authorityPersonsGender: {},
      authorityPersonsCounts: {},
      authorityGender: {
        male: false,
        female: false
      },
      authorityOtherText: ''
    }
  });

  // Authority persons options
  const authorityPersonsOptions = [
    { key: 'vyakthibandham', label: 'വ്യക്തിബന്ധം' },
    { key: 'sahitiyabandham', label: 'സാഹിത്യബന്ധം' },
    { key: 'qscStudent', label: 'QSC പഠിതാവ്' },
    { key: 'regularKhutbaListener', label: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാൾ' },
    { key: 'prabodhanamReader', label: 'പ്രബോധനം വായനക്കാരൻ' },
    { key: 'pfBeneficiary', label: 'PF ഗുണഭോക്താവ്' },
    { key: 'bzBeneficiary', label: 'BZ ഗുണഭോക്താവ്' },
    { key: 'regionalReliefBeneficiary', label: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്' },
    { key: 'aaramamReader', label: 'ആരാമം വായനക്കാരി' },
    { key: 'tamheedulManhabStudent', label: 'തംഹീദുൽ മർഅ പഠിതാവ്' },
    { key: 'institutionAlumni', label: 'മദ്റസ പൂർവ്വ വിദ്യാർത്ഥി' },
    { key: 'islamicCollegeAlumni', label: 'ഇസ്‌ലാമിയ കോളജ് പൂർവ്വ വിദ്യാർത്ഥി' },
    { key: 'neighborhoodGroupMember', label: 'അയൽകൂട്ടം അംഗം' },
    { key: 'palliativeConnection', label: 'പാലിയേറ്റീവ് ബന്ധം' },
    { key: 'friendsClubMember', label: 'Friends Club അംഗം' },
    { key: 'mediaReader', label: 'മാധ്യമം വായനക്കാരൻ' },
    { key: 'ayathulDursalQuranStudent', label: 'ആയാത് ദർസെ ഖുർആൻ പഠിതാവ്' },
    { key: 'heavensGuardian', label: 'ഹെവൻസിലെ രക്ഷിതാവ്' },
    { key: 'schoolGuardian', label: 'സ്കൂളിലെ രക്ഷിതാവ്' },
    { key: 'arabicCollegeGuardian', label: 'അറബികോളജ് രക്ഷിതാവ്' },
    { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാർത്ഥി' },
    { key: 'artsCollegeStudent', label: 'ആർട്സ് കോളജ് വിദ്യാർത്ഥി' },
    { key: 'artsCollegeGuardian', label: 'ആർട്സ് കോളജ് രക്ഷിതാവ്' },
    { key: 'publicCampusStudent', label: 'പൊതു കാമ്പസിലെ വിദ്യാർത്ഥി' },
    { key: 'otherNGOs', label: 'മറ്റു NGO കൾ' },
    { key: 'mahalluConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
    { key: 'fullTimeWorkerConnection', label: 'ഫുൾടൈം പ്രവർത്തകനുമായുള്ള ബന്ധം' }
  ];

  // Auto-fill data from user token
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userToken = localStorage.getItem('userToken');
    
    if (userToken) {
      try {
        const tokenPayload = JSON.parse(atob(userToken.split('.')[1]));
        const extractedNames = {
          districtName: tokenPayload.districtName || tokenPayload.district,
          areaName: tokenPayload.areaName || tokenPayload.area,
          componentName: tokenPayload.unitName || tokenPayload.component
        };
        
        // Update userData with names from token
        const updatedUserData = {
          ...userData,
          ...extractedNames
        };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        
        setFormData(prev => ({
          ...prev,
          district: extractedNames.districtName || userData.district || userData.districtId || '',
          area: extractedNames.areaName || userData.area || userData.areaId || '',
          component: extractedNames.componentName || userData.component || userData.unitId || ''
        }));
      } catch (error) {
        console.error('Error parsing token:', error);
        setFormData(prev => ({
          ...prev,
          district: userData.district || userData.districtId || '',
          area: userData.area || userData.areaId || '',
          component: userData.component || userData.unitId || ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        district: userData.district || userData.districtId || '',
        area: userData.area || userData.areaId || '',
        component: userData.component || userData.unitId || ''
      }));
    }
  }, [setFormData]);

  // Process formData when it changes
  useEffect(() => {
    if (formData && Object.keys(formData).length > 0) {
      console.log('UnitPageA - formData received:', formData);
      console.log('UnitPageA - formData.partA?.authorityPersonsGender:', formData.partA?.authorityPersonsGender);
      console.log('UnitPageA - formData.partA?.authorityPersonsCounts:', formData.partA?.authorityPersonsCounts);
      
      setLocalData(prev => {
        const newLocalData = {
          ...prev,
          district: formData.district || prev.district || '',
          area: formData.area || prev.area || '',
          component: formData.component || prev.component || '',
          workers: {
            rukkun: formData.workers?.rukkun || prev.workers?.rukkun || 0,
            karkun: formData.workers?.karkun || prev.workers?.karkun || 0,
            activeAssociate: formData.workers?.activeAssociate || prev.workers?.activeAssociate || 0
          },
          partA: {
            codes: formData.partA?.codes || prev.partA?.codes || '',
            spokenPersons: {
              male: formData.partA?.spokenPersons?.male || prev.partA?.spokenPersons?.male || 0,
              female: formData.partA?.spokenPersons?.female || prev.partA?.spokenPersons?.female || 0
            },
            authorityPersons: {
              vyakthibandham: false,
              sahitiyabandham: false,
              qscStudent: false,
              regularKhutbaListener: false,
              prabodhanamReader: false,
              pfBeneficiary: false,
              bzBeneficiary: false,
              regionalReliefBeneficiary: false,
              aaramamReader: false,
              tamheedulManhabStudent: false,
              institutionAlumni: false,
              islamicCollegeAlumni: false,
              neighborhoodGroupMember: false,
              palliativeConnection: false,
              friendsClubMember: false,
              mediaReader: false,
              ayathulDursalQuranStudent: false,
              heavensGuardian: false,
              schoolGuardian: false,
              arabicCollegeGuardian: false,
              arabicCollegeStudent: false,
              artsCollegeStudent: false,
              artsCollegeGuardian: false,
              publicCampusStudent: false,
              otherNGOs: false,
              mahalluConnection: false,
              fullTimeWorkerConnection: false,
              ...prev.partA?.authorityPersons,
              ...(formData.partA?.authorityPersons || {})
            },
            authorityPersonsGender: {
              // Initialize all categories with default values first
              ...authorityPersonsOptions.reduce((acc, opt) => {
                acc[opt.key] = { male: false, female: false };
                return acc;
              }, {}),
              // Then apply existing localData values
              ...prev.partA?.authorityPersonsGender,
              // Finally apply formData values (this takes priority)
              ...(formData.partA?.authorityPersonsGender || {})
            },
            authorityPersonsCounts: {
              // Initialize all categories with default values first
              ...authorityPersonsOptions.reduce((acc, opt) => {
                acc[opt.key] = { male: 0, female: 0 };
                return acc;
              }, {}),
              // Then apply existing localData values
              ...prev.partA?.authorityPersonsCounts,
              // Finally apply formData values (this takes priority)
              ...(formData.partA?.authorityPersonsCounts || {})
            },
            authorityGender: {
              male: formData.partA?.authorityGender?.male || prev.partA?.authorityGender?.male || false,
              female: formData.partA?.authorityGender?.female || prev.partA?.authorityGender?.female || false
            },
            authorityOtherText: formData.partA?.authorityOtherText || prev.partA?.authorityOtherText || ''
          }
        };
        
        console.log('UnitPageA - newLocalData.partA.authorityPersonsGender:', newLocalData.partA.authorityPersonsGender);
        console.log('UnitPageA - newLocalData.partA.authorityPersonsCounts:', newLocalData.partA.authorityPersonsCounts);
        
        return newLocalData;
      });
    }
  }, [formData]);

  // Dedicated handler for gender checkbox per category
  const handleGenderCheckboxChange = useCallback((optionKey, genderKey, checked) => {
    setLocalData(prev => {
      const next = { ...prev };
      if (!next.partA) next.partA = {};
      if (!next.partA.authorityPersonsGender) next.partA.authorityPersonsGender = {};
      if (!next.partA.authorityPersonsGender[optionKey]) {
        next.partA.authorityPersonsGender[optionKey] = { male: false, female: false };
      }
      next.partA.authorityPersonsGender[optionKey][genderKey] = checked;

      // If unchecked, also zero-out the corresponding count to keep totals consistent
      if (!next.partA.authorityPersonsCounts) next.partA.authorityPersonsCounts = {};
      if (!next.partA.authorityPersonsCounts[optionKey]) {
        next.partA.authorityPersonsCounts[optionKey] = { male: 0, female: 0 };
      }
      if (!checked) {
        next.partA.authorityPersonsCounts[optionKey][genderKey] = 0;
      }
      return next;
    });
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setLocalData(prevData => {
      const newData = { ...prevData };
      const keys = field.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  }, []);

  // Derived totals for validation and display
  const computeAuthoritySums = (data) => {
    let maleSum = 0;
    let femaleSum = 0;
    const counts = data.partA?.authorityPersonsCounts || {};
    const genders = data.partA?.authorityPersonsGender || {};
    authorityPersonsOptions.forEach(opt => {
      const g = genders[opt.key] || { male: false, female: false };
      const c = counts[opt.key] || { male: 0, female: 0 };
      if (g.male) maleSum += Number(c.male) || 0;
      if (g.female) femaleSum += Number(c.female) || 0;
    });
    return { maleSum, femaleSum };
  };

  const [validationError, setValidationError] = useState('');

  const handleNext = () => {
    console.log('UnitPageA - localData being sent:', localData);
    console.log('UnitPageA - authorityPersonsCounts:', localData.partA?.authorityPersonsCounts);

    // Validation: totals must match spokenPersons male/female
    const { maleSum, femaleSum } = computeAuthoritySums(localData);
    const spokenMale = Number(localData.partA?.spokenPersons?.male) || 0;
    const spokenFemale = Number(localData.partA?.spokenPersons?.female) || 0;
    if (maleSum !== spokenMale || femaleSum !== spokenFemale) {
      setValidationError('"സംസാരിച്ചവർ വ്യക്തികള്‍" ആൺ/പെൺ  മൊത്തം എണ്ണം തെരഞ്ഞെടുത്ത കാറ്റഗറി എണ്ണങ്ങളുടെ മൊത്തവുമായി പൊരുത്തപ്പെടണം.');
      return;
    }
    setValidationError('');

    setFormData(prev => ({
      ...prev,
      ...localData
    }));
    
    if (onNext) {
      onNext(localData);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-gray-200">
      <div className="hidden lg:block mb-8">
        <h2 className="text-xl font-bold text-[#002349] mb-1.5">ഭാഗം A: പ്രാഥമിക വിവരങ്ങൾ</h2>
        <p className="text-sm text-gray-600">ജില്ല, ഏരിയ, യൂണിറ്റ് വിവരങ്ങൾ</p>
      </div>

      {validationError && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 border-2 border-red-200 text-xs font-semibold">
          {validationError}
        </div>
      )}

      {/* District, Area, Component Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-[#002349]/10 to-[#002349]/5 p-4 rounded-2xl border border-gray-200">
          <label className="block text-sm font-semibold text-[#002349] mb-1.5">ജില്ല:</label>
          <div className="text-sm font-bold text-[#002349]">{localData.district}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-2xl border border-gray-200">
          <label className="block text-sm font-semibold text-green-900 mb-1.5">ഏരിയ:</label>
          <div className="text-sm font-bold text-green-800">{localData.area}</div>
        </div>
        <div className="bg-gradient-to-br from-[#957C3D]/20 to-[#8A6F35]/10 p-4 rounded-2xl border border-gray-200">
          <label className="block text-sm font-semibold text-[#957C3D] mb-1.5">ഘടകം: </label>
          <div className="text-sm font-bold text-[#957C3D]">{localData.component}</div>
        </div>
      </div>

      {/* Workers Information */}
      <div className="mb-8">
        <h3 className="text-base font-bold text-[#002349] mb-4">1. പ്രവർത്തകർ</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#002349] mb-1.5">റുക്ന്‍:</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={localData.workers?.rukkun || 0}
                onChange={(e) => {
                  const cleaned = validateNumericInput(e.target.value);
                  handleInputChange('workers.rukkun', cleaned);
                }}
                onKeyDown={handleNumericKeyDown}
                onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('workers.rukkun', value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#002349] mb-1.5">കാർകുൻ:</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={localData.workers?.karkun || 0}
                onChange={(e) => {
                  const cleaned = validateNumericInput(e.target.value);
                  handleInputChange('workers.karkun', cleaned);
                }}
                onKeyDown={handleNumericKeyDown}
                onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('workers.karkun', value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#002349] mb-1.5">ആക്ടീവ് അസോസിയേറ്റ്‌സ്</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={localData.workers?.activeAssociate || 0}
                onChange={(e) => {
                  const cleaned = validateNumericInput(e.target.value);
                  handleInputChange('workers.activeAssociate', cleaned);
                }}
                onKeyDown={handleNumericKeyDown}
                onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('workers.activeAssociate', value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
                placeholder="0"
              />
            </div>
        </div>
      </div>

      {/* Part A Content */}
      <div className="space-y-8">
        {/* Expansion Activities Section */}
        <div className="mb-6">
          <h3 className="text-base font-bold text-[#002349] mb-2">
            Expansion മായി ബന്ധപെട്ട് നടന്ന പ്രവർത്തനങ്ങൾ
          </h3>
        </div>

        {/* Codes */}
        <div>
          <label className="block text-sm font-semibold text-[#002349] mb-1.5">2. A സ്കോഡുകൾ</label>
          <input
            type="text"
            value={localData.partA?.codes || ''}
            onChange={(e) => handleInputChange('partA.codes', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
            placeholder=" സ്കോഡുകളുടെ എണ്ണം നൽകുക"
          />
        </div>

        {/* Spoken Persons */}
        <div>
          <label className="block text-sm font-semibold text-[#002349] mb-1.5">3. സംസാരിച്ച വ്യക്തികള്‍</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#002349] mb-1.5">ആൺ</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={localData.partA?.spokenPersons?.male || 0}
                onChange={(e) => {
                  const cleaned = validateNumericInput(e.target.value);
                  handleInputChange('partA.spokenPersons.male', cleaned);
                }}
                onKeyDown={handleNumericKeyDown}
                onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('partA.spokenPersons.male', value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#002349] mb-1.5">പെൺ </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={localData.partA?.spokenPersons?.female || 0}
                onChange={(e) => {
                  const cleaned = validateNumericInput(e.target.value);
                  handleInputChange('partA.spokenPersons.female', cleaned);
                }}
                onKeyDown={handleNumericKeyDown}
                onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('partA.spokenPersons.female', value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
                placeholder="0"
              />
            </div>
          </div>
          {/* Totals helper row */}
          {(() => {
            const sums = computeAuthoritySums(localData);
            const maleMismatch = (Number(localData.partA?.spokenPersons?.male) || 0) !== sums.maleSum;
            const femaleMismatch = (Number(localData.partA?.spokenPersons?.female) || 0) !== sums.femaleSum;
            return (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className={maleMismatch ? 'text-red-600 font-semibold' : 'text-gray-600 font-medium'}>
                  മൊത്തം (ആൺ): {sums.maleSum} / നൽകിയിരിക്കുന്നത്: {Number(localData.partA?.spokenPersons?.male) || 0}
                </div>
                <div className={femaleMismatch ? 'text-red-600 font-semibold' : 'text-gray-600 font-medium'}>
                  മൊത്തം (പെൺ ): {sums.femaleSum} / നൽകിയിരിക്കുന്നത്: {Number(localData.partA?.spokenPersons?.female) || 0}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Authority Persons */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#002349] mb-1.5">
          4. ഏത് കാറ്റഗറിയില്‍ പെട്ടവരോടാണ്  സംസാരിച്ചവർ (✓ മാർക്ക് ചെയ്യുക):-
          </label>
          <div className="space-y-3">
            {authorityPersonsOptions.map((option, index) => {
              const gender = localData.partA?.authorityPersonsGender?.[option.key] || { male: false, female: false };
              const counts = localData.partA?.authorityPersonsCounts?.[option.key] || { male: 0, female: 0 };
              return (
                <div key={option.key} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-gray-700 mb-3">{option.label}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Male Section */}
                    <div className="flex flex-col space-y-2">
                      <label className="inline-flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!gender.male}
                          onChange={(e) => handleGenderCheckboxChange(option.key, 'male', e.target.checked)}
                          className="w-4 h-4 text-[#002349] bg-gray-100 border-gray-300 rounded focus:ring-[#002349] focus:ring-2"
                        />
                        <span className="font-semibold">ആൺ</span>
                      </label>
                      {gender.male && (
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={counts.male || 0}
                          onChange={(e) => {
                            const cleaned = validateNumericInput(e.target.value);
                            handleInputChange(`partA.authorityPersonsCounts.${option.key}.male`, cleaned);
                          }}
                          onKeyDown={handleNumericKeyDown}
                          onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange(`partA.authorityPersonsCounts.${option.key}.male`, value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300"
                          placeholder="എണ്ണം"
                        />
                      )}
                    </div>
                    
                    {/* Female Section */}
                    <div className="flex flex-col space-y-2">
                      <label className="inline-flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!gender.female}
                          onChange={(e) => handleGenderCheckboxChange(option.key, 'female', e.target.checked)}
                          className="w-4 h-4 text-[#002349] bg-gray-100 border-gray-300 rounded focus:ring-[#002349] focus:ring-2"
                        />
                        <span className="font-semibold">പെൺ </span>
                      </label>
                      {gender.female && (
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={counts.female || 0}
                          onChange={(e) => {
                            const cleaned = validateNumericInput(e.target.value);
                            handleInputChange(`partA.authorityPersonsCounts.${option.key}.female`, cleaned);
                          }}
                          onKeyDown={handleNumericKeyDown}
                          onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange(`partA.authorityPersonsCounts.${option.key}.female`, value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300"
                          placeholder="എണ്ണം"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Other (specify) */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-[#002349] mb-1.5">5. മറ്റുള്ളവ (വ്യക്തമാക്കുക)</label>
          <input
            type="text"
            value={localData.partA?.authorityOtherText || ''}
            onChange={(e) => handleInputChange('partA.authorityOtherText', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
            placeholder="വ്യക്തമാക്കുക"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-12 flex justify-end">
        <button
          onClick={handleNext}
          className="inline-flex items-center min-h-[44px] px-6 py-2 bg-gradient-to-r from-[#002349] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#002349] text-white text-sm font-semibold rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#002349] focus:ring-offset-2 transition-all duration-500 hover:shadow-lg transform hover:scale-105 ease-out hover:shadow-[#002349]/50"
        >
          അടുത്തത്
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default UnitPageA;