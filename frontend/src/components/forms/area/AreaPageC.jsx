import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAreaForm } from '../../../contexts/AreaFormContext';

const AreaPageC = () => {
  const { formData, updateFormData, nextStep, prevStep, validateCurrentStep } = useAreaForm();

  const handleExpansionActivityChange = (activityKey, checked) => {
    updateFormData('partC', {
      expansionActivities: {
        ...formData.partC.expansionActivities,
        [activityKey]: checked
      }
    });
  };

  return (
    <div className="p-5 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-4xl mx-auto hover:shadow-xl transition-all duration-500">
      {/* Header */}
      <div className="hidden lg:block mb-5">
        <h2 className="text-xl font-bold text-[#002349] mb-1.5">
          ഏരിയ തലം റിപ്പോർട്ട് - PART C
        </h2>
        <p className="text-sm text-gray-600">
          താഴെ പറയുന്നവയിൽ ഏതൊക്കെ മേഖലകളിൽ ഫോകസ് ചെയ്തു
        </p>
      </div>

      {/* Focus Areas */}
      <div className="mb-5">
        <h3 className="text-base font-bold text-[#002349] mb-4">
          1. താഴെ പറയുന്നവയിൽ ഏതൊക്കെ മേഖലകളിൽ ഫോകസ് ചെയ്തു
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'newAreaWorkshop', label: 'പുതിയ പ്രദേശങ്ങളില്‍ പ്രസ്ഥാന വ്യാപനം ലക്ഷ്യംവെച്ച് വര്‍ക്‌ഷോപ്പ്' },
            { key: 'workerTraining', label: 'പ്രവര്‍ത്തകര്‍ക്ക് പരിശീലനം' },
            { key: 'newAreaAgenda', label: 'പുതിയ പ്രദേശത്തേക്കുള്ള അജണ്ട തയ്യാറാക്കല്‍' },
            { key: 'fulltimeRecruitment', label: 'ഫുള്‍ടൈമറുടെ നിയമനം' },
            { key: 'schoolGuardianCluster', label: 'സ്‌കൂള്‍ രക്ഷിതാക്കളുടെ ക്ലസ്റ്റര്‍ രൂപീകരണം' },
            { key: 'reliefDataCollection', label: 'റിലീഫ് ഗുണഭോക്താക്കളുടെ ഡാറ്റാ ശേഖരണം' },
            { key: 'workerDeployment', label: 'പുതിയ പ്രദേശത്തേക്ക് പ്രവര്‍ത്തകരെ വിന്യസിക്കല്‍' },
            { key: 'weeklyMeetingEffectiveness', label: 'വാരാന്തയോഗങ്ങളുടെ ഫലപ്രാപ്തി ഉറപ്പാക്കല്‍' },
            { key: 'khatheebUtilization', label: 'ഖത്തീബുമാരെ ഉപയോഗപെടുത്തല്‍' },
            { key: 'hajjUmrahGroup', label: 'ഹജ്ജ്/ ഉംറ ഗ്രൂപ്പില്‍ പോയവരെ കണ്ടെത്തല്‍' },
            { key: 'artsScienceCampus', label: 'ഏരിയയിലെ Arts & Science കോളജ് കാമ്പസില്‍ ഫ്രറ്റേണിറ്റി, SIO, GIO, സാനിധ്യം ഉറപ്പാക്കല്‍' },
            { key: 'madrasaGrowthCalculation', label: 'മദ്‌റസയിലൂടെയുള്ള പ്രസ്ഥാന വളര്‍ച്ചയുടെ കണക്കെടുപ്പ്' },
            { key: 'schoolCenteredWork', label: 'സ്‌കൂളുകള്‍ കേന്ദ്രീകരിച്ചുള്ള പ്രവര്‍ത്തനം' },
            { key: 'staffHalkaFormation', label: 'സ്റ്റാഫ് ഹല്‍ഖാ രൂപീകരണം' },
            { key: 'islamicCollegeAlumni', label: 'ഇസ്്‌ലാമിയ കോളേജുകളിലെ പൂര്‍വ്വ വിദ്യാര്‍ത്ഥികളെ കണ്ടെത്തല്‍' },
            { key: 'quranStudyCenterWork', label: 'ഖുര്‍ആന്‍ സ്റ്റഡി സെന്റര്‍ കേന്ദ്രീകരിച്ചുള്ള പ്രവര്‍ത്തനങ്ങള്‍' }
          ].map((item, index) => (
            <label key={item.key} className="flex items-start space-x-2 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200">
              <input
                type="checkbox"
                checked={formData.partC.expansionActivities[item.key] || false}
                onChange={(e) => handleExpansionActivityChange(item.key, e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#002349] border-gray-300 rounded focus:ring-[#002349]"
              />
              <span className="text-xs text-gray-800 leading-relaxed">{item.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <label className="block text-sm font-semibold text-[#002349] mb-1.5">മറ്റുള്ളവ (വ്യക്തമാക്കുക)</label>
          <input
            type="text"
            value={formData.partC.otherFocus || ''}
            onChange={(e) => updateFormData('partC', { otherFocus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
            placeholder="മറ്റുള്ളവ എഴുതുക"
          />
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

export default AreaPageC;
