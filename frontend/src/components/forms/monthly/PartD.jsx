import React from 'react';
 import { useForm } from '../../../contexts/FormContext';

// CSS to remove number input spinners
const numberInputStyles = {
  WebkitAppearance: 'none',
  MozAppearance: 'textfield',
  appearance: 'none'
};

const PartD = () => {
  const { formData, updateFormData } = useForm();

  const handleChange = (field, value) => {
    // Only allow numbers
    const stringValue = String(value || '');
    const numericValue = stringValue.replace(/[^0-9]/g, '');
    const numValue = numericValue === '' ? null : parseInt(numericValue) || 0;
    updateFormData('partD', { [field]: numValue });
  };

  const handleAreasChange = (field, value) => {
    // Only allow numbers
    const stringValue = String(value || '');
    const numericValue = stringValue.replace(/[^0-9]/g, '');
    const numValue = numericValue === '' ? null : parseInt(numericValue) || 0;
    updateFormData('partD', {
      areas: {
        ...formData.partD.areas,
        [field]: numValue
      }
    });
  };

  const handleSystemChange = (systemKey, field, value) => {
    // Only allow numbers
    const stringValue = String(value || '');
    const numericValue = stringValue.replace(/[^0-9]/g, '');
    const numValue = numericValue === '' ? null : parseInt(numericValue) || 0;
    updateFormData('partD', {
      [systemKey]: {
        ...formData.partD[systemKey],
        [field]: numValue
      }
    });
  };



  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Part D - Public Systems Table */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">ഭാഗം-ഡി (പൊതുസംവിധാനങ്ങൾ)</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">വിവരങ്ങൾ</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium">എണ്ണം</th>
              </tr>
            </thead>
            <tbody>
              {/* Interest Free Systems */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">1. പലിശരഹിത സംവിധാനം (എണ്ണം)</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.interestFreeSystems?.count ?? ''}
                    onChange={(e) => handleSystemChange('interestFreeSystems', 'count', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">കഴിഞ്ഞ മൂന്ന് വർഷത്തിനിടയിൽ സഹായം സ്വീകരിച്ച മറ്റുള്ളവരുടെ എണ്ണം</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.interestFreeSystems?.beneficiariesLast3Years ?? ''}
                    onChange={(e) => handleSystemChange('interestFreeSystems', 'beneficiariesLast3Years', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Zakat Committee */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">2. സകാത്ത് കമ്മറ്റി (എണ്ണം)</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.zakatCommittee?.count ?? ''}
                    onChange={(e) => handleSystemChange('zakatCommittee', 'count', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">കഴിഞ്ഞ മൂന്ന് വർഷത്തിനിടയിൽ സഹായം സ്വീകരിച്ച മറ്റുള്ളവരുടെ എണ്ണം</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.zakatCommittee?.beneficiariesLast3Years ?? ''}
                    onChange={(e) => handleSystemChange('zakatCommittee', 'beneficiariesLast3Years', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Peoples Foundation Beneficiaries */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">3. പീപ്പിൾസ് ഫൗണ്ടേഷനിൽ നിന്നും കഴിഞ്ഞ 3 വർഷത്തിനിടെ വ്യക്തിപരമായി സഹായം സ്വീകരിച്ച മറ്റുള്ളവർ</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.peoplesFoundationBeneficiaries ?? ''}
                    onChange={(e) => handleChange('peoplesFoundationBeneficiaries', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Housing Project Beneficiaries */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">4. ഹൗസിംഗ് പ്രൊജക്‌ടുകൾ, കുടിവെള്ളപദ്ധതികൾ തുടങ്ങിയ നമ്മുടെ സേവന പ്രൊജക്ടുകളുടെ (പ്രാദേശികവും അല്ലാത്തതുമായ) കഴിഞ്ഞ 3 വർഷത്തിനിടെ ഗുണഭോക്താക്കളായ മറ്റുള്ളവർ</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.housingProjectBeneficiaries ?? ''}
                    onChange={(e) => handleChange('housingProjectBeneficiaries', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Baytul Zakat Beneficiaries */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">5. ബൈത്തുസ്സകാത്തിൽ നിന്നും കഴിഞ്ഞ 3 വർഷത്തിനിടെ വ്യക്തിപരമായി സഹായം സ്വീകരിച്ച മറ്റുള്ളവർ</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.baytulZakatBeneficiaries ?? ''}
                    onChange={(e) => handleChange('baytulZakatBeneficiaries', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Non Workers in Madhyamam Readers */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">6. മാധ്യമം വായനക്കാരിൽ പ്രവർത്തകരല്ലാത്തവർ *.</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.nonWorkersinMadhyamamReaders ?? ''}
                    onChange={(e) => handleChange('nonWorkersinMadhyamamReaders', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Non Workers in Prabodhanam Readers */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">7. പ്രബോധനം വായനക്കാരിൽ പ്രവർത്തകരല്ലാത്തവർ *.</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.nonWorkersinPrabodhanamReaders ?? ''}
                    onChange={(e) => handleChange('nonWorkersinPrabodhanamReaders', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Non Workers in Aaramam Readers */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">8. ആരാമം വായനക്കാരിൽ പ്രവർത്തകരല്ലാത്തവർ *.</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.nonWorkersinAaramamReaders ?? ''}
                    onChange={(e) => handleChange('nonWorkersinAaramamReaders', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Non Workers in Ayah Users */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">9. ആയാത്ത് ദർസെ ഖുർആൻ സ്ഥിരമായി ഉപയോഗപ്പെടുത്തുന്ന പ്രവർത്തകരല്ലാത്തവർ *.</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.nonWorkersinAyahUsers ?? ''}
                    onChange={(e) => handleChange('nonWorkersinAyahUsers', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Areas */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">10. നമ്മുടെ മഹല്ലുകൾ (പൂർണം/ഭാഗികം)</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.areas?.ourAreas ?? ''}
                    onChange={(e) => handleAreasChange('ourAreas', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">ഇതിൽ രജിസ്റ്റർ ചെയ്‌ത നമ്മുടെതല്ലാത്ത കുടുംബങ്ങൾ</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.areas?.registeredNonOurFamilies ?? ''}
                    onChange={(e) => handleAreasChange('registeredNonOurFamilies', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Influential Mahalls */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">11. നമുക്ക് സ്വാധീനമുള്ള (കമ്മറ്റി പ്രാതിനിധ്യം) മറ്റു പൊതു മഹല്ലുകൾ (എണ്ണം).</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.influentialMahalls ?? ''}
                    onChange={(e) => handleChange('influentialMahalls', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Khutba Listeners from Organized Areas */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">12. നമ്മുടെ ഖുതുബ ശ്രവിക്കാൻ വരുന്ന മറ്റുള്ളവരിൽ പ്രസ്ഥാനഘടനയിൽ ഉള്ള സ്ഥലത്തുനിന്നും വരുന്നവർ (എണ്ണം)</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.khutbaListenersfromOrganizedAreas ?? ''}
                    onChange={(e) => handleChange('khutbaListenersfromOrganizedAreas', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Khutba Listeners from Non-Organized Areas */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">13. നമ്മുടെ ഖുതുബ ശ്രവിക്കാൻ വരുന്ന മറ്റുള്ളവരിൽ പ്രസ്ഥാന ഘടന ഇല്ലാത്ത സ്ഥലത്തുനിന്നും വരുന്നവർ (എണ്ണം)</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.khutbaListenersfromNonOrganizedAreas ?? ''}
                    onChange={(e) => handleChange('khutbaListenersfromNonOrganizedAreas', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Full Time Workers */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">14. ഫുൾടൈം പ്രവർത്തകരുണ്ടെങ്കിൽ (എണ്ണം)</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.FullTimeWorkers ?? ''}
                    onChange={(e) => handleChange('FullTimeWorkers', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>

              {/* Part Time Workers */}
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">15. പാർട് ടൈം പ്രവർത്തകരുണ്ടെങ്കിൽ (എണ്ണം)</td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={formData.partD?.PartTimeWorkers ?? ''}
                    onChange={(e) => handleChange('PartTimeWorkers', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm min-w-[120px]"
                    style={numberInputStyles}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>



      {/* Additional Information */}
      <div className="mt-8">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>കുറിപ്പ്:</strong> * ചിഹ്നമുള്ള വിവരങ്ങൾ ഏകദേശമായി നൽകുക. 
            ഇത് പൊതുസംവിധാനങ്ങളുടെ പ്രവർത്തനങ്ങൾ വിലയിരുത്താൻ സഹായിക്കും.
          </p>
        </div>
      </div>

    </div>
  );
};

export default PartD;
