import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAreaForm } from '../../../contexts/AreaFormContext';
import { validateNumericInput, handleNumericKeyDown, handleNumericPaste } from '../../../utils/validation';

const AreaPageD = () => {
  const { formData, updateFormData, nextStep, prevStep, validateCurrentStep } = useAreaForm();

  const wings = [
    { key: 'jih', label: 'JIH' },
    { key: 'vanitha', label: 'വനിത' },
    { key: 'solidarity', label: 'സോളിഡാരിറ്റി' },
    { key: 'sio', label: 'SIO' },
    { key: 'gio', label: 'GIO' }
  ];
  const validateCounts = () => {
    const categories = formData.partD.categories || {};
    const counts = formData.partD.categoriesCounts || {};
  
    let totalMale = 0;
    let totalFemale = 0;
  
    Object.keys(counts).forEach(key => {
      totalMale += parseInt(counts[key]?.male || 0, 10);
      totalFemale += parseInt(counts[key]?.female || 0, 10);
    });
  
    const overallMale = parseInt(formData.partD.totalMale || 0, 10);
    const overallFemale = parseInt(formData.partD.totalFemale || 0, 10);
  
    return totalMale === overallMale && totalFemale === overallFemale;
  };
  
  const setActivity = (wingKey, field, value) => {
    const parsed = field === 'componentVisits' ? (value === '' ? null : parseInt(validateNumericInput(value)) || 0) : value;
    updateFormData('partD', {
      activities: {
        ...formData.partD.activities,
        [wingKey]: {
          ...formData.partD.activities[wingKey],
          [field]: parsed
        }
      }
    });
  };

  return (
    <div className="p-5 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-4xl mx-auto hover:shadow-xl transition-all duration-500">
      <div className="hidden lg:block mb-5">
        <h2 className="text-xl font-bold text-[#002349] mb-1.5">ഏരിയ തലം റിപ്പോർട്ട് - PART D</h2>
        <p className="text-sm text-gray-600">ഏരിയ ടീം നടത്തിയ പ്രവര്‍ത്തനങ്ങള്‍</p>
      </div>

      <div className="mb-5">
        <h3 className="text-base font-bold text-[#002349] mb-3">1. ഏരിയ ടീം നടത്തിയ പ്രവര്‍ത്തനങ്ങള്‍</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full border-collapse min-w-full ih-table-compact">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-700 sticky left-0 bg-white z-[1]"></th>
                {wings.map(w => (
                  <th key={w.key} className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700">{w.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50 transition-colors duration-200">
                <td className="border border-gray-200 px-3 py-2 text-xs font-semibold text-[#002349] whitespace-nowrap sticky left-0 bg-white z-[1]">ഘടക സന്ദര്‍ശനങ്ങള്‍ (എണ്ണം)</td>
                {wings.map(w => (
                  <td key={w.key} className="border border-gray-200 px-3 py-2">
                    <input
                      type="text"
                      value={formData.partD.activities[w.key]?.componentVisits ?? ''}
                      onChange={(e) => setActivity(w.key, 'componentVisits', e.target.value)}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={(e) => handleNumericPaste(e, (value) => setActivity(w.key, 'componentVisits', value))}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-xl text-center text-[16px] sm:text-sm focus:ring-1 focus:ring-[#002349] focus:border-transparent transition-all duration-300"
                      placeholder="0"
                    />
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50 transition-colors duration-200">
                <td className="border border-gray-200 px-3 py-2 text-xs font-semibold text-[#002349] whitespace-nowrap sticky left-0 bg-white z-[1]">പുതിയ ഘടക രൂപീകരണ ശ്രമങ്ങള്‍</td>
                {wings.map(w => (
                  <td key={w.key} className="border border-gray-200 px-3 py-2">
                    <div className="flex items-center justify-center space-x-3">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`newComponentAttempts-${w.key}`}
                          checked={formData.partD.activities[w.key]?.newComponentAttempts === 1}
                          onChange={() => setActivity(w.key, 'newComponentAttempts', 1)}
                          className="mr-1.5 w-3.5 h-3.5 text-[#002349]"
                        />
                        <span className="text-xs font-medium">Yes</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`newComponentAttempts-${w.key}`}
                          checked={formData.partD.activities[w.key]?.newComponentAttempts === 0}
                          onChange={() => setActivity(w.key, 'newComponentAttempts', 0)}
                          className="mr-1.5 w-3.5 h-3.5 text-[#002349]"
                        />
                        <span className="text-xs font-medium">No</span>
                      </label>
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50 transition-colors duration-200">
                <td className="border border-gray-200 px-3 py-2 text-xs font-semibold text-[#002349] whitespace-nowrap sticky left-0 bg-white z-[1]">പുതിയ വ്യക്തികളെ കണ്ടെത്താനുള്ള ശ്രമങ്ങള്‍</td>
                {wings.map(w => (
                  <td key={w.key} className="border border-gray-200 px-3 py-2">
                    <div className="flex items-center justify-center space-x-3">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`newPersonDiscovery-${w.key}`}
                          checked={formData.partD.activities[w.key]?.newPersonDiscoveryAttempts === 1}
                          onChange={() => setActivity(w.key, 'newPersonDiscoveryAttempts', 1)}
                          className="mr-1.5 w-3.5 h-3.5 text-[#002349]"
                        />
                        <span className="text-xs font-medium">Yes</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`newPersonDiscovery-${w.key}`}
                          checked={formData.partD.activities[w.key]?.newPersonDiscoveryAttempts === 0}
                          onChange={() => setActivity(w.key, 'newPersonDiscoveryAttempts', 0)}
                          className="mr-1.5 w-3.5 h-3.5 text-[#002349]"
                        />
                        <span className="text-xs font-medium">No</span>
                      </label>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={prevStep} className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded-2xl text-sm min-h-[44px] font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg">
          <ArrowLeft className="w-4 h-4" />
          <span>മുൻപത്തെ</span>
        </button>
        <button onClick={nextStep} disabled={!validateCurrentStep()} className="bg-[#002349] hover:bg-[#1a3a5c] text-white px-5 py-2 rounded-2xl text-sm min-h-[44px] font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out disabled:bg-gray-400 disabled:transform-none disabled:hover:translate-y-0 disabled:hover:scale-100">
          <span>അടുത്തത്</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AreaPageD;