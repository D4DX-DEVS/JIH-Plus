import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAreaForm } from '../../../contexts/AreaFormContext';
import { validateNumericInput, handleNumericKeyDown, handleNumericPaste } from '../../../utils/validation';

const AreaPageB = () => {
  const { formData, updateFormData, nextStep, prevStep, validateCurrentStep } = useAreaForm();

  const wings = [
    { key: 'jih', label: 'JIH' },
    { key: 'vanitha', label: 'വനിത' },
    { key: 'solidarity', label: 'സോളിഡാരിറ്റി' },
    { key: 'sio', label: 'SIO' },
    { key: 'gio', label: 'GIO' }
  ];

  const handleWingAttendanceChange = (wingKey, field, value) => {
    // Only allow numbers using our validation utility
    const cleaned = validateNumericInput(value);
    const numValue = cleaned === '' ? null : parseInt(cleaned) || 0;
    
    updateFormData('partB', {
      wingAttendance: {
        ...formData.partB.wingAttendance,
        [wingKey]: {
          ...formData.partB.wingAttendance[wingKey],
          [field]: numValue
        }
      }
    });
  };

  const handleMainDecisionChange = (index, value) => {
    const newDecisions = [...(formData.partB.mainDecisions || [])];
    newDecisions[index] = value;
    updateFormData('partB', { mainDecisions: newDecisions });
  };

  const addMainDecision = () => {
    const newDecisions = [...(formData.partB.mainDecisions || []), ''];
    updateFormData('partB', { mainDecisions: newDecisions });
  };

  const removeMainDecision = (index) => {
    const newDecisions = [...(formData.partB.mainDecisions || [])];
    newDecisions.splice(index, 1);
    updateFormData('partB', { mainDecisions: newDecisions });
  };

  const handleExpansionActivityChange = (field, value) => {
    updateFormData('partC', {
      expansionActivities: {
        ...formData.partC.expansionActivities,
        [field]: value
      }
    });
  };



  return (
    <div className="p-5 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-4xl mx-auto hover:shadow-xl transition-all duration-500">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[#002349] mb-1.5">
          ഏരിയ തലം റിപ്പോർട്ട് - PART B
        </h2>
        <p className="text-sm text-gray-600">
          Expansion മായി ബന്ധപെട്ട് നടന്ന പ്രവർത്തനങ്ങൾ
        </p>
      </div>

      {/* Monthly Meeting */}
      <div className="mb-5">
        <h3 className="text-base font-bold text-[#002349] mb-3">
          1. പ്രതിമാസയോഗം - നടന്നു / ഇല്ല (Yes / No)
        </h3>
        <div className="flex space-x-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="monthlyMeeting"
              value="Yes"
              checked={formData.partB.monthlyMeeting === 'Yes'}
              onChange={(e) => updateFormData('partB', { monthlyMeeting: e.target.value })}
              className="mr-2 w-4 h-4 text-[#002349]"
            />
            <span className="text-sm font-medium">Yes</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="monthlyMeeting"
              value="No"
              checked={formData.partB.monthlyMeeting === 'No'}
              onChange={(e) => updateFormData('partB', { monthlyMeeting: e.target.value })}
              className="mr-2 w-4 h-4 text-[#002349]"
            />
            <span className="text-sm font-medium">No</span>
          </label>
        </div>
        {formData.partB.monthlyMeeting === 'No' && (
          <div className="mt-3">
            <label className="block text-sm font-semibold text-[#002349] mb-1.5">
              നടന്നിട്ടില്ലെങ്കില്‍ കാരണം
            </label>
            <input
              type="text"
              value={formData.partB.monthlyMeetingReason || ''}
              onChange={(e) => updateFormData('partB', { monthlyMeetingReason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-sm transition-all duration-300 hover:border-[#002349]/50"
              placeholder="കാരണം വ്യക്തമാക്കുക"
            />
          </div>
        )}
      </div>

      {/* Wing Attendance Table */}
      <div className="mb-5">
        <h3 className="text-base font-bold text-[#002349] mb-3">
          2. പ്രതിമാസയോഗ ഹാജർ
        </h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full border-collapse min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-700">വിംഗ്</th>
                <th className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700">ഹാജർ</th>
                <th className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700">ലീവ്</th>
                <th className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700">ആബ്‌സന്റ്</th>
              </tr>
            </thead>
            <tbody>
              {wings.map(wing => (
                <tr key={wing.key} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="border border-gray-200 px-3 py-2 text-sm font-semibold text-[#002349]">{wing.label}</td>
                  <td className="border border-gray-200 px-3 py-2">
                    <input
                      type="text"
                      value={formData.partB.wingAttendance[wing.key]?.present !== null && formData.partB.wingAttendance[wing.key]?.present !== undefined ? formData.partB.wingAttendance[wing.key].present : ''}
                      onChange={(e) => handleWingAttendanceChange(wing.key, 'present', e.target.value)}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={(e) => handleNumericPaste(e, (value) => handleWingAttendanceChange(wing.key, 'present', value))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-xl text-center text-sm focus:ring-1 focus:ring-[#002349] focus:border-transparent transition-all duration-300"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-200 px-3 py-2">
                    <input
                      type="text"
                      value={formData.partB.wingAttendance[wing.key]?.leave !== null && formData.partB.wingAttendance[wing.key]?.leave !== undefined ? formData.partB.wingAttendance[wing.key].leave : ''}
                      onChange={(e) => handleWingAttendanceChange(wing.key, 'leave', e.target.value)}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={(e) => handleNumericPaste(e, (value) => handleWingAttendanceChange(wing.key, 'leave', value))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-xl text-center text-sm focus:ring-1 focus:ring-[#002349] focus:border-transparent transition-all duration-300"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-200 px-3 py-2">
                    <input
                      type="text"
                      value={formData.partB.wingAttendance[wing.key]?.absent !== null && formData.partB.wingAttendance[wing.key]?.absent !== undefined ? formData.partB.wingAttendance[wing.key].absent : ''}
                      onChange={(e) => handleWingAttendanceChange(wing.key, 'absent', e.target.value)}
                      onKeyDown={handleNumericKeyDown}
                      onPaste={(e) => handleNumericPaste(e, (value) => handleWingAttendanceChange(wing.key, 'absent', value))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-xl text-center text-sm focus:ring-1 focus:ring-[#002349] focus:border-transparent transition-all duration-300"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-600 mt-1.5">ഒരോ വിംഗും ഹാജര്‍/ലീവ്/ആബ്‌സന്റ് എന്നറിയണം</p>
      </div>

      {/* Main Decisions */}
      <div className="mb-5">
        <h3 className="text-base font-bold text-[#002349] mb-3">
          3. പ്രധാന തീരുമാനങ്ങൾ
        </h3>
        <div className="space-y-2">
          {(formData.partB.mainDecisions || []).map((decision, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-sm font-bold text-[#957C3D]">{index + 1}.</span>
              <input
                type="text"
                value={decision}
                onChange={(e) => handleMainDecisionChange(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-sm transition-all duration-300 hover:border-[#002349]/50"
                placeholder="തീരുമാനം നൽകുക"
              />
              <button
                type="button"
                onClick={() => removeMainDecision(index)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300"
              >
                ഇല്ലാതാക്കുക
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addMainDecision}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300"
          >
            + തീരുമാനം ചേർക്കുക
          </button>
        </div>
      </div>

      {/* Removed Focus Areas from Part B to avoid duplication. Part C page handles it. */}

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={prevStep}
          className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded-2xl text-sm font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>മുൻപത്തെ</span>
        </button>
        <button
          onClick={nextStep}
          disabled={!validateCurrentStep()}
          className="bg-[#002349] hover:bg-[#1a3a5c] text-white px-5 py-2 rounded-2xl text-sm font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out disabled:bg-gray-400 disabled:transform-none disabled:hover:translate-y-0 disabled:hover:scale-100"
        >
          <span>അടുത്തത്</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AreaPageB;
