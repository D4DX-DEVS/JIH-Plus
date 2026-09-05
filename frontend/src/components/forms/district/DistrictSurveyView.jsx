import React from 'react';
import { ArrowLeft, Download, Edit } from 'lucide-react';
import { downloadMonthlyDetailPDF } from '../../../utils/monthlyPdfGenerator';

const DistrictSurveyView = ({ survey, onBack, onEdit }) => {
  const handleDownloadPDF = async () => {
    try {
      await downloadMonthlyDetailPDF(survey);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const wings = [
    { key: 'jih', label: 'JIH' },
    { key: 'vanitha', label: 'വനിത' },
    { key: 'solidarity', label: 'സോളിഡാരിറ്റി' },
    { key: 'sio', label: 'SIO' },
    { key: 'gio', label: 'GIO' }
  ];

  const focusAreas = [
    { key: 'newAreaExpansionWorkshop', label: 'പുതിയ പ്രദേശങ്ങളിൽ പ്രസ്ഥാന വ്യാപനം ലക്ഷ്യംവെച്ച് വർക്‌ഷോപ്പ്' },
    { key: 'workerTraining', label: 'പ്രവർത്തകര്‍ക്ക് പരിശീലനം' },
    { key: 'newAreaAgendaPreparation', label: 'പുതിയ പ്രദേശത്തേക്കുള്ള അജണ്ട തയ്യാറാക്കല്‍' },
    { key: 'fulltimeRecruitment', label: 'ഫുള്‍ടൈമറുടെ നിയമനം' },
    { key: 'schoolGuardianClusterFormation', label: 'സ്‌കൂള്‍ രക്ഷിതാക്കളുടെ ക്ലസ്റ്റര്‍ രൂപീകരണം' },
    { key: 'reliefBeneficiaryDataCollection', label: 'റിലീഫ് ഗുണഭോക്താക്കളുടെ ഡാറ്റാ ശേഖരണം' },
    { key: 'workerDeploymentToNewAreas', label: 'പുതിയ പ്രദേശത്തേക്ക് പ്രവർത്തകരെ വിന്യസിക്കല്‍' },
    { key: 'weeklyMeetingEffectiveness', label: 'വാരാന്തയോഗങ്ങളുടെ ഫലപ്രാപ്തി ഉറപ്പാക്കല്‍' },
    { key: 'khatibUtilization', label: 'ഖത്തീബുമാരെ ഉപയോഗപെടുത്തല്‍' },
    { key: 'madrasaMovementGrowthCalculation', label: 'മദ്‌റസയിലൂടെയുള്ള പ്രസ്ഥാന വളര്‍ച്ചയുടെ കണക്കെടുപ്പ്' },
    { key: 'schoolCenteredWork', label: 'സ്‌കൂളുകള്‍ കേന്ദ്രീകരിച്ചുള്ള പ്രവർത്തനം' },
    { key: 'staffHalkaFormation', label: 'സ്റ്റാഫ് ഹല്‍ഖാ രൂപീകരണം' },
    { key: 'islamicCollegeAlumniDiscovery', label: 'ഇസ്്‌ലാമിയ കോളേജുകളിലെ പൂര്‍വ്വ വിദ്യാര്‍ത്ഥികളെ കണ്ടെത്തല്‍' },
    { key: 'quranStudyCenterWork', label: 'ഖുര്‍ആന്‍ സ്റ്റഡി സെന്റര്‍ കേന്ദ്രീകരിച്ചുള്ള പ്രവർത്തനങ്ങള്‍' },
    { key: 'artsScienceCampusLeadership', label: 'ജില്ലയിലെ Arts & Science കോളജ് കാമ്പസില്‍ ഫ്രറ്റേണിറ്റി, SIO, GIO, സാനിധ്യം ഉറപ്പാക്കല്‍' },
    { key: 'hajjUmrahGroupDiscovery', label: 'ഹജ്ജ്/ ഉംറ ഗ്രൂപ്പില്‍ പോയവരെ കണ്ടെത്തല്‍' },
    { key: 'majorMuslimCenterStructure', label: 'പ്രാധാന മുസ്്‌ലിം കേന്ദ്രങ്ങളില്‍ പ്രസ്ഥാന ഘടന ഉറപ്പുവരുത്തല്‍' },
    { key: 'weakAreaFinancialSupport', label: 'ദുര്‍ബല ഏരിയകള്‍ക്ക് സാമ്പത്തിക സഹായം' },
    { key: 'qscTeacherOrientation', label: 'QSC അധ്യപകര്‍ക്ക് ഓറിയന്റേഷന്‍' },
    { key: 'khatibOrientation', label: 'ഖത്തീബുമാര്‍ക്ക് ഓറിയന്റേഷന്‍' },
    { key: 'institutionBearingOrientation', label: 'സ്ഥാപന ഭാരവാഹികള്‍ക്ക് ഓറിയന്റേഷന്‍' },
    { key: 'selectedWorkerTraining', label: 'തെരെഞ്ഞെടുക്കപെട്ട പ്രവർത്തകര്‍ക്ക് പരിശീലനം' }
  ];

  const categories = [
    { key: 'personalConnection', label: 'വ്യക്തിബന്ധം' },
    { key: 'literaryConnection', label: 'സാഹിത്യബന്ധം' },
    { key: 'qscStudent', label: 'QSC പഠിതാവ്' },
    { key: 'regularKhutbaListener', label: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാള്‍' },
    { key: 'prabodhanamReader', label: 'പ്രബോധനം വായനക്കാരന്‍' },
    { key: 'pfBeneficiary', label: 'PF ഗുണഭോക്താവ്' },
    { key: 'bzBeneficiary', label: 'BZ ഗുണഭോക്താവ്' },
    { key: 'localReliefBeneficiary', label: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്' },
    { key: 'aaramamReader', label: 'ആരാമം വായനക്കാരി' },
    { key: 'thawheedulMaraStudent', label: 'തംഹീദുല്‍ മർഅ പഠിതാവ്' },
    { key: 'madrasaAlumni', label: 'മദ്‌റസ പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി' },
    { key: 'islamicCollegeAlumni', label: 'ഇസ്്‌ലാമിയ കോളജ് പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി' },
    { key: 'neighborhoodMember', label: 'അയൽകൂട്ടം അംഗം' },
    { key: 'palliativeConnection', label: 'പാലിയേറ്റീവ് ബന്ധം' },
    { key: 'friendsClubMember', label: 'Friends Club അംഗം' },
    { key: 'mediaReader', label: 'മാധ്യമം വായനക്കാരന്‍' },
    { key: 'ayahDarsQuranStudent', label: 'ആയാത് ദർസെ ഖുര്‍ആന്‍ പഠിതാവ്' },
    { key: 'heavenGuardian', label: 'ഹെവൻസിലെ രക്ഷിതാവ്' },
    { key: 'schoolGuardian', label: 'സ്‌കൂളിലെ രക്ഷിതാവ്' },
    { key: 'arabicCollegeGuardian', label: 'അറബികോളജ് രക്ഷിതാവ്' },
    { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാര്‍ത്ഥി' },
    { key: 'artsCollegeStudent', label: 'ആർട്‌സ് കോളജ് വിദ്യാര്‍ത്ഥി' },
    { key: 'artsCollegeGuardian', label: 'ആർട്‌സ് കോളജ് രക്ഷിതാവ്' },
    { key: 'publicCampusStudent', label: 'പൊതു കാമ്പസിലെ വിദ്യാര്‍ത്ഥി' },
    { key: 'otherNGOs', label: 'മറ്റു NGO കള്‍' },
    { key: 'mahallConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
    { key: 'fulltimeWorkerConnection', label: 'ഫുള്‍െൈടം പ്രവർത്തകനുമായുള്ള ബന്ധം' }
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
              ജില്ലാ തലം റിപ്പോർട്ട് - {survey.month}
            </h2>
            <p className="text-gray-600 font-medium">
              {/* Month lives in the desktop-only h2 above, so surface it here on mobile. */}
              <span className="lg:hidden">മാസം: {survey.month} | </span>
              ജില്ല: {survey.district} | സമർപ്പിച്ചത്: {survey.submittedByName || survey.submittedBy} | തിയ്യതി: {new Date(survey.submittedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onBack}
              aria-label="തിരികെ"
              title="തിരികെ"
              className="p-2 min-h-[44px] min-w-[44px] hover:opacity-70 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={handleDownloadPDF}
              aria-label="ഡൗൺലോഡ്"
              title="ഡൗൺലോഡ്"
              className="p-2 min-h-[44px] min-w-[44px] hover:opacity-70 transition-opacity"
            >
              <Download className="w-5 h-5 text-gray-700" />
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                aria-label="എഡിറ്റ്"
                title="എഡിറ്റ്"
                className="p-2 min-h-[44px] min-w-[44px] hover:opacity-70 transition-opacity"
              >
                <Edit className="w-5 h-5 text-gray-700" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Part A - District Subcommittee Attendance */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-500">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          A. ജില്ലാ സബ്കമ്മിറ്റി ചേർന്നത്
        </h3>
        
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="ih-table-compact w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-white z-[1] border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">വിംഗ്</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">ഹാജർ</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">ലീവ്</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">ആബ്‌സന്റ്</th>
              </tr>
            </thead>
            <tbody>
              {wings.map((wing) => (
                <tr key={wing.key} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="sticky left-0 bg-white z-[1] border border-gray-200 px-4 py-3 font-semibold text-[#002349]">{wing.label}</td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">
                    {survey.partA?.attendance?.[wing.key]?.present || 0}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">
                    {survey.partA?.attendance?.[wing.key]?.leave || 0}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">
                    {survey.partA?.attendance?.[wing.key]?.absent || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Part B - Focus Areas */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-500">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          B. താഴെപറയുന്നവയിൽ ഫോകസ് ചെയ്ത മേഖലകൾ
        </h3>
        
        <div className="space-y-4">
          {focusAreas.map((area) => (
            <div key={area.key} className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-300">
              <div className={`mt-1 h-4 w-4 rounded border-2 flex items-center justify-center ${
                survey.partB?.focusAreas?.[area.key] ? 'bg-green-500 border-green-500' : 'border-gray-300'
              }`}>
                {survey.partB?.focusAreas?.[area.key] && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
              <span className={`leading-relaxed ${
                survey.partB?.focusAreas?.[area.key] ? 'text-gray-900 font-semibold' : 'text-gray-500 font-medium'
              }`}>
                {area.label}
              </span>
            </div>
          ))}
          
          {/* Other Focus Areas */}
          {survey.partB?.focusAreas?.otherFocusAreas && (
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <label className="block text-lg font-semibold text-[#002349] mb-2">
                മറ്റുള്ളവ (വ്യക്തമാക്കുക):
              </label>
              <p className="text-gray-700 font-medium">{survey.partB.focusAreas.otherFocusAreas}</p>
            </div>
          )}
        </div>
      </div>

      {/* Part C - District Subcommittee Activities */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-500">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          C. ജില്ലാ സബ്കമ്മിറ്റി നടത്തിയ പ്രവർത്തനങ്ങൾ
        </h3>
        
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="ih-table-compact w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-white z-[1] border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">വിംഗ്</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">ഘടക സന്ദർശനങ്ങൾ</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">ഏരിയ സന്ദർശനങ്ങൾ</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">പുതിയ ഘടക ശ്രമങ്ങൾ</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">പുതിയ വ്യക്തികളെ കണ്ടെത്തൽ ശ്രമങ്ങൾ</th>
              </tr>
            </thead>
            <tbody>
              {wings.map((wing) => (
                <tr key={wing.key} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="sticky left-0 bg-white z-[1] border border-gray-200 px-4 py-3 font-semibold text-[#002349]">{wing.label}</td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">
                    {survey.partC?.activities?.[wing.key]?.componentVisits || 0}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">
                    {survey.partC?.activities?.[wing.key]?.areaVisits || 0}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">
                    {survey.partC?.activities?.[wing.key]?.newComponentFormationAttempts || 0}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">
                    {survey.partC?.activities?.[wing.key]?.newPersonConnections || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Part D - New Person Invitations */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-500">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          D. പുതിയ വ്യക്തികളെ സംഘടനയിലേക്ക് ക്ഷണിച്ചത്
        </h3>
        
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50 hover:shadow-md transition-all duration-300">
            <label className="block text-lg font-semibold text-[#002349] mb-2">
              ആണ്‍
            </label>
            <p className="text-xl font-bold text-[#957C3D]">
              {survey.partD?.invitations?.male || 0}
            </p>
          </div>

          <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50 hover:shadow-md transition-all duration-300">
            <label className="block text-lg font-semibold text-[#002349] mb-2">
              പെണ്‍
            </label>
            <p className="text-xl font-bold text-[#957C3D]">
              {survey.partD?.invitations?.female || 0}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-lg font-semibold text-[#002349] mb-4">
            ഏത്കാറ്റഗററിയില്‍ പെട്ടവരോടാണ് സംസാരിച്ചത്
          </h4>
          
          <div className="grid grid-cols-1 gap-3">
            {categories.map((category) => {
              const categoryData = survey.partD?.categories?.[category.key];
              const countData = survey.partD?.categoriesCounts?.[category.key];
              const hasMale = categoryData?.male;
              const hasFemale = categoryData?.female;
              const maleCount = countData?.male || 0;
              const femaleCount = countData?.female || 0;
              
              if (!hasMale && !hasFemale && maleCount === 0 && femaleCount === 0) return null;
              
              return (
                <div key={category.key} className="p-4 border border-gray-200 rounded-2xl bg-gray-50 hover:shadow-md transition-all duration-300">
                  <div className="text-sm font-semibold text-gray-700 mb-3">{category.label}</div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Male Section */}
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                          hasMale ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}>
                          {hasMale && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-blue-800">ആൺ</span>
                      </div>
                      {(hasMale || maleCount > 0) && (
                        <div className="w-full px-3 py-2 border border-blue-300 rounded-xl bg-blue-50 text-sm font-medium">
                          എണ്ണം: {maleCount}
                        </div>
                      )}
                    </div>
                    
                    {/* Female Section */}
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                          hasFemale ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                        }`}>
                          {hasFemale && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-pink-800">പെൺ </span>
                      </div>
                      {(hasFemale || femaleCount > 0) && (
                        <div className="w-full px-3 py-2 border border-pink-300 rounded-xl bg-pink-50 text-sm font-medium">
                          എണ്ണം: {femaleCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Other Categories */}
          {survey.partD?.categories?.otherCategories && (
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <label className="block text-lg font-semibold text-[#002349] mb-2">
                മറ്റുള്ളവ (വ്യക്തമാക്കുക):
              </label>
              <p className="text-gray-700 font-medium">{survey.partD.categories.otherCategories}</p>
            </div>
          )}
        </div>
      </div>

      {/* Part E - Growth in Report Period */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-500">
        <h3 className="text-xl font-bold text-[#002349] mb-6">
          E. റിപ്പോർട്ട് കാലയളവിലെ വർദ്ധനവ്
        </h3>
        
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="ih-table-compact w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-white z-[1] border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">വിംഗ്</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">പുതിയ ഘടകങ്ങൾ എണ്ണം</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">പുതുതായി വന്നവർ</th>
              </tr>
            </thead>
            <tbody>
              {growthWings.map((wing) => (
                <tr key={wing.key} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="sticky left-0 bg-white z-[1] border border-gray-200 px-4 py-3 font-semibold text-[#002349]">{wing.label}</td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">
                    {survey.partE?.wingGrowth?.[wing.key]?.newComponents || 0}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-700">
                    {survey.partE?.wingGrowth?.[wing.key]?.newMembers || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default DistrictSurveyView;
