import React, { useEffect, useState } from 'react';
import { useForm } from '../../../contexts/FormContext';

const PartA = () => {
  const { formData, updateFormData } = useForm();
  const [error, setError] = useState('');

  // Auto-fill district from logged-in user data
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.district && !formData.district) {
        updateFormData('district', user.district);
      }
    }
  }, [formData.district, updateFormData]);


  const handleInputChange = (field, value) => {
    // Only allow numbers for numeric fields
    if (field === 'totalPopulation' || field === 'muslimPercentage' || 
        field === 'hinduPercentage' || field === 'christianPercentage' || 
        field === 'othersPercentage' || field === 'movementPercentage') {
      // Ensure value is a string before using replace
      const stringValue = String(value || '');
      const numericValue = stringValue.replace(/[^0-9.]/g, '');
      // Convert to number if it's not empty, otherwise keep as empty string
      const finalValue = numericValue === '' ? '' : numericValue;
      updateFormData('partA', { [field]: finalValue });
    } else {
      updateFormData('partA', { [field]: value });
    }
  };

  return (
    <div className="px-4 pb-4">
      {/* District Display (Auto-filled and disabled) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-900 mb-1">
          ജില്ല:
        </label>
        <input
          type="text"
          value={formData.district}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm cursor-not-allowed"
          disabled
          readOnly
        />
      </div>

      {/* Form Fields - Zigzag Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Field 1 */}
          <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
              1. ജനസംഖ്യ (ആകെ)
            </label>
                                     <input
              type="number"
              value={formData.partA?.totalPopulation ?? ''}
              onChange={(e) => handleInputChange('totalPopulation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px] sm:text-sm"
              placeholder="ജനസംഖ്യ നൽകുക"
            />
          </div>

        {/* Field 2 */}
          <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
              2. മുസ്‌ലിം %
            </label>
                                     <input
              type="number"
              value={formData.partA?.muslimPercentage ?? ''}
              onChange={(e) => handleInputChange('muslimPercentage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px] sm:text-sm"
              placeholder="ശതമാനം നൽകുക"
              step="0.01"
            />
          </div>

        {/* Field 3 */}
          <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
              3. ഹിന്ദു %
            </label>
                                     <input
              type="number"
              value={formData.partA?.hinduPercentage ?? ''}
              onChange={(e) => handleInputChange('hinduPercentage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px] sm:text-sm"
              placeholder="ശതമാനം നൽകുക"
              step="0.01"
            />
          </div>

        {/* Field 4 */}
          <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
              4. ക്രിസ്ത്യൻ %
            </label>
                                     <input
              type="number"
              value={formData.partA?.christianPercentage ?? ''}
              onChange={(e) => handleInputChange('christianPercentage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px] sm:text-sm"
              placeholder="ശതമാനം നൽകുക"
              step="0.01"
            />
          </div>

        {/* Field 5 */}
          <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
              5. മറ്റുള്ളവർ %
            </label>
                                     <input
              type="number"
              value={formData.partA?.othersPercentage ?? ''}
              onChange={(e) => handleInputChange('othersPercentage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px] sm:text-sm"
              placeholder="ശതമാനം നൽകുക"
              step="0.01"
            />
          </div>

        {/* Field 6 */}
        <div className="bg-gray-100 p-3 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-1">
              6. പ്രസ്ഥാനം %
            </label>
                                     <input
              type="number"
              value={formData.partA?.movementPercentage ?? ''}
              onChange={(e) => handleInputChange('movementPercentage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px] sm:text-sm bg-white"
              placeholder="ശതമാനം നൽകുക"
              step="0.01"
            />
        </div>

        {/* Field 7 */}
          <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
              7. മതസംഘടനകളിൽ ഭൂരിപക്ഷം
            </label>
            <select
              value={formData.partA?.majorityInReligiousOrganizations ?? ''}
              onChange={(e) => handleInputChange('majorityInReligiousOrganizations', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px] sm:text-sm"
            >
              <option value="">തിരഞ്ഞെടുക്കുക</option>
              <option value="സമസ്ത ഇ.കെ">സമസ്ത ഇ.കെ.</option>
              <option value="സമസ്ത എ.പി">സമസ്ത എ.പി.</option>
              <option value="മുജാഹിദ്">മുജാഹിദ്.</option>
              <option value="തബ്ലീഗ്">തബ്ലീഗ്.</option>
            </select>
          </div>

        {/* Field 8 */}
          <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
              8. രണ്ടാം സ്ഥാനം
            </label>
            <input
              type="text"
              value={formData.partA?.secondPosition ?? ''}
              onChange={(e) => handleInputChange('secondPosition', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px] sm:text-sm"
              placeholder="വിവരങ്ങൾ നൽകുക"
            />
          </div>

        {/* Field 9 */}
          <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
              9. മൂന്നാം സ്ഥാനം
            </label>
            <input
              type="text"
              value={formData.partA?.thirdPosition ?? ''}
              onChange={(e) => handleInputChange('thirdPosition', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px] sm:text-sm"
              placeholder="വിവരങ്ങൾ നൽകുക"
            />
          </div>

        {/* Field 10 */}
          <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
              10. നമ്മുടെ സ്ഥാനം
            </label>
            <input
              type="text"
              value={formData.partA?.ourPosition ?? ''}
              onChange={(e) => handleInputChange('ourPosition', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px] sm:text-sm"
              placeholder="വിവരങ്ങൾ നൽകുക"
            />
          </div>

        {/* Field 11 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">
              11. കൂടുതൽ രാഷ്ട്രീയ സ്വാധീനം
            </label>
            <select
              value={formData.partA?.morePoliticalInfluence ?? ''}
              onChange={(e) => handleInputChange('morePoliticalInfluence', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px] sm:text-sm"
            >
              <option value="">തിരഞ്ഞെടുക്കുക</option>
              <option value="മുസ്ലിം ലീഗ്">മുസ്ലിം ലീഗ്.</option>
              <option value="കോൺഗ്രസ്">കോൺഗ്രസ്.</option>
              <option value="സി.പി.എം">സി.പി.എം.</option>
              <option value="സി.പി.ഐ">സി.പി.ഐ.</option>
              <option value="വെൽഫെയർ">വെൽഫെയർ.</option>
            </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-xs">{error}</p>
        </div>
      )}
    </div>
  );
};

export default PartA;
