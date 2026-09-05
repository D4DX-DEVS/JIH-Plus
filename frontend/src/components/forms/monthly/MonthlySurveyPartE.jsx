import React, { useState } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useForm } from '../../../contexts/FormContext';
import axios from 'axios';

const MonthlySurveyPartE = ({ onSubmit, editingSurvey, isAdmin = false }) => {
  const { formData, updateFormData, prevStep, validateCurrentStep } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleChange = (field, value) => {
    updateFormData('partE', { [field]: value });
  };

  const handleMonthChange = (value) => {
    updateFormData('month', value);
  };

  const handleNestedChange = (section, field, value) => {
    if (field === 'count') {
      const stringValue = String(value || '');
      const numericValue = stringValue.replace(/[^0-9]/g, '');
      const numValue = numericValue === '' ? null : parseInt(numericValue) || 0;
      updateFormData('partE', {
        [section]: {
          ...formData.partE[section],
          [field]: numValue
        }
      });
    } else {
      updateFormData('partE', {
        [section]: {
          ...formData.partE[section],
          [field]: value
        }
      });
    }
  };

  const handleComponentsChange = (orgKey, value) => {
    const stringValue = String(value || '');
    const numericValue = stringValue.replace(/[^0-9]/g, '');
    const numValue = numericValue === '' ? null : parseInt(numericValue) || 0;
    updateFormData('partE', {
      componentsToFormIn6Months: {
        ...formData.partE.componentsToFormIn6Months,
        [orgKey]: numValue
      }
    });
  };

  const handleSubmit = async () => {
    if (!formData.month) {
      setError('മാസം തിരഞ്ഞെടുക്കുക');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = isAdmin ? localStorage.getItem('adminToken') : localStorage.getItem('userToken');
      const endpoint = isAdmin ? '/api/admin/monthly-surveys' : '/api/user/monthly-survey';
      
      let response;
      if (editingSurvey && editingSurvey._id) {
        response = await axios.put(`${import.meta.env.VITE_API_URL}${endpoint}/${editingSurvey._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        response = await axios.post(`${import.meta.env.VITE_API_URL}${endpoint}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      onSubmit(response.data);
    } catch (error) {
      console.error('Monthly report submission error:', error);
      setError(error.response?.data?.message || 'Monthly report submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };  return (
    <div className="p-4 sm:p-8">
      {/* Header: hidden on mobile, the parent step header (MonthlySurveyPage) already names this screen there. */}
      <div className="hidden lg:block mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          PART-E (അധിക വിവരങ്ങൾ) - പ്രതിമാസ  റിപ്പോർട്ട്
        </h2>
        <p className="text-gray-600">
          അധിക വിവരങ്ങളും മാസം തിരഞ്ഞെടുക്കുക
        </p>
      </div>

      {/* Month Selection - Required for Monthly Survey */}
      <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-6">
        <label className="block text-lg font-medium text-green-900 mb-3">
          മാസം തിരഞ്ഞെടുക്കുക (ആവശ്യമാണ്):
        </label>
        <select
          value={formData.month || ''}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-[16px] sm:text-base"
          required
        >
          <option value="">മാസം തിരഞ്ഞെടുക്കുക...</option>
          {months.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </div>

      {/* Question 1 */}
      <div className="mb-8">
        <label className="block text-lg font-medium text-gray-900 mb-3">
          1. നമ്മുടെ സാന്നിദ്ധ്യമില്ലാത്ത മുസ്‌ലിം ഭൂരിപക്ഷ പ്രദേശങ്ങൾ:
        </label>
        <div className="space-y-4">
          <textarea
            value={formData.partE.areasWithoutPresence.description}
            onChange={(e) => handleNestedChange('areasWithoutPresence', 'description', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-[16px] sm:text-base"
            rows="3"
            placeholder="പ്രദേശങ്ങളുടെ വിവരങ്ങൾ നൽകുക..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">തരം:</label>
            <select
              value={formData.partE.areasWithoutPresence.type}
              onChange={(e) => handleNestedChange('areasWithoutPresence', 'type', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-[16px] sm:text-base"
            >
              <option value="urban">അർബൻ</option>
              <option value="rural">റൂറൽ</option>
              <option value="hilly">മലയോരം</option>
              <option value="coastal">തീരദേശം</option>
            </select>
          </div>
        </div>
      </div>

      {/* Question 2 */}
      <div className="mb-8">
        <label className="block text-lg font-medium text-gray-900 mb-3">
          2. നമ്മുടെ സാന്നിദ്ധ്യമില്ലാത്ത പഞ്ചായത്തുകൾ/ മുനിസിപ്പാലിറ്റികൾ:
        </label>
        <textarea
          value={formData.partE.panchayatsWithoutPresence}
          onChange={(e) => handleChange('panchayatsWithoutPresence', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-[16px] sm:text-base"
          rows="3"
          placeholder="പഞ്ചായത്തുകൾ/ മുനിസിപ്പാലിറ്റികളുടെ പേരുകൾ നൽകുക..."
        />
      </div>

      {/* Question 3 */}
      <div className="mb-8">
        <label className="block text-lg font-medium text-gray-900 mb-3">
          3. കഴിഞ്ഞ 5 വർഷത്തിനിടയിൽ പുതുതായി ഉണ്ടായ ഘടകങ്ങളുടെ എണ്ണം:
        </label>
        <div className="space-y-4">
          <input
            type="number"
            value={formData.partE.newComponentsLast5Years.count !== null && formData.partE.newComponentsLast5Years.count !== undefined ? formData.partE.newComponentsLast5Years.count : ''}
            onChange={(e) => handleNestedChange('newComponentsLast5Years', 'count', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-[16px] sm:text-base"
            placeholder="എണ്ണം"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">തരം:</label>
            <select
              value={formData.partE.newComponentsLast5Years.type}
              onChange={(e) => handleNestedChange('newComponentsLast5Years', 'type', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-[16px] sm:text-base"
            >
              <option value="urban">അർബൻ</option>
              <option value="rural">റൂറൽ</option>
              <option value="hilly">മലയോരം</option>
              <option value="coastal">തീരദേശം</option>
            </select>
          </div>
          <textarea
            value={formData.partE.newComponentsLast5Years.details}
            onChange={(e) => handleNestedChange('newComponentsLast5Years', 'details', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-[16px] sm:text-base"
            rows="3"
            placeholder="വിശദ വിവരങ്ങൾ..."
          />
        </div>
      </div>

      {/* Question 4 */}
      <div className="mb-8">
        <label className="block text-lg font-medium text-gray-900 mb-3">
          4. കഴിഞ്ഞ 5 വർഷത്തിനിടയിൽ പ്രവർത്തകരുടെ വർധനവ്:
        </label>
        <div className="space-y-4">
          <input
            type="number"
            value={formData.partE.workersGrowthInLast5Years.count !== null && formData.partE.workersGrowthInLast5Years.count !== undefined ? formData.partE.workersGrowthInLast5Years.count : ''}
            onChange={(e) => handleNestedChange('workersGrowthInLast5Years', 'count', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-[16px] sm:text-base"
            placeholder="വർധനവ് എണ്ണം"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">വർധനവിന്റെ തരം:</label>
            <select
              value={formData.partE.workersGrowthInLast5Years.type}
              onChange={(e) => handleNestedChange('workersGrowthInLast5Years', 'type', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-[16px] sm:text-base"
            >
              <option value="personalConnections">വ്യക്തിബന്ധം</option>
              <option value="traditional">പരമ്പരാഗതം</option>
              <option value="institutionalStudents">സ്ഥാപനത്തിൽ പഠിച്ചവർ</option>
              <option value="lectureAttendees">പ്രഭാഷണം കേട്ടവർ</option>
              <option value="classes">ക്ലാസുകൾ</option>
              <option value="khutbas">ഖുതുബകൾ</option>
              <option value="gulfConnections">ഗൾഫ് ബന്ധം</option>
              <option value="selfReading">സ്വന്തം വായന</option>
              <option value="other">മറ്റ്</option>
            </select>
          </div>
        </div>
      </div>

      {/* Question 5 */}
      <div className="mb-8">
        <label className="block text-lg font-medium text-gray-900 mb-3">
          5. 6 മാസത്തിനുള്ളിൽ രൂപീകരിക്കാൻ സാധിക്കുന്ന ഘടകങ്ങൾ:
        </label>
        <div className="overflow-x-auto">
          <table className="ih-table-compact w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-center font-medium">JIH</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-medium">വനിത</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-medium">Solidarity</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-medium">SIO</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-medium">GIO</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-medium">ടീൻ ഇന്ത്യ</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-medium">മലർവാടി</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {['jih', 'vanitha', 'solidarity', 'sio', 'gio', 'teenIndia', 'malarvadi'].map((org) => (
                  <td key={org} className="border border-gray-300 px-4 py-3">
                    <input
                      type="number"
                      value={formData.partE.componentsToFormIn6Months[org] !== null && formData.partE.componentsToFormIn6Months[org] !== undefined ? formData.partE.componentsToFormIn6Months[org] : ''}
                      onChange={(e) => handleComponentsChange(org, e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-center text-[16px] sm:text-base"
                      placeholder="0"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-12 flex flex-wrap gap-3 justify-between">
        <button
          onClick={prevStep}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 sm:px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>മുൻപത്തെ</span>
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.month}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 sm:px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>സമർപ്പിക്കുന്നു...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>{editingSurvey && editingSurvey._id ? 'റിപ്പോർട്ട് അപ്ഡേറ്റ് ചെയ്യുക' : 'പ്രതിമാസ  റിപ്പോർട്ട് സമർപ്പിക്കുക'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MonthlySurveyPartE;