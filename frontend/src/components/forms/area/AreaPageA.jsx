import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAreaForm } from '../../../contexts/AreaFormContext';
import { validateNumericInput, handleNumericKeyDown, handleNumericPaste } from '../../../utils/validation';

const AreaPageA = () => {
  const { formData, updateFormData, nextStep, validateCurrentStep } = useAreaForm();
  const [error, setError] = useState('');

  // Auto-fill district and area from logged-in user data
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      console.log('User data for auto-fill:', user);
      
      // Get district name - try to get actual name, not ID
      let districtName = user.district || user.districtName || '';
      
      // Get area name - try to get actual name, not ID
      let areaName = user.area || user.areaName || '';
      
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
                }
              }
            } catch (e) {
              console.log('Could not fetch district name:', e);
            }
          }
          
          // Fetch area name if we only have ID
          if (user.areaId && !areaName && user.districtId) {
            try {
              console.log('Fetching area name for ID:', user.areaId);
              const areasResp = await fetch(`${import.meta.env.VITE_API_URL}/api/user/hierarchy/areas/${encodeURIComponent(user.districtId)}`, { headers });
              const areasData = await areasResp.json();
              console.log('Areas response:', areasData);
              if (areasData.success && areasData.data) {
                const area = areasData.data.find(a => (a.id || a._id) === user.areaId);
                if (area) {
                  areaName = area.title || area.name || areaName;
                  console.log('Found area name:', areaName);
                }
              }
            } catch (e) {
              console.log('Could not fetch area name:', e);
            }
          }
          
          // Update form data with the names (only if we have actual names, not IDs)
          if (districtName && districtName !== user.districtId && !formData.district) {
            console.log('Setting district name:', districtName);
            updateFormData('district', districtName);
          }
          if (areaName && areaName !== user.areaId && !formData.area) {
            console.log('Setting area name:', areaName);
            updateFormData('area', areaName);
          }
        } catch (error) {
          console.error('Error fetching names:', error);
        }
      };
      
      // Always try to fetch names if we have IDs
      if (user.districtId || user.areaId) {
        fetchNames();
      }
    }
  }, [updateFormData]);

  const handleInputChange = (field, value) => {
    // Only allow numbers for numeric fields
    if (field === 'kh' || field === 'vkh') {
      // Ensure value is a string before using replace
      const stringValue = String(value || '');
      const numericValue = stringValue.replace(/[^0-9]/g, '');
      // Convert to number if it's not empty, otherwise keep as empty string
      const finalValue = numericValue === '' ? '' : numericValue;
      updateFormData('partA', { [field]: finalValue });
    } else {
      updateFormData('partA', { [field]: value });
    }
  };

  const handleNext = () => {
    setError('');
    if (validateCurrentStep()) {
      nextStep();
    } else {
      setError('Please fill in all required fields before proceeding.');
    }
  };

  return (
    <div className="p-5 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-4xl mx-auto hover:shadow-xl transition-all duration-500">
      {/* Header */}
      <div className="hidden lg:block mb-5">
        <h2 className="text-xl font-bold text-[#002349] mb-1.5">
          ഏരിയ തലം റിപ്പോർട്ട് - PART A
        </h2>
        <p className="text-sm text-gray-600">
          ഏരിയ തലത്തിൽ പൊതു വിവരങ്ങൾ നൽകുക
        </p>
      </div>

      {/* District and Area Display (Auto-filled and disabled) */}
      <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#002349] mb-1.5">
            ജില്ല:
          </label>
          <input
            type="text"
            value={formData.district}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm cursor-not-allowed font-medium"
            disabled
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#002349] mb-1.5">
            ഏരിയ:
          </label>
          <input
            type="text"
            value={formData.area}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm cursor-not-allowed font-medium"
            disabled
            readOnly
          />
        </div>
      </div>

      {/* Report Period */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#002349] mb-1.5">
          1. റിപ്പോർട്ട് കാലയളവ്:
        </label>
        <select
          value={formData.month}
          onChange={(e) => updateFormData('month', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
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

      {/* Form Fields */}
      <div className="mb-5">
        <h3 className="text-base font-bold text-[#002349] mb-4">
          2. ആകെ ഘടകങ്ങൾ
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#002349] mb-1.5">
              KH
            </label>
            <input
              type="text"
              value={formData.partA.kh !== null && formData.partA.kh !== undefined ? formData.partA.kh : ''}
              onChange={(e) => {
                const cleaned = validateNumericInput(e.target.value);
                handleInputChange('kh', cleaned);
              }}
              onKeyDown={handleNumericKeyDown}
              onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('kh', value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#002349] mb-1.5">
              VKH
            </label>
            <input
              type="text"
              value={formData.partA.vkh !== null && formData.partA.vkh !== undefined ? formData.partA.vkh : ''}
              onChange={(e) => {
                const cleaned = validateNumericInput(e.target.value);
                handleInputChange('vkh', cleaned);
              }}
              onKeyDown={handleNumericKeyDown}
              onPaste={(e) => handleNumericPaste(e, (value) => handleInputChange('vkh', value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent text-[16px] sm:text-sm transition-all duration-300 hover:border-[#002349]/50"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-xs font-semibold">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleNext}
          disabled={!validateCurrentStep()}
          className="bg-[#002349] hover:bg-[#1a3a5c] text-white px-6 py-2 rounded-2xl text-sm font-semibold flex items-center space-x-2 transition-all duration-500 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out disabled:bg-gray-400 disabled:transform-none disabled:hover:translate-y-0 disabled:hover:scale-100"
        >
          <span>അടുത്തത്</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AreaPageA;
