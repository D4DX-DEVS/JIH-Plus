import React from 'react';
import { ArrowLeft, Download, Edit } from 'lucide-react';
import { downloadMonthlyDetailPDF } from '../../../utils/monthlyPdfGenerator';

const UnitSurveyView = ({ survey, onBack, onEdit }) => {
  const handleDownloadPDF = async () => {
    try {
      await downloadMonthlyDetailPDF(survey);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  // Debug: Log the survey data to see what's actually stored
  console.log('UnitSurveyView - survey data:', survey);
  console.log('UnitSurveyView - partA.authorityPersonsCounts:', survey.partA?.authorityPersonsCounts);
  console.log('UnitSurveyView - partB.memberCategoriesCounts:', survey.partB?.memberCategoriesCounts);

  const authorityPersonsOptions = [
    { key: 'vyakthibandham', label: 'വ്യക്തിബന്ധം' },
    { key: 'sahitiyabandham', label: 'സാഹിത്യബന്ധം' },
    { key: 'qscStudent', label: 'QSC പഠിതാവ്' },
    { key: 'regularKhutbaListener', label: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാള്‍' },
    { key: 'prabodhanamReader', label: 'പ്രബോധനം വായനക്കാരന്‍' },
    { key: 'pfBeneficiary', label: 'PF ഗുണഭോക്താവ്' },
    { key: 'bzBeneficiary', label: 'BZ ഗുണഭോക്താവ്' },
    { key: 'regionalReliefBeneficiary', label: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്' },
    { key: 'aaramamReader', label: 'ആരാമം വായനക്കാരി' },
    { key: 'tamheedulManhabStudent', label: 'തംഹീദുല്‍ മർഅ പഠിതാവ്' },
    { key: 'institutionAlumni', label: 'മദ്റസ പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി' },
    { key: 'islamicCollegeAlumni', label: 'ഇസ്്‌ലാമിയ കോളജ് പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി' },
    { key: 'neighborhoodGroupMember', label: 'അയൽകൂട്ടം അംഗം' },
    { key: 'palliativeConnection', label: 'പാലിയേറ്റീവ് ബന്ധം' },
    { key: 'friendsClubMember', label: 'Friends Club അംഗം' },
    { key: 'mediaReader', label: 'മാധ്യമം വായനക്കാരന്‍' },
    { key: 'ayathulDursalQuranStudent', label: 'ആയാത് ദർസെ ഖുര്‍ആന്‍ പഠിതാവ്' },
    { key: 'heavensGuardian', label: 'ഹെവൻസിലെ രക്ഷിതാവ്' },
    { key: 'schoolGuardian', label: 'സ്‌കൂളിലെ രക്ഷിതാവ്' },
    { key: 'arabicCollegeGuardian', label: 'അറബികോളജ് രക്ഷിതാവ്' },
    { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാര്‍ത്ഥി' },
    { key: 'artsCollegeStudent', label: 'ആർട്‌സ് കോളജ് വിദ്യാര്‍ത്ഥി' },
    { key: 'artsCollegeGuardian', label: 'ആർട്‌സ് കോളജ് രക്ഷിതാവ്' },
    { key: 'publicCampusStudent', label: 'പൊതു കാമ്പസിലെ വിദ്യാര്‍ത്ഥി' },
    { key: 'otherNGOs', label: 'മറ്റു NGO കള്‍' },
    { key: 'mahalluConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
    { key: 'fullTimeWorkerConnection', label: 'ഫുള്‍െൈടം പ്രവർത്തകനുമായുള്ള ബന്ധം' }
  ];

  const memberCategories = [
    { key: 'vyakthibandham', label: 'വ്യക്തിബന്ധം' },
    { key: 'sahitiyabandham', label: 'സാഹിത്യബന്ധം' },
    { key: 'qscStudent', label: 'QSC പഠിതാവ്' },
    { key: 'regularKhutbaListener', label: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാള്‍' },
    { key: 'prabodhanamReader', label: 'പ്രബോധനം വായനക്കാരന്‍' },
    { key: 'pfBeneficiary', label: 'PF ഗുണഭോക്താവ്' },
    { key: 'bzBeneficiary', label: 'BZ ഗുണഭോക്താവ്' },
    { key: 'regionalReliefBeneficiary', label: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്' },
    { key: 'aaramamReader', label: 'ആരാമം വായനക്കാരി' },
    { key: 'tamheedulManhabStudent', label: 'തംഹീദുല്‍ മർഅ പഠിതാവ്' },
    { key: 'institutionAlumni', label: 'മദ്റസ പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി' },
    { key: 'islamicCollegeAlumni', label: 'ഇസ്്‌ലാമിയ കോളജ് പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി' },
    { key: 'neighborhoodGroupMember', label: 'അയൽകൂട്ടം അംഗം' },
    { key: 'palliativeConnection', label: 'പാലിയേറ്റീവ് ബന്ധം' },
    { key: 'friendsClubMember', label: 'Friends Club അംഗം' },
    { key: 'mediaReader', label: 'മാധ്യമം വായനക്കാരന്‍' },
    { key: 'ayathulDursalQuranStudent', label: 'ആയാത് ദർസെ ഖുര്‍ആന്‍ പഠിതാവ്' },
    { key: 'heavensGuardian', label: 'ഹെവൻസിലെ രക്ഷിതാവ്' },
    { key: 'schoolGuardian', label: 'സ്‌കൂളിലെ രക്ഷിതാവ്' },
    { key: 'arabicCollegeGuardian', label: 'അറബികോളജ് രക്ഷിതാവ്' },
    { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാര്‍ത്ഥി' },
    { key: 'artsCollegeStudent', label: 'ആർട്‌സ് കോളജ് വിദ്യാര്‍ത്ഥി' },
    { key: 'artsCollegeGuardian', label: 'ആർട്‌സ് കോളജ് രക്ഷിതാവ്' },
    { key: 'publicCampusStudent', label: 'പൊതു കാമ്പസിലെ വിദ്യാര്‍ത്ഥി' },
    { key: 'otherNGOs', label: 'മറ്റു NGO കള്‍' },
    { key: 'mahalluConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
    { key: 'fullTimeWorkerConnection', label: 'ഫുള്‍െൈടം പ്രവർത്തകനുമായുള്ള ബന്ധം' }
  ];

  const growthWings = [
    { key: 'jih', label: 'JIH' },
    { key: 'vanitha', label: 'വനിത' },
    { key: 'solidarity', label: 'സോളിഡാരിറ്റി' },
    { key: 'sio', label: 'SIO' },
    { key: 'gio', label: 'GIO' },
    { key: 'teenIndia', label: 'ടീൻ ഇന്ത്യ' },
    { key: 'malarvadi', label: 'മലർവാടി' }
  ];


  return (
    <div className="p-4 sm:p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            {/* Name hidden on mobile: the parent MobileTopBar already shows the screen title there. */}
            <h2 className="hidden lg:block text-2xl font-bold text-[#002349] mb-2">
              യൂണിറ്റ് തലം റിപ്പോർട്ട് - {survey.month}
            </h2>
            <p className="text-gray-600 font-medium">
              {/* Month lives in the desktop-only h2 above, so surface it here on mobile. */}
              <span className="lg:hidden">മാസം: {survey.month} | </span>
              ജില്ല: {survey.district} | ഏരിയ: {survey.area} | ഘടകം: {survey.component} | സമർപ്പിച്ചത്: {survey.submittedByName || survey.submittedBy} | തിയ്യതി: {new Date(survey.submittedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onBack}
              className="p-2 hover:opacity-70 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={handleDownloadPDF}
              className="p-2 hover:opacity-70 transition-opacity"
            >
              <Download className="w-5 h-5 text-gray-700" />
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 hover:opacity-70 transition-opacity"
              >
                <Edit className="w-5 h-5 text-gray-700" />
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Workers Information */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-500">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          പ്രവർത്തകർ
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50 hover:shadow-md transition-all duration-300">
            <label className="block text-lg font-semibold text-[#002349] mb-2">
              റുക്കുൻ
            </label>
            <p className="text-xl font-bold text-[#957C3D]">
              {survey.workers?.rukkun || 0}
            </p>
          </div>

          <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50 hover:shadow-md transition-all duration-300">
            <label className="block text-lg font-semibold text-[#002349] mb-2">
              കർക്കുൻ
            </label>
            <p className="text-xl font-bold text-[#957C3D]">
              {survey.workers?.karkun || 0}
            </p>
          </div>

          <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50 hover:shadow-md transition-all duration-300">
            <label className="block text-lg font-semibold text-[#002349] mb-2">
              ആക്റ്റീവ് അസോസിയേറ്റ്
            </label>
            <p className="text-xl font-bold text-[#957C3D]">
              {survey.workers?.activeAssociate || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Part A - Authority Persons */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-500">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          A. ബന്ധപ്പെട്ട വ്യക്തികൾ
        </h3>
        
        <div className="space-y-4">
          {/* Codes */}
          {survey.partA?.codes && (
            <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50 hover:shadow-md transition-all duration-300">
              <label className="block text-lg font-semibold text-[#002349] mb-2">
                സ്കോഡുകൾ
              </label>
              <p className="text-gray-700 font-medium">{survey.partA.codes}</p>
            </div>
          )}

          {/* Spoken Persons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50 hover:shadow-md transition-all duration-300">
              <label className="block text-lg font-semibold text-[#002349] mb-2">
                സംസാരിച്ച ആൺ  (എണ്ണം)
              </label>
              <p className="text-xl font-bold text-[#957C3D]">
                {survey.partA?.spokenPersons?.male || 0}
              </p>
            </div>

            <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50 hover:shadow-md transition-all duration-300">
              <label className="block text-lg font-semibold text-[#002349] mb-2">
                സംസാരിച്ച പെൺ  (എണ്ണം)
              </label>
              <p className="text-xl font-bold text-[#957C3D]">
                {survey.partA?.spokenPersons?.female || 0}
              </p>
            </div>
          </div>

          {/* Authority Persons */}
          <div>
            <h4 className="text-lg font-semibold text-[#002349] mb-4">
              ഏത് വിഭാഗത്തിൽ പെട്ടവരോടാണ് സംസാരിച്ചത്
            </h4>
            
            <div className="grid grid-cols-1 gap-3">
            {authorityPersonsOptions.map((option) => {
              const genderData = survey.partA?.authorityPersonsGender?.[option.key];
              const hasMale = genderData?.male;
              const hasFemale = genderData?.female;
              const counts = survey.partA?.authorityPersonsCounts?.[option.key] || {};
              const maleCount = counts.male || 0;
              const femaleCount = counts.female || 0;
              
              // Debug: Log specific option data
              console.log(`Authority Person ${option.key}:`, {
                genderData,
                counts,
                maleCount,
                femaleCount,
                hasMale,
                hasFemale
              });
              
              // Show row if any selection or any count exists
              if (!hasMale && !hasFemale && maleCount === 0 && femaleCount === 0) return null;
              
              return (
                <div key={option.key} className="p-3 border border-gray-200 rounded-2xl bg-gray-50 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-green-500 rounded border-2 border-green-500 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-800 text-sm font-medium">{option.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {(hasMale || maleCount > 0) && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">ആണ്‍: {maleCount}</span>
                      )}
                      {(hasFemale || femaleCount > 0) && (
                        <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded">പെണ്‍: {femaleCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
            
            {/* Show message if no authority persons are selected */}
            {authorityPersonsOptions.every(option => {
              const genderData = survey.partA?.authorityPersonsGender?.[option.key];
              const hasMale = genderData?.male;
              const hasFemale = genderData?.female;
              return !hasMale && !hasFemale;
            }) && (
              <div className="p-4 bg-gray-50 rounded-2xl text-center">
                <p className="text-gray-500 text-sm">ഒരു വിഭാഗവും തിരഞ്ഞെടുത്തിട്ടില്ല</p>
              </div>
            )}
          </div>
          
          {/* Other Authority Text */}
          {survey.partA?.authorityOtherText && (
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <label className="block text-lg font-semibold text-[#002349] mb-2">
                മറ്റുള്ളവ (വ്യക്തമാക്കുക):
              </label>
              <p className="text-gray-700 font-medium">{survey.partA.authorityOtherText}</p>
            </div>
          )}
        </div>
      </div>

      {/* Part B - New JIH Members and Member Categories */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-500">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          B. പുതുതായി പ്രതിവാര യോഗത്തിൽ വന്നവർ
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50 hover:shadow-md transition-all duration-300">
            <label className="block text-lg font-semibold text-[#002349] mb-2">
            പുതുതായി പ്രതിവാര യോഗത്തിൽ വന്നവർ (ആണ്‍)
            </label>
            <p className="text-xl font-bold text-[#957C3D]">
              {survey.partB?.newJIHMembers?.male || 0}
            </p>
          </div>

          <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50 hover:shadow-md transition-all duration-300">
            <label className="block text-lg font-semibold text-[#002349] mb-2">
            പുതുതായി പ്രതിവാര യോഗത്തിൽ വന്നവർ (പെണ്‍)
            </label>
            <p className="text-xl font-bold text-[#957C3D]">
              {survey.partB?.newJIHMembers?.female || 0}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-lg font-semibold text-[#002349] mb-4">
          പുതുതായി വന്നവർ : കാറ്റഗറി
          </h4>
          
          <div className="grid grid-cols-1 gap-3">
            {memberCategories.map((category) => {
              const genderData = survey.partB?.memberCategoriesGender?.[category.key];
              const hasMale = genderData?.male;
              const hasFemale = genderData?.female;
              const counts = survey.partB?.memberCategoriesCounts?.[category.key] || {};
              const maleCount = counts.male || 0;
              const femaleCount = counts.female || 0;
              
              // Debug: Log specific category data
              console.log(`Member Category ${category.key}:`, {
                genderData,
                counts,
                maleCount,
                femaleCount,
                hasMale,
                hasFemale
              });
              
              if (!hasMale && !hasFemale && maleCount === 0 && femaleCount === 0) return null;
              
              return (
                <div key={category.key} className="p-3 border border-gray-200 rounded-2xl bg-gray-50 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-green-500 rounded border-2 border-green-500 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      <span className="text-gray-800 text-sm font-medium">{category.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {(hasMale || maleCount > 0) && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">ആണ്‍: {maleCount}</span>
                      )}
                      {(hasFemale || femaleCount > 0) && (
                        <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded">പെണ്‍: {femaleCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Show message if no categories are selected */}
          {memberCategories.every(category => {
            const genderData = survey.partB?.memberCategoriesGender?.[category.key];
            const hasMale = genderData?.male;
            const hasFemale = genderData?.female;
            return !hasMale && !hasFemale;
          }) && (
            <div className="p-4 bg-gray-50 rounded-2xl text-center">
              <p className="text-gray-500 text-sm">ഒരു വിഭാഗവും തിരഞ്ഞെടുത്തിട്ടില്ല</p>
            </div>
          )}
        </div>
      </div>

      {/* Part C - Growth Acceleration */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-500">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          C. പ്രതിമാസ പൊതുയോഗത്തിൽ വന്ന മറ്റുള്ളവർ:

        </h3>
        
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">വിംഗ്</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">എണ്ണം</th>
              </tr>
            </thead>
            <tbody>
              {growthWings.map((wing) => (
                <tr key={wing.key} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="border border-gray-200 px-4 py-3 font-semibold text-[#002349]">{wing.label}</td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">
                    {survey.partC?.growthAcceleration?.[wing.key] || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Part D - Growth Acceleration within report period */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-500">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          D. റിപ്പോർട്ട് കാലയളവിലെ വർധനവ്:
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Rukkun */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-300">
            <h4 className="text-sm font-semibold text-[#002349] mb-3">റുക്ൻ</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">പുരുഷൻ</span>
                <span className="text-lg font-bold text-blue-600">
                  {typeof survey.partD?.growthAcceleration?.rukkun === 'object' 
                    ? (survey.partD?.growthAcceleration?.rukkun?.male || 0)
                    : (survey.partD?.growthAcceleration?.rukkun || 0)
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">സ്ത്രീ</span>
                <span className="text-lg font-bold text-pink-600">
                  {typeof survey.partD?.growthAcceleration?.rukkun === 'object' 
                    ? (survey.partD?.growthAcceleration?.rukkun?.female || 0)
                    : 0
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Karkun */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-300">
            <h4 className="text-sm font-semibold text-[#002349] mb-3">കാർകുൻ</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">പുരുഷൻ</span>
                <span className="text-lg font-bold text-blue-600">
                  {typeof survey.partD?.growthAcceleration?.karkun === 'object' 
                    ? (survey.partD?.growthAcceleration?.karkun?.male || 0)
                    : (survey.partD?.growthAcceleration?.karkun || 0)
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">സ്ത്രീ</span>
                <span className="text-lg font-bold text-pink-600">
                  {typeof survey.partD?.growthAcceleration?.karkun === 'object' 
                    ? (survey.partD?.growthAcceleration?.karkun?.female || 0)
                    : 0
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Solidarity - display total only */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-300">
            <h4 className="text-sm font-semibold text-[#002349] mb-3">സോളിഡാരിറ്റി</h4>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">മൊത്തം</span>
              <span className="text-lg font-bold text-gray-800">
                {survey.partD?.growthAcceleration?.solidarity && typeof survey.partD.growthAcceleration.solidarity === 'object' && !Array.isArray(survey.partD.growthAcceleration.solidarity)
                  ? ((survey.partD.growthAcceleration.solidarity?.male || 0) + (survey.partD.growthAcceleration.solidarity?.female || 0))
                  : (survey.partD?.growthAcceleration?.solidarity || 0)}
              </span>
            </div>
          </div>

          {/* SIO - display total only */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-300">
            <h4 className="text-sm font-semibold text-[#002349] mb-3">SIO</h4>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">മൊത്തം</span>
              <span className="text-lg font-bold text-gray-800">
                {survey.partD?.growthAcceleration?.sio && typeof survey.partD.growthAcceleration.sio === 'object' && !Array.isArray(survey.partD.growthAcceleration.sio)
                  ? ((survey.partD.growthAcceleration.sio?.male || 0) + (survey.partD.growthAcceleration.sio?.female || 0))
                  : (survey.partD?.growthAcceleration?.sio || 0)}
              </span>
            </div>
          </div>

          {/* GIO - display total only */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-300">
            <h4 className="text-sm font-semibold text-[#002349] mb-3">GIO</h4>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">മൊത്തം</span>
              <span className="text-lg font-bold text-gray-800">
                {survey.partD?.growthAcceleration?.gio && typeof survey.partD.growthAcceleration.gio === 'object' && !Array.isArray(survey.partD.growthAcceleration.gio)
                  ? ((survey.partD.growthAcceleration.gio?.male || 0) + (survey.partD.growthAcceleration.gio?.female || 0))
                  : (survey.partD?.growthAcceleration?.gio || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default UnitSurveyView;
