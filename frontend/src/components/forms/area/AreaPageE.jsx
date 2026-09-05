import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAreaForm } from '../../../contexts/AreaFormContext';
import { validateNumericInput, handleNumericKeyDown, handleNumericPaste } from '../../../utils/validation';

const AreaPageE = () => {
  const { formData, updateFormData, nextStep, prevStep, validateCurrentStep } = useAreaForm();

  const handleCategoryChange = (categoryKey, checked) => {
    updateFormData('partE', {
      categories: {
        ...formData.partE.categories,
        [categoryKey]: checked
      }
    });
  };

  const handleCountChange = (categoryKey, genderKey, value) => {
    const numericValue = validateNumericInput(value);
    updateFormData('partE', {
      categoriesCounts: {
        ...formData.partE.categoriesCounts,
        [categoryKey]: {
          ...formData.partE.categoriesCounts?.[categoryKey],
          [genderKey]: numericValue === '' ? 0 : parseInt(numericValue) || 0
        }
      }
    });
  };

  // Calculate totals from categories
  const calculateCategoryTotals = () => {
    let maleTotal = 0;
    let femaleTotal = 0;
    
    const categoriesCounts = formData.partE.categoriesCounts || {};
    
    Object.values(categoriesCounts).forEach(counts => {
      if (counts) {
        maleTotal += parseInt(counts.male || 0);
        femaleTotal += parseInt(counts.female || 0);
      }
    });
    
    return { maleTotal, femaleTotal };
  };

  return (
    <div className="p-5 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-4xl mx-auto hover:shadow-xl transition-all duration-500">
      {/* Header */}
      <div className="hidden lg:block mb-5">
        <h2 className="text-xl font-bold text-[#002349] mb-1.5">
          ഏരിയ തലം റിപ്പോർട്ട് - PART E
        </h2>
        <p className="text-sm text-gray-600">
          പുതിയ വ്യക്തികളെ കണ്ടെത്തുന്നതിനായി സംസാരിച്ച വ്യക്തികൾ
        </p>
      </div>

      {/* New Person Discovery */}
      <div className="mb-5">
        <h3 className="text-base font-bold text-[#002349] mb-3">
          1. പുതിയ വ്യക്തികളെ കണ്ടെത്തുന്നതിനായി സംസാരിച്ച വ്യക്തികൾ
        </h3>
        
        {/* Gender Count */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-[#002349] mb-1.5">
              ആണ്‍
            </label>
            <input
              type="text"
              value={formData.partE.male !== null && formData.partE.male !== undefined ? formData.partE.male : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                updateFormData('partE', { male: value === '' ? null : parseInt(value) || 0 });
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
              placeholder="എണ്ണം നൽകുക"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#002349] mb-1.5">
              പെണ്‍
            </label>
            <input
              type="text"
              value={formData.partE.female !== null && formData.partE.female !== undefined ? formData.partE.female : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                updateFormData('partE', { female: value === '' ? null : parseInt(value) || 0 });
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
              placeholder="എണ്ണം നൽകുക"
            />
          </div>
        </div>

        {/* Totals Validation Display */}
        {(() => {
          const { maleTotal, femaleTotal } = calculateCategoryTotals();
          const overallMale = parseInt(formData.partE.male || 0);
          const overallFemale = parseInt(formData.partE.female || 0);
          const maleMismatch = maleTotal !== overallMale;
          const femaleMismatch = femaleTotal !== overallFemale;
          
          return (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <h4 className="text-sm font-semibold text-[#002349] mb-2">തുക പരിശോധന:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className={maleMismatch ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                  <strong>ആൺ:</strong> കാറ്റഗറി ആകെ = {maleTotal} / മൊത്തം നൽകിയത് = {overallMale}
                  {maleMismatch && <span className="block text-[10px] mt-0.5">⚠️ എണ്ണങ്ങൾ പൊരുത്തപ്പെടണം</span>}
                </div>
                <div className={femaleMismatch ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                  <strong>പെൺ :</strong> കാറ്റഗറി ആകെ = {femaleTotal} / മൊത്തം നൽകിയത് = {overallFemale}
                  {femaleMismatch && <span className="block text-[10px] mt-0.5">⚠️ എണ്ണങ്ങൾ പൊരുത്തപ്പെടണം</span>}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Categories */}
        <div>
          <h4 className="text-sm font-semibold text-[#002349] mb-3">
            ഏത് കാറ്റഗറിയില്‍പെട്ടവരോടാണ് സംസാരിച്ചത് (v മാര്‍ക്ക് ചെയ്യുക)
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {[
              { key: 'personalConnection', label: 'വ്യക്തിബന്ധം' },
              { key: 'literaryConnection', label: 'സാഹിത്യബന്ധം' },
              { key: 'qscStudent', label: 'QSC പഠിതാവ്' },
              { key: 'regularKhutbaListener', label: 'സ്ഥിരമായി ഖുതുബ കേള്‍ക്കുന്നയാള്‍' },
              { key: 'prabodhanamReader', label: 'പ്രബോധനം വായനക്കാരന്‍' },
              { key: 'jaBeneficiary', label: 'PF ഗുണഭോക്താവ്' },
              { key: 'adaBeneficiary', label: 'BZ ഗുണഭോക്താവ്' },
              { key: 'localReliefBeneficiary', label: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്' },
              { key: 'aaramamReader', label: 'ആരാമം വായനക്കാരി' },
              { key: 'thawheedulMaraStudent', label: 'തംഹീദുല്‍ മര്‍അ പഠിതാവ്' },
              { key: 'madrasaAlumni', label: 'മദ്‌റസ പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി' },
              { key: 'islamicCollegeAlumni', label: 'ഇസ്്‌ലാമിയ കോളജ് പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി' },
              { key: 'neighborhoodMember', label: 'അയല്‍കൂട്ടം അംഗം' },
              { key: 'palliativeConnection', label: 'പാലിയേറ്റീവ് ബന്ധം' },
              { key: 'friendsClubMember', label: 'Friends Club അംഗം' },
              { key: 'mediaReader', label: 'മാധ്യമം വായനക്കാരന്‍' },
              { key: 'ayahDarsQuranStudent', label: 'ആയാത് ദര്‍സെ ഖുര്‍ആന്‍ പഠിതാവ്' },
              { key: 'heavenGuardian', label: 'ഹെവന്‍സിലെ രക്ഷിതാവ്' },
              { key: 'schoolGuardian', label: 'സ്‌കൂളിലെ രക്ഷിതാവ്' },
              { key: 'arabicCollegeGuardian', label: 'അറബികോളജ് രക്ഷിതാവ്' },
              { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാര്‍ത്ഥി' },
              { key: 'artsCollegeStudent', label: 'ആര്‍ട്‌സ് കോളജ് വിദ്യാര്‍ത്ഥി' },
              { key: 'artsCollegeGuardian', label: 'ആര്‍ട്‌സ് കോളജ് രക്ഷിതാവ്' },
              { key: 'publicCampusStudent', label: 'പൊതു കാമ്പസിലെ വിദ്യാര്‍ത്ഥി' },
              { key: 'otherNGOs', label: 'മറ്റു NGO കള്‍' },
              { key: 'mahallConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
              { key: 'fulltimeWorkerConnection', label: 'ഫുള്‍െൈടം പ്രവര്‍ത്തകനുമായുള്ള ബന്ധം' }
            ].map((item, index) => (
              <div key={item.key} className="p-3 border border-gray-200 rounded-xl">
                <div className="text-xs font-medium text-gray-700 mb-2">{item.label}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Male Section */}
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.partE.categories[item.key]?.male || false}
                        onChange={(e) => handleCategoryChange(item.key, { ...formData.partE.categories[item.key], male: e.target.checked })}
                        className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-xs font-medium text-blue-800">ആൺ</span>
                    </div>
                    {formData.partE.categories[item.key]?.male && (
                      <input
                        type="text"
                        value={formData.partE.categoriesCounts?.[item.key]?.male || ''}
                        onChange={(e) => handleCountChange(item.key, 'male', e.target.value)}
                        onKeyDown={handleNumericKeyDown}
                        onPaste={(e) => handleNumericPaste(e, (value) => handleCountChange(item.key, 'male', value))}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full px-2 py-1.5 border border-blue-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-transparent text-[16px] sm:text-xs"
                        placeholder="എണ്ണം"
                        min="0"
                      />
                    )}
                  </div>
                  
                  {/* Female Section */}
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.partE.categories[item.key]?.female || false}
                        onChange={(e) => handleCategoryChange(item.key, { ...formData.partE.categories[item.key], female: e.target.checked })}
                        className="h-3.5 w-3.5 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                      />
                      <span className="text-xs font-medium text-pink-800">പെൺ </span>
                    </div>
                    {formData.partE.categories[item.key]?.female && (
                      <input
                        type="text"
                        value={formData.partE.categoriesCounts?.[item.key]?.female || ''}
                        onChange={(e) => handleCountChange(item.key, 'female', e.target.value)}
                        onKeyDown={handleNumericKeyDown}
                        onPaste={(e) => handleNumericPaste(e, (value) => handleCountChange(item.key, 'female', value))}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full px-2 py-1.5 border border-pink-300 rounded-xl focus:ring-1 focus:ring-pink-500 focus:border-transparent text-[16px] sm:text-xs"
                        placeholder="എണ്ണം"
                        min="0"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="block text-sm font-semibold text-[#002349] mb-1.5">മറ്റുള്ളവ (വ്യക്തമാക്കുക)</label>
            <input
              type="text"
              value={formData.partE.otherCategory || ''}
              onChange={(e) => updateFormData('partE', { otherCategory: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
              placeholder="മറ്റുള്ളവ എഴുതുക"
            />
          </div>
        </div>
      </div>

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
          onClick={nextStep}
          disabled={!validateCurrentStep()}
          className="bg-[#002349] hover:bg-[#1a3a5c] text-white px-5 py-2 rounded-2xl text-sm min-h-[44px] font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out disabled:bg-gray-400 disabled:transform-none disabled:hover:translate-y-0 disabled:hover:scale-100"
        >
          <span>അടുത്തത്</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AreaPageE;










