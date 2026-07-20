import React from 'react';
import { useForm } from '../../../contexts/FormContext';

const PartC = () => {
  const { formData, updateFormData } = useForm();

  const handleChange = (field, subField, value) => {
    // Only allow numbers for numeric fields
    if (subField === 'count' || subField === 'cooperatingOthers') {
      const stringValue = String(value || '');
      const numericValue = stringValue.replace(/[^0-9]/g, '');
      const numValue = numericValue === '' ? null : parseInt(numericValue) || 0;
      updateFormData('partC', {
        [field]: {
          ...formData.partC[field],
          [subField]: numValue
        }
      });
    } else {
      updateFormData('partC', {
        [field]: {
          ...formData.partC[field],
          [subField]: value
        }
      });
    }
  };

  const platforms = [
    {
      key: 'friendshipPlatforms',
      label: 'സൗഹൃദ വേദികൾ',
      englishLabel: 'Friendship Forums'
    },
    {
      key: 'fridayClub',
      label: 'Friday Club/ Friends Forum',
      englishLabel: 'Friday Club/ Friends Forum'
    },
    {
      key: 'wings',
      label: 'Wings',
      englishLabel: 'Wings'
    },
    {
      key: 'neighborhoodGroups',
      label: 'അയൽക്കൂട്ടങ്ങൾ',
      englishLabel: 'Neighborhood Groups'
    },
    {
      key: 'otherNGOs',
      label: 'മറ്റു NGO കൾ',
      englishLabel: 'Other NGOs'
    },
    {
      key: 'palliative',
      label: 'പാലിയേറ്റീവ്',
      englishLabel: 'Palliative'
    },
    {
      key: 'otherActivities',
      label: 'മറ്റ് പ്രവർത്തനങ്ങൾ',
      englishLabel: 'Other Activities'
    }
  ];

  return (
    <div className="p-4">
      {/* Platforms Table */}
      <div className="mb-4">
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">വിവരങ്ങൾ</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium">എണ്ണം</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium">സഹകരിക്കുന്ന മറ്റുള്ളവർ (എണ്ണം)</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((platform, index) => (
                <tr key={platform.key}>
                  <td className="border border-gray-300 px-3 py-2 font-medium">
                    {index + 1}. {platform.label}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    <input
                      type="number"
                      value={formData.partC?.[platform.key]?.count ?? ''}
                      onChange={(e) => handleChange(platform.key, 'count', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-center"
                      placeholder="എണ്ണം"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    <input
                      type="number"
                      value={formData.partC?.[platform.key]?.cooperatingOthers ?? ''}
                      onChange={(e) => handleChange(platform.key, 'cooperatingOthers', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-center"
                      placeholder="എണ്ണം"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    <input
                      type="text"
                      value={formData.partC?.[platform.key]?.remarks ?? ''}
                      onChange={(e) => handleChange(platform.key, 'remarks', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="അഭിപ്രായങ്ങൾ"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Information */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">കൂടുതൽ വിവരങ്ങൾ</h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>സൂചന:</strong> ഓരോ പ്ലാറ്റ്ഫോമിനും എണ്ണം, സഹകരിക്കുന്ന മറ്റുള്ളവരുടെ എണ്ണം, 
            അഭിപ്രായങ്ങൾ എന്നിവ നൽകുക. ഇത് പൊതുവേദികളുടെ പ്രവർത്തനങ്ങൾ വിലയിരുത്താൻ സഹായിക്കും.
          </p>
        </div>
      </div>

    </div>
  );
};

export default PartC;
