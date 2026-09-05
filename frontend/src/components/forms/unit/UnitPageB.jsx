import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { validateNumericInput, handleNumericKeyDown, handleNumericPaste } from '../../../utils/validation';

const UnitPageB = ({ onNext, onPrevious, formData, setFormData }) => {
  // Member categories options

  // Initialize with default values and merge with formData
  const [partBData, setPartBData] = useState({
      newJIHMembers: {
        male: '',
        female: ''
      },
      memberCategories: {
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
      memberCategoriesGender: {},
      memberCategoriesCounts: {}
  });

  const [partCData, setPartCData] = useState({
      publicMeetingAttendees: {
        male: '',
        female: ''
      }
  });

  const [partDData, setPartDData] = useState({
      growthAcceleration: {
        rukkun: {
          male: 0,
          female: 0
        },
        karkun: {
          male: 0,
          female: 0
        },
        solidarity: {
          male: 0,
          female: 0
        },
        sio: {
          male: 0,
          female: 0
        },
        gio: {
          male: 0,
          female: 0
        }
      }
  });

  // Initialize data from formData when component mounts or formData changes
  useEffect(() => {
    if (formData) {
      console.log('UnitPageB: Initializing with formData:', formData);
      console.log('UnitPageB: formData.partB:', formData.partB);
      console.log('UnitPageB: formData.partB.memberCategories:', formData.partB?.memberCategories);
      
      // Initialize partB data
      if (formData.partB) {
        setPartBData(prev => ({
          newJIHMembers: {
            male: formData.partB.newJIHMembers?.male || prev.newJIHMembers?.male || 0,
            female: formData.partB.newJIHMembers?.female || prev.newJIHMembers?.female || 0
          },
          memberCategories: {
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
            ...prev.memberCategories,
            ...(formData.partB.memberCategories || {})
          },
          memberCategoriesGender: {
            // Initialize all categories with default values first
            ...memberCategoriesOptions.reduce((acc, opt) => {
              acc[opt.key] = { male: false, female: false };
              return acc;
            }, {}),
            // Then apply existing values
            ...prev.memberCategoriesGender,
            // Finally apply formData values (this takes priority)
            ...(formData.partB.memberCategoriesGender || {})
          },
          memberCategoriesCounts: {
            // Initialize all categories with default values first
            ...memberCategoriesOptions.reduce((acc, opt) => {
              acc[opt.key] = { male: 0, female: 0 };
              return acc;
            }, {}),
            // Then apply existing values
            ...prev.memberCategoriesCounts,
            // Finally apply formData values (this takes priority)
            ...(formData.partB.memberCategoriesCounts || {})
          }
        }));
      }

      // Initialize partC data (public meeting attendees)
      if (formData.partC) {
        setPartCData(prev => ({
          publicMeetingAttendees: {
            male: formData.partC.publicMeetingAttendees?.male || prev.publicMeetingAttendees?.male || 0,
            female: formData.partC.publicMeetingAttendees?.female || prev.publicMeetingAttendees?.female || 0
          }
        }));
      }

      // Initialize partD data (growth)
      if (formData.partD) {
        setPartDData(prev => ({
          growthAcceleration: {
            rukkun: {
              male: formData.partD.growthAcceleration?.rukkun?.male || prev.growthAcceleration?.rukkun?.male || 0,
              female: formData.partD.growthAcceleration?.rukkun?.female || prev.growthAcceleration?.rukkun?.female || 0
            },
            karkun: {
              male: formData.partD.growthAcceleration?.karkun?.male || prev.growthAcceleration?.karkun?.male || 0,
              female: formData.partD.growthAcceleration?.karkun?.female || prev.growthAcceleration?.karkun?.female || 0
            },
            solidarity: {
              male: formData.partD.growthAcceleration?.solidarity?.male || prev.growthAcceleration?.solidarity?.male || 0,
              female: formData.partD.growthAcceleration?.solidarity?.female || prev.growthAcceleration?.solidarity?.female || 0
            },
            sio: {
              male: formData.partD.growthAcceleration?.sio?.male || prev.growthAcceleration?.sio?.male || 0,
              female: formData.partD.growthAcceleration?.sio?.female || prev.growthAcceleration?.sio?.female || 0
            },
            gio: {
              male: formData.partD.growthAcceleration?.gio?.male || prev.growthAcceleration?.gio?.male || 0,
              female: formData.partD.growthAcceleration?.gio?.female || prev.growthAcceleration?.gio?.female || 0
            }
          }
        }));
      }
    }
  }, [formData]);

  // Handle PartB input changes
  const handlePartBInputChange = useCallback((field, value) => {
    console.log(`PartB input change: ${field} = ${value}`);
    setPartBData(prev => {
      const newData = { ...prev };
      
      if (field === 'newJIHMembers.male') {
        newData.newJIHMembers = { ...newData.newJIHMembers, male: value };
      } else if (field === 'newJIHMembers.female') {
        newData.newJIHMembers = { ...newData.newJIHMembers, female: value };
      } else if (field.startsWith('memberCategories.')) {
        const categoryKey = field.replace('memberCategories.', '');
        newData.memberCategories = { ...newData.memberCategories, [categoryKey]: value };
      } else if (field.startsWith('memberCategoriesGender.')) {
        const rest = field.replace('memberCategoriesGender.', '');
        const [categoryKey, genderKey] = rest.split('.');
        const existing = newData.memberCategoriesGender?.[categoryKey] || { male: false, female: false };
        newData.memberCategoriesGender = {
          ...newData.memberCategoriesGender,
          [categoryKey]: { ...existing, [genderKey]: value }
        };
      } else if (field.startsWith('memberCategoriesCounts.')) {
        const rest = field.replace('memberCategoriesCounts.', '');
        const [categoryKey, genderKey] = rest.split('.');
        const existing = newData.memberCategoriesCounts?.[categoryKey] || { male: 0, female: 0 };
        newData.memberCategoriesCounts = {
          ...newData.memberCategoriesCounts,
          [categoryKey]: { ...existing, [genderKey]: value }
        };
      }
      
      // Update parent form data
      if (setFormData) {
        setFormData(prevFormData => ({
          ...prevFormData,
          partB: newData
        }));
      }
      
      return newData;
    });
  }, [setFormData]);

  // Handle PartC input changes (public meeting attendees)
  const handlePartCInputChange = useCallback((field, value) => {
    console.log(`PartC input change: ${field} = ${value}`);
    setPartCData(prev => {
      const newData = { ...prev };
      
      if (field.startsWith('publicMeetingAttendees.')) {
        const key = field.replace('publicMeetingAttendees.', '');
        newData.publicMeetingAttendees = { ...newData.publicMeetingAttendees, [key]: value };
      }
      
      // Update parent form data
      if (setFormData) {
        setFormData(prevFormData => ({
          ...prevFormData,
          partC: newData
        }));
      }
      
      return newData;
    });
  }, [setFormData]);

  // Handle PartD input changes (growth)
  const handlePartDInputChange = useCallback((field, value) => {
    console.log(`PartD input change: ${field} = ${value}`);
    setPartDData(prev => {
      const newData = { ...prev };
      
      if (field.startsWith('growthAcceleration.')) {
        const remainingField = field.replace('growthAcceleration.', '');
        const parts = remainingField.split('.');
        
        if (parts.length === 2) {
          const [category, gender] = parts;
          newData.growthAcceleration = {
            ...newData.growthAcceleration,
            [category]: {
              ...newData.growthAcceleration[category],
              [gender]: value
            }
          };
        } else {
          // Fallback for old format (shouldn't happen with new structure)
          newData.growthAcceleration = { ...newData.growthAcceleration, [remainingField]: value };
        }
      }
      
      // Update parent form data
      if (setFormData) {
        setFormData(prevFormData => ({
          ...prevFormData,
          partD: newData
        }));
      }
      
      return newData;
    });
  }, [setFormData]);

  // Special handler for checkboxes to ensure they work properly
  const handleCheckboxChange = useCallback((optionKey, checked) => {
    console.log(`Checkbox ${optionKey} changed to:`, checked);
    setPartBData(prev => {
      const newData = {
        ...prev,
          memberCategories: {
          ...prev.memberCategories,
            [optionKey]: checked
        }
      };
      
      // Update parent form data
      if (setFormData) {
        setFormData(prevFormData => ({
          ...prevFormData,
          partB: newData
        }));
      }
      
      return newData;
    });
  }, [setFormData]);

  // Gender checkbox change per category
  const handleGenderCheckboxChange = useCallback((optionKey, genderKey, checked) => {
    setPartBData(prev => {
      const next = { ...prev };
      const existing = next.memberCategoriesGender?.[optionKey] || { male: false, female: false };
      next.memberCategoriesGender = {
        ...next.memberCategoriesGender,
        [optionKey]: { ...existing, [genderKey]: checked }
      };

      // If unchecked, also zero-out the corresponding count to keep totals consistent
      const existingCounts = next.memberCategoriesCounts?.[optionKey] || { male: 0, female: 0 };
      next.memberCategoriesCounts = {
        ...next.memberCategoriesCounts,
        [optionKey]: {
          ...existingCounts,
          [genderKey]: checked ? existingCounts[genderKey] : 0
        }
      };

      if (setFormData) {
        setFormData(prevFormData => ({
          ...prevFormData,
          partB: {
            ...prevFormData.partB,
            memberCategoriesGender: {
              ...(prevFormData.partB?.memberCategoriesGender || {}),
              [optionKey]: {
                ...((prevFormData.partB?.memberCategoriesGender || {})[optionKey]),
                [genderKey]: checked
              }
            },
            memberCategoriesCounts: {
              ...(prevFormData.partB?.memberCategoriesCounts || {}),
              [optionKey]: {
                ...((prevFormData.partB?.memberCategoriesCounts || {})[optionKey]),
                [genderKey]: checked ? ((prevFormData.partB?.memberCategoriesCounts || {})[optionKey]?.[genderKey] || 0) : 0
              }
            }
          }
        }));
      }

      return next;
    });
  }, [setFormData]);

  // Derived totals for Part B validation
  const computeMemberCategorySums = (data) => {
    let maleSum = 0;
    let femaleSum = 0;
    const counts = data.memberCategoriesCounts || {};
    const genders = data.memberCategoriesGender || {};
    memberCategoriesOptions.forEach(opt => {
      const g = genders[opt.key] || { male: false, female: false };
      const c = counts[opt.key] || { male: 0, female: 0 };
      if (g.male) maleSum += Number(c.male) || 0;
      if (g.female) femaleSum += Number(c.female) || 0;
    });
    return { maleSum, femaleSum };
  };

  const [validationError, setValidationError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleNext = () => {
    if (hasSubmitted) return;
    console.log('UnitPageB - partBData being sent:', partBData);
    console.log('UnitPageB - memberCategoriesCounts:', partBData.memberCategoriesCounts);

    // Validate Part B: totals must match newJIHMembers male/female
    const { maleSum, femaleSum } = computeMemberCategorySums(partBData);
    const newMale = Number(partBData.newJIHMembers?.male) || 0;
    const newFemale = Number(partBData.newJIHMembers?.female) || 0;
    if (maleSum !== newMale || femaleSum !== newFemale) {
      setValidationError('പുതുതായി വന്നവർ (ആൺ /പെൺ ) മൊത്തം എണ്ണം തെരഞ്ഞെടുത്ത കാറ്റഗറി എണ്ണങ്ങളുടെ മൊത്തവുമായി പൊരുത്തപ്പെടണം.');
      return;
    }
    setValidationError('');
    setHasSubmitted(true);

    // Update the parent form data with UnitPageB data before submitting
    if (setFormData) {
      setFormData(prev => {
        const newData = {
          ...prev,
          partB: partBData,
          partC: partCData,
          partD: partDData
        };
        console.log('Updated formData:', newData);
        return newData;
      });
    }
    
    // Call the submit function
    if (onNext) {
      onNext();
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious({ partB: partBData, partC: partCData, partD: partDData });
    }
  };

  const memberCategoriesOptions = [
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

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="hidden lg:block mb-8">
        <h2 className="text-xl font-bold text-[#002349] mb-1.5">
          UNIT PAGE B
        </h2>
        <p className="text-sm text-gray-600">
          യൂണിറ്റ് തലത്തിൽ പുതിയ അംഗങ്ങളും വർധനവും
        </p>
      </div>

      {validationError && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 border-2 border-red-200 text-xs font-semibold">
          {validationError}
        </div>
      )}

      {/* PART B */}
      <div className="mb-8">
        <h3 className="text-base font-bold text-[#002349] mb-4">
          PART B
        </h3>
        
        {/* New JIH Members */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#002349] mb-1.5">
            6. പുതുതായി പ്രതിവാരയോഗത്തില്‍ വന്നവർ:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#002349] mb-1.5">
                ആൺ 
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={partBData.newJIHMembers.male || 0}
                onChange={(e) => {
                  const cleaned = validateNumericInput(e.target.value);
                  handlePartBInputChange('newJIHMembers.male', cleaned);
                }}
                onKeyDown={handleNumericKeyDown}
                onPaste={(e) => handleNumericPaste(e, (value) => handlePartBInputChange('newJIHMembers.male', value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
                placeholder="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-[#002349] mb-1.5">
                പെൺ 
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={partBData.newJIHMembers.female || 0}
                onChange={(e) => {
                  const cleaned = validateNumericInput(e.target.value);
                  handlePartBInputChange('newJIHMembers.female', cleaned);
                }}
                onKeyDown={handleNumericKeyDown}
                onPaste={(e) => handleNumericPaste(e, (value) => handlePartBInputChange('newJIHMembers.female', value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Member Categories with Gender */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#002349] mb-1.5">
            7. ഏത് കാറ്റഗറിയിൽ പെട്ടവരാണ് വന്നവർ(✓ മാർക്ക് ചെയ്യുക):-
          </label>
          <div className="space-y-3">
            {memberCategoriesOptions.map((option, index) => {
              const gender = partBData.memberCategoriesGender?.[option.key] || { male: false, female: false };
              const counts = partBData.memberCategoriesCounts?.[option.key] || { male: 0, female: 0 };
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
                            handlePartBInputChange(`memberCategoriesCounts.${option.key}.male`, cleaned);
                          }}
                          onKeyDown={handleNumericKeyDown}
                          onPaste={(e) => handleNumericPaste(e, (value) => handlePartBInputChange(`memberCategoriesCounts.${option.key}.male`, value))}
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
                            handlePartBInputChange(`memberCategoriesCounts.${option.key}.female`, cleaned);
                          }}
                          onKeyDown={handleNumericKeyDown}
                          onPaste={(e) => handleNumericPaste(e, (value) => handlePartBInputChange(`memberCategoriesCounts.${option.key}.female`, value))}
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
          {/* Totals helper row for Part B */}
          {(() => {
            const sums = computeMemberCategorySums(partBData);
            const maleMismatch = (Number(partBData.newJIHMembers?.male) || 0) !== sums.maleSum;
            const femaleMismatch = (Number(partBData.newJIHMembers?.female) || 0) !== sums.femaleSum;
            return (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className={maleMismatch ? 'text-red-600 font-semibold' : 'text-gray-600 font-medium'}>
                  മൊത്തം (ആൺ ): {sums.maleSum} / നൽകിയിരിക്കുന്നത്: {Number(partBData.newJIHMembers?.male) || 0}
                </div>
                <div className={femaleMismatch ? 'text-red-600 font-semibold' : 'text-gray-600 font-medium'}>
                  മൊത്തം (പെൺ ): {sums.femaleSum} / നൽകിയിരിക്കുന്നത്: {Number(partBData.newJIHMembers?.female) || 0}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* PART C - Public Meeting Attendees */}
      <div className="mb-8">
        <h3 className="text-base font-bold text-[#002349] mb-4">
          PART C
        </h3>
        
        {/* Public Meeting Attendees */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#002349] mb-1.5">
            8. പ്രതിമാസ പൊതുയോഗത്തിൽ വന്ന മറ്റുള്ളവർ:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#002349] mb-1.5">ആൺ </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={partCData.publicMeetingAttendees.male || 0}
                onChange={(e) => {
                  const cleaned = validateNumericInput(e.target.value);
                  handlePartCInputChange('publicMeetingAttendees.male', cleaned);
                }}
                onKeyDown={handleNumericKeyDown}
                onPaste={(e) => handleNumericPaste(e, (value) => handlePartCInputChange('publicMeetingAttendees.male', value))}
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
                value={partCData.publicMeetingAttendees.female || 0}
                onChange={(e) => {
                  const cleaned = validateNumericInput(e.target.value);
                  handlePartCInputChange('publicMeetingAttendees.female', cleaned);
                }}
                onKeyDown={handleNumericKeyDown}
                onPaste={(e) => handleNumericPaste(e, (value) => handlePartCInputChange('publicMeetingAttendees.female', value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* PART D - Growth Acceleration */}
      <div className="mb-8">
        <h3 className="text-base font-bold text-[#002349] mb-4">PART D</h3>
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#002349] mb-1.5">9. റിപ്പോർട്ട് കാലയളവിലെ വർധനവ്:</label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Rukkun */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-semibold text-[#002349] mb-3">റുക്ൻ</label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">പുരുഷൻ</label>
                  <input 
                    type="number" 
                    value={partDData.growthAcceleration.rukkun?.male || 0} 
                    onChange={(e) => handlePartDInputChange('growthAcceleration.rukkun.male', Math.max(0, parseInt(e.target.value) || 0))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50" 
                    placeholder="എണ്ണം നൽകുക" 
                    min="0" 
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">സ്ത്രീ</label>
                  <input 
                    type="number" 
                    value={partDData.growthAcceleration.rukkun?.female || 0} 
                    onChange={(e) => handlePartDInputChange('growthAcceleration.rukkun.female', Math.max(0, parseInt(e.target.value) || 0))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50" 
                    placeholder="എണ്ണം നൽകുക" 
                    min="0" 
                  />
                </div>
              </div>
            </div>

            {/* Karkun */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-semibold text-[#002349] mb-3">കാർകുൻ</label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">പുരുഷൻ</label>
                  <input 
                    type="number" 
                    value={partDData.growthAcceleration.karkun?.male || 0} 
                    onChange={(e) => handlePartDInputChange('growthAcceleration.karkun.male', Math.max(0, parseInt(e.target.value) || 0))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50" 
                    placeholder="എണ്ണം നൽകുക" 
                    min="0" 
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">സ്ത്രീ</label>
                  <input 
                    type="number" 
                    value={partDData.growthAcceleration.karkun?.female || 0} 
                    onChange={(e) => handlePartDInputChange('growthAcceleration.karkun.female', Math.max(0, parseInt(e.target.value) || 0))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50" 
                    placeholder="എണ്ണം നൽകുക" 
                    min="0" 
                  />
                </div>
              </div>
            </div>

            {/* Solidarity - single count */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-semibold text-[#002349] mb-3">സോളിഡാരിറ്റി</label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">മൊത്തം</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={partDData.growthAcceleration.solidarity?.male || 0}
                    onChange={(e) => {
                      const cleaned = validateNumericInput(e.target.value);
                      handlePartDInputChange('growthAcceleration.solidarity.male', cleaned);
                    }}
                    onKeyDown={handleNumericKeyDown} 
                    onPaste={(e) => handleNumericPaste(e, (value) => handlePartDInputChange('growthAcceleration.solidarity.male', value))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50" 
                    placeholder="0" 
                  />
                </div>
              </div>
            </div>

            {/* SIO - single count */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-semibold text-[#002349] mb-3">SIO</label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">മൊത്തം</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={partDData.growthAcceleration.sio?.male || 0}
                    onChange={(e) => {
                      const cleaned = validateNumericInput(e.target.value);
                      handlePartDInputChange('growthAcceleration.sio.male', cleaned);
                    }}
                    onKeyDown={handleNumericKeyDown} 
                    onPaste={(e) => handleNumericPaste(e, (value) => handlePartDInputChange('growthAcceleration.sio.male', value))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50" 
                    placeholder="0" 
                  />
                </div>
              </div>
            </div>

            {/* GIO - single count */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-semibold text-[#002349] mb-3">GIO</label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">മൊത്തം</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={partDData.growthAcceleration.gio?.male || 0}
                    onChange={(e) => {
                      const cleaned = validateNumericInput(e.target.value);
                      handlePartDInputChange('growthAcceleration.gio.male', cleaned);
                    }}
                    onKeyDown={handleNumericKeyDown} 
                    onPaste={(e) => handleNumericPaste(e, (value) => handlePartDInputChange('growthAcceleration.gio.male', value))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50" 
                    placeholder="0" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-12 flex justify-between">
        <button
          onClick={handlePrevious}
          className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-2 min-h-[44px] rounded-2xl text-sm font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg transform hover:scale-105 ease-out hover:shadow-gray-500/50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>മുമ്പത്തെ</span>
        </button>

        <button
          onClick={handleNext}
          disabled={hasSubmitted}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 min-h-[44px] rounded-2xl text-sm font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg transform hover:scale-105 ease-out hover:shadow-green-500/50"
        >
          <span>സബ്മിറ്റ് ചെയ്യുക</span>
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default UnitPageB;
