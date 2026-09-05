import React, { useState, useEffect } from 'react';
import { Edit, Calendar, FileText, Users, Building, Eye, X, ArrowLeft, Trash2 } from 'lucide-react';
import { JihFilterBar, JihFilterSelect, JihFab, JihAddButton } from '../components/JihToolbar';
import axios from 'axios';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import jihLogo from '../assets/LogoColor.png';
import { useNavigate } from 'react-router-dom';

// Authority persons options for display
const authorityPersonsOptions = [
  { key: 'vyakthibandham', label: 'വ്യക്തിബന്ധം' },
  { key: 'sahitiyabandham', label: 'സാഹിത്യബന്ധം' },
  { key: 'qscStudent', label: 'QSC പഠിതാവ്' },
  { key: 'regularKhutbaListener', label: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാൾ' },
  { key: 'prabodhanamReader', label: 'പ്രബോധനം വായനക്കാരൻ' },
  { key: 'pfBeneficiary', label: 'PF ഗുണഭോക്താവ്' },
  { key: 'bzBeneficiary', label: 'BZ ഗുണഭോക്താവ്' },
  { key: 'regionalReliefBeneficiary', label: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്' },
  { key: 'aaramamReader', label: 'ആരാമം വായനക്കാരി' },
  { key: 'tamheedulManhabStudent', label: 'തംഹീദുൽ മർഅ പഠിതാവ്' },
  { key: 'institutionAlumni', label: 'മദ്റസ പൂർവ്വ വിദ്യാർത്ഥി' },
  { key: 'islamicCollegeAlumni', label: 'ഇസ്‌ലാമിയ കോളജ് പൂർവ്വ വിദ്യാർത്ഥി' },
  { key: 'neighborhoodGroupMember', label: 'അയൽകൂട്ടം അംഗം' },
  { key: 'palliativeConnection', label: 'പാലിയേറ്റീവ് ബന്ധം' },
  { key: 'friendsClubMember', label: 'Friends Club അംഗം' },
  { key: 'mediaReader', label: 'മാധ്യമം വായനക്കാരൻ' },
  { key: 'ayathulDursalQuranStudent', label: 'ആയാത് ദർസെ ഖുർആൻ പഠിതാവ്' },
  { key: 'heavensGuardian', label: 'ഹെവൻസിലെ രക്ഷിതാവ്' },
  { key: 'schoolGuardian', label: 'സ്കൂളിലെ രക്ഷിതാവ്' },
  { key: 'arabicCollegeGuardian', label: 'അറബികോളജ് രക്ഷിതാവ്' },
  { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാർത്ഥി' },
  { key: 'artsCollegeStudent', label: 'ആർട്സ് കോളജ് വിദ്യാർത്ഥി' },
  { key: 'artsCollegeGuardian', label: 'ആർട്സ് കോളജ് രക്ഷിതാവ്' },
  { key: 'publicCampusStudent', label: 'പൊതു കാമ്പസിലെ വിദ്യാർത്ഥി' },
  { key: 'otherNGOs', label: 'മറ്റു NGO കൾ' },
  { key: 'mahalluConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
  { key: 'fullTimeWorkerConnection', label: 'ഫുൾടൈം പ്രവർത്തകനുമായുള്ള ബന്ധം' }
];

// Member categories options for display
const memberCategoriesOptions = [
  { key: 'vyakthibandham', label: 'വ്യക്തിബന്ധം' },
  { key: 'sahitiyabandham', label: 'സാഹിത്യബന്ധം' },
  { key: 'qscStudent', label: 'QSC പഠിതാവ്' },
  { key: 'regularKhutbaListener', label: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാൾ' },
  { key: 'prabodhanamReader', label: 'പ്രബോധനം വായനക്കാരൻ' },
  { key: 'pfBeneficiary', label: 'PF ഗുണഭോക്താവ്' },
  { key: 'bzBeneficiary', label: 'BZ ഗുണഭോക്താവ്' },
  { key: 'regionalReliefBeneficiary', label: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്' },
  { key: 'aaramamReader', label: 'ആരാമം വായനക്കാരി' },
  { key: 'tamheedulManhabStudent', label: 'തംഹീദുൽ മർഅ പഠിതാവ്' },
  { key: 'institutionAlumni', label: 'മദ്റസ പൂർവ്വ വിദ്യാർത്ഥി' },
  { key: 'islamicCollegeAlumni', label: 'ഇസ്‌ലാമിയ കോളജ് പൂർവ്വ വിദ്യാർത്ഥി' },
  { key: 'neighborhoodGroupMember', label: 'അയൽകൂട്ടം അംഗം' },
  { key: 'palliativeConnection', label: 'പാലിയേറ്റീവ് ബന്ധം' },
  { key: 'friendsClubMember', label: 'Friends Club അംഗം' },
  { key: 'mediaReader', label: 'മാധ്യമം വായനക്കാരൻ' },
  { key: 'ayathulDursalQuranStudent', label: 'ആയാത് ദർസെ ഖുർആൻ പഠിതാവ്' },
  { key: 'heavensGuardian', label: 'ഹെവൻസിലെ രക്ഷിതാവ്' },
  { key: 'schoolGuardian', label: 'സ്കൂളിലെ രക്ഷിതാവ്' },
  { key: 'arabicCollegeGuardian', label: 'അറബികോളജ് രക്ഷിതാവ്' },
  { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാർത്ഥി' },
  { key: 'artsCollegeStudent', label: 'ആർട്സ് കോളജ് വിദ്യാർത്ഥി' },
  { key: 'artsCollegeGuardian', label: 'ആർട്സ് കോളജ് രക്ഷിതാവ്' },
  { key: 'publicCampusStudent', label: 'പൊതു കാമ്പസിലെ വിദ്യാർത്ഥി' },
  { key: 'otherNGOs', label: 'മറ്റു NGO കൾ' },
  { key: 'mahalluConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
  { key: 'fullTimeWorkerConnection', label: 'ഫുൾടൈം പ്രവർത്തകനുമായുള്ള ബന്ധം' }
];

const MonthlySurveyDashboard = ({ onBack, onCreateNew, onEdit, userData }) => {
  const [surveys, setSurveys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // Remove activeTab since we're using filters instead
  
  const navigate = useNavigate();
  
  // Filtering and search
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [focusAreaFilter, setFocusAreaFilter] = useState(''); // For district
  const [areaFocusFilter, setAreaFocusFilter] = useState(''); // For area
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSurveys, setTotalSurveys] = useState(0);
  
  // Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState(null);
  
  // View state
  const [showDetailView, setShowDetailView] = useState(false);
  const [viewingSurvey, setViewingSurvey] = useState(null);

  // Since user is always district admin, set permissions accordingly
  const userRole = 'district'; // Always district admin
  
  // District admins can create, edit, and delete surveys
  const canCreate = levelFilter === 'district'; // Can only create when district level is selected
  const canEdit = true; // Allow edit for district surveys
  const canDelete = true; // Allow delete for district surveys
  
  // Debug logging to help identify role issues
  console.log('MonthlySurveyDashboard - userData:', userData);
  console.log('MonthlySurveyDashboard - userRole:', userRole);
  console.log('MonthlySurveyDashboard - levelFilter:', levelFilter);
  console.log('MonthlySurveyDashboard - canCreate:', canCreate);

  useEffect(() => {
    fetchSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Reset to page 1 whenever a filter changes so the newly-filtered result
  // set isn't sliced against a stale page number.
  useEffect(() => {
    setCurrentPage(1);
    fetchSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelFilter, monthFilter, focusAreaFilter, areaFocusFilter]);

  // The backend has no free-text search and the focus-area filters are
  // client-side only, so widen the fetched page instead of only matching
  // the current 10-record server page (debounced to avoid a fetch per keystroke).
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchSurveys();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Clear focus area filters when level changes
  useEffect(() => {
    if (levelFilter !== 'district') {
      setFocusAreaFilter('');
    }
    if (levelFilter !== 'area') {
      setAreaFocusFilter('');
    }
  }, [levelFilter]);

  const fetchSurveys = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('userToken');
      const hasClientFilter = searchTerm.trim().length > 0 || !!focusAreaFilter || !!areaFocusFilter;
      const params = new URLSearchParams({
        page: hasClientFilter ? 1 : currentPage,
        limit: hasClientFilter ? 500 : 10,
      });

      if (monthFilter) params.append('month', monthFilter);

      let endpoint = '';
      
      // Always use the "all" endpoint since we're filtering by level
      endpoint = '/api/user/monthly-surveys/all';
      
      // Add level filter to params if specified
      if (levelFilter) {
        params.append('level', levelFilter);
      }

      console.log('Fetching reports from endpoint:', endpoint);
      console.log('With params:', params.toString());
      console.log('Full URL:', `${import.meta.env.VITE_API_URL}${endpoint}?${params}`);
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}${endpoint}?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      console.log('API Response:', response.data);
      
      // Handle different response formats
      setSurveys(response.data.surveys || response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalSurveys(response.data.totalSurveys || 0);
      
      // Survey stats are calculated locally from the surveys array
    } catch (error) {
      console.error('Error fetching monthly reports:', error);
      setError('Failed to load monthly reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!surveyToDelete || !canDelete) return;

    try {
      const token = localStorage.getItem('userToken');
      // Use different endpoints based on user role
      let deleteEndpoint = '';
      if (userRole === 'district') {
        deleteEndpoint = `/api/district/surveys/${surveyToDelete._id}`;
      } else if (userRole === 'area') {
        deleteEndpoint = `/api/area/surveys/${surveyToDelete._id}`;
      } else if (userRole === 'unit') {
        deleteEndpoint = `/api/unit/unit-survey/${surveyToDelete._id}`;
      } else {
        deleteEndpoint = `/api/user/monthly-survey/${surveyToDelete._id}`;
      }
      
      await axios.delete(
        `${import.meta.env.VITE_API_URL}${deleteEndpoint}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Update local state
      setSurveys(surveys.filter((survey) => survey._id !== surveyToDelete._id));
      setTotalSurveys(prev => prev - 1);
      setShowDeleteModal(false);
      setSurveyToDelete(null);
      
      // Refresh the data
      fetchSurveys();
    } catch (error) {
      console.error('Error deleting report:', error);
      setError('Failed to delete report');
    }
  };

  const handleViewSurvey = (survey) => {
    setViewingSurvey(survey);
    setShowDetailView(true);
  };

  const handleEditSurvey = (survey) => {
    if (canEdit && survey.submissionLevel === 'district') {
      const isAdminUser = userRole === 'admin' || userRole === 'superadmin';
      // Save in sessionStorage as a fallback in case router state is lost
      try {
        sessionStorage.setItem('editingDistrictSurvey', JSON.stringify(survey));
      } catch (e) {}
      // Navigate with state so edit page can prefill without fetching
      navigate(`/district-survey?edit=${survey._id}`, {
        state: { editingSurvey: survey, isAdmin: isAdminUser }
      });
    } else {
      // For non-district users or non-district surveys, treat as view-only
      handleViewSurvey(survey);
    }
  };

  // Add the missing handleSearch function - triggers a manual refresh
  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page when searching
    fetchSurveys();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setLevelFilter('');
    setMonthFilter('');
    setFocusAreaFilter('');
    setAreaFocusFilter('');
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Render functions for complete survey details by level
  const renderDistrictPartA = (partA) => (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-[#002349] mb-6 flex items-center">
        <span className="inline-flex items-center justify-center w-8 h-8 bg-[#002349] text-white text-sm font-bold rounded-full mr-3 shadow-md">1</span>
        ജില്ലാ സബ്‌കമ്മിറ്റി പങ്കെടുക്കൽ
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold">വിംഗ്</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold">ഹാജർ</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold">ലീവ്</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold">അബ്സന്റ്</th>
            </tr>
          </thead>
          <tbody>
            {['jih','vanitha','solidarity','sio','gio'].map((wing) => (
              <tr key={wing}>
                <td className="border border-gray-300 px-4 py-3 font-medium uppercase">{wing}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{partA?.attendance?.[wing]?.present || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{partA?.attendance?.[wing]?.leave || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{partA?.attendance?.[wing]?.absent || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDistrictPartB = (partB) => {
    const labels = {
      newAreaExpansionWorkshop: 'പുതിയ ഏരിയ എക്സ്പാൻഷൻ വർക്ക്‌ഷോപ്പ്',
      workerTraining: 'വർക്കർ ട്രെയിനിംഗ്',
      newAreaAgendaPreparation: 'പുതിയ ഏരിയ അജണ്ട തയ്യാറാക്കൽ',
      fulltimeRecruitment: 'ഫുൾടൈം റിക്രൂട്ട്മെന്റ്',
      schoolGuardianClusterFormation: 'സ്കൂൾ ഗാർഡിയൻ ക്ലസ്റ്റർ രൂപീകരണം',
      reliefBeneficiaryDataCollection: 'റിലീഫ് ബെനിഫിഷറി ഡാറ്റ ശേഖരം',
      workerDeploymentToNewAreas: 'പുതിയ ഏരിയകളിലേക്ക് വർക്കർ നിയോഗം',
      weeklyMeetingEffectiveness: 'വാരാന്ത്യ മീറ്റിംഗിന്റെ ഫലപ്രാപ്തി',
      khatibUtilization: 'ഖതീബിന്റെ പ്രാപനം',
      madrasaMovementGrowthCalculation: 'മദ്റസ മൂവ്‌മെന്റ് വളർച്ച കണക്കാക്കൽ',
      schoolCenteredWork: 'സ്കൂൾ സെൻറർഡ് വർക്ക്',
      staffHalkaFormation: 'സ്റ്റാഫ് ഹൽഖ രൂപീകരണം',
      islamicCollegeAlumniDiscovery: 'ഇസ്‌ലാമിക് കോളേജ് അൽമ്നി കണ്ടെത്തൽ',
      quranStudyCenterWork: 'ഖുർആൻ സ്റ്റഡി സെൻറർ പ്രവർത്തനം',
      artsScienceCampusLeadership: 'ജില്ലയിലെ Arts & Science കോളജ് കാമ്പസില്‍ ഫ്രറ്റേണിറ്റി, SIO, GIO, സാനിധ്യം ഉറപ്പാക്കല്‍',
      hajjUmrahGroupDiscovery: 'ഹജ്ജ്/ഉംറ ഗ്രൂപ്പ് കണ്ടെത്തൽ',
      majorMuslimCenterStructure: 'പ്രധാന മുസ്ലിം കേന്ദ്ര ഘടന',
      weakAreaFinancialSupport: 'ബലഹീന ഏരിയകൾക്ക് സാമ്പത്തിക പിന്തുണ',
      qscTeacherOrientation: 'QSC ടീച്ചർ ഓറിയൻറേഷൻ',
      khatibOrientation: 'ഖതീബ് ഓറിയൻറേഷൻ',
      institutionBearingOrientation: 'ഇൻസ്റ്റിറ്റ്യൂഷൻ ബെയറിംഗ് ഓറിയൻറേഷൻ',
      selectedWorkerTraining: 'തിരഞ്ഞെടുത്ത വർക്കർ ട്രെയിനിംഗ്'
    };

    const items = Object.entries(partB?.focusAreas || {})
      .filter(([k, v]) => !!v && k !== 'otherFocusAreas')
      .map(([k]) => labels[k] || k);

    const otherFocusAreas = partB?.focusAreas?.otherFocusAreas;

    return (
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[#957C3D] mb-4 flex items-center">
          <span className="inline-flex items-center justify-center w-8 h-8 bg-[#957C3D] text-white text-sm font-bold rounded-full mr-3 shadow-md">2</span>
          ഫോകസ് ഏരിയകൾ
        </h3>
        {items.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((label) => (
              <div key={label} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-xl transition-all duration-300 group">
                <div className="w-3 h-3 bg-[#002349] rounded-full group-hover:scale-125 transition-transform duration-300"></div>
                <span className="text-sm text-gray-800 group-hover:text-gray-900 transition-colors duration-300">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">ഫോകസ് ഏരിയകൾ തിരഞ്ഞെടുത്തിട്ടില്ല</p>
        )}
        {otherFocusAreas && otherFocusAreas.trim() && (
          <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="text-sm font-semibold text-[#002349] mb-2">മറ്റുള്ളവ (വ്യക്തമാക്കുക)</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{otherFocusAreas}</div>
          </div>
        )}
      </div>
    );
  };

  const renderDistrictPartC = (partC) => {
    const wings = [
      { key: 'jih', label: 'JIH' },
      { key: 'vanitha', label: 'വനിത' },
      { key: 'solidarity', label: 'സോളിഡാരിറ്റി' },
      { key: 'sio', label: 'SIO' },
      { key: 'gio', label: 'GIO' }
    ];
    return (
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[#002349] mb-6 flex items-center">
          <span className="inline-flex items-center justify-center w-8 h-8 bg-[#002349] text-white text-sm font-bold rounded-full mr-3 shadow-md">3</span>
          സബ്‌കമ്മിറ്റി പ്രവർത്തനങ്ങൾ
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">വിംഗ്</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold">ഘടക സന്ദർശനങ്ങൾ</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold">ഏരിയ സന്ദർശനങ്ങൾ</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold">പുതിയ ഘടക ശ്രമങ്ങൾ</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold">പുതിയ വ്യക്തികളെ കണ്ടെത്തൽ ശ്രമങ്ങൾ</th>
              </tr>
            </thead>
            <tbody>
              {wings.map((wing) => (
                <tr key={wing.key}>
                  <td className="border border-gray-300 px-4 py-3 font-medium">{wing.label}</td>
                  <td className="border border-gray-300 px-4 py-3 text-center">{partC?.activities?.[wing.key]?.componentVisits || 0}</td>
                  <td className="border border-gray-300 px-4 py-3 text-center">{partC?.activities?.[wing.key]?.areaVisits || 0}</td>
                  <td className="border border-gray-300 px-4 py-3 text-center">{partC?.activities?.[wing.key]?.newComponentFormationAttempts || 0}</td>
                  <td className="border border-gray-300 px-4 py-3 text-center">{partC?.activities?.[wing.key]?.newPersonConnections || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDistrictPartD = (partD) => {
    const otherCategories = partD?.categories?.otherCategories;
    const labels = {
      personalConnection: 'വ്യക്തിബന്ധം',
      literaryConnection: 'സാഹിത്യബന്ധം',
      qscStudent: 'QSC പഠിതാവ്',
      regularKhutbaListener: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാള്',
      prabodhanamReader: 'പ്രബോധനം വായനക്കാരന്',
      pfBeneficiary: 'PF ഗുണഭോക്താവ്',
      bzBeneficiary: 'BZ ഗുണഭോക്താവ്',
      localReliefBeneficiary: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്',
      aaramamReader: 'ആരാമം വായനക്കാരി',
      thawheedulMaraStudent: 'തംഹീദുല്‍ മർअ പഠിതാവ്',
      madrasaAlumni: 'മദ്‌റസ പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി',
      islamicCollegeAlumni: 'ഇസ്‌ലാമിയ കോളജ് പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി',
      neighborhoodMember: 'അയൽകൂട്ടം അംഗം',
      palliativeConnection: 'പാലിയേറ്റീവ് ബന്ധം',
      friendsClubMember: 'Friends Club അംഗം',
      mediaReader: 'മാധ്യമം വായനക്കാരന്',
      ayahDarsQuranStudent: 'ആയാത് ദർസെ ഖുര്‍ആന്‍ പഠിതാവ്',
      heavenGuardian: 'ഹെവൻസിലെ രക്ഷിതാവ്',
      schoolGuardian: 'സ്‌കൂളിലെ രക്ഷിതാവ്',
      arabicCollegeGuardian: 'അറബികോളജ് രക്ഷിതാവ്',
      arabicCollegeStudent: 'അറബിക് കോളജ് വിദ്യാര്‍ത്ഥി',
      artsCollegeStudent: 'ആർട്‌സ് കോളജ് വിദ്യാര്‍ത്ഥി',
      artsCollegeGuardian: 'ആർട്‌സ് കോളജ് രക്ഷിതാവ്',
      publicCampusStudent: 'പൊതു കാമ്പസിലെ വിദ്യാര്‍ത്ഥി',
      otherNGOs: 'മറ്റു NGO കള്‍',
      mahallConnection: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം',
      fulltimeWorkerConnection: 'ഫുള്‍െൈടം പ്രവർത്തകനുമായുള്ള ബന്ധം'
    };
    
    return (
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[#957C3D] mb-4 flex items-center">
          <span className="inline-flex items-center justify-center w-8 h-8 bg-[#957C3D] text-white text-sm font-bold rounded-full mr-3 shadow-md">4</span>
          പുതിയ വ്യക്തികളെ ക്ഷണിക്കൽ
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-gray-50 rounded-2xl border border-[#002349]/20">ആൺ: <span className="font-semibold text-[#002349]">{partD?.invitations?.male || 0}</span></div>
          <div className="p-3 bg-gray-50 rounded-2xl border border-[#957C3D]/20">പെൺ: <span className="font-semibold text-[#957C3D]">{partD?.invitations?.female || 0}</span></div>
        </div>
        {partD?.categories && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(partD.categories)
              .map(([key, value]) => {
                const v = value || {};
                const count = partD?.categoriesCounts?.[key] || { male: 0, female: 0 };
                const hasMale = !!v.male;
                const hasFemale = !!v.female;
                const maleCount = Number(count.male) || 0;
                const femaleCount = Number(count.female) || 0;
                const show = (hasMale || hasFemale) || (maleCount > 0 || femaleCount > 0);
                if (key === 'otherCategories' || !show) return null;
                return (
                  <div key={key} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-md hover:bg-white transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900 transition-colors duration-300">{labels[key] || key}</span>
                      <div className="flex items-center space-x-2">
                        {(hasMale || maleCount > 0) && (
                          <span className="text-xs bg-[#002349] text-white px-2 py-1 rounded-full font-medium">
                            ആൺ{maleCount > 0 ? ` (${maleCount})` : ''}
                          </span>
                        )}
                        {(hasFemale || femaleCount > 0) && (
                          <span className="text-xs bg-[#957C3D] text-white px-2 py-1 rounded-full font-medium">
                            പെൺ {femaleCount > 0 ? ` (${femaleCount})` : ''}
                          </span>
                        )}
                  </div>
                </div>
                  </div>
                );
              })}
          </div>
        )}
        {otherCategories && otherCategories.trim() && (
          <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="text-sm font-semibold text-[#002349] mb-2">മറ്റുള്ളവ (വ്യക്തമാക്കുക)</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{otherCategories}</div>
          </div>
        )}
      </div>
    );
  };

  const renderDistrictPartE = (partE) => (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-[#002349] mb-4 flex items-center">
        <span className="inline-flex items-center justify-center w-8 h-8 bg-[#002349] text-white text-sm font-bold rounded-full mr-3 shadow-md">5</span>
        റിപ്പോർട്ട് കാലയളവിലെ വളർച്ച
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold">വിംഗ്</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold">പുതിയ ഘടകങ്ങൾ</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold">പുതിയ അംഗങ്ങൾ</th>
            </tr>
          </thead>
          <tbody>
        {Object.entries(partE?.wingGrowth || {}).map(([wing, data]) => (
              <tr key={wing}>
                <td className="border border-gray-300 px-4 py-3 font-medium uppercase">{wing}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{data?.newComponents || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{data?.newMembers || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAreaPartA = (partA) => (
    <div className="pt-6 pb-6 border-b border-gray-300">
      <h3 className="text-base font-bold text-[#002349] mb-4 flex items-center">
        <span className="inline-flex items-center justify-center w-6 h-6 bg-[#002349] text-white text-xs font-bold rounded-full mr-2">1</span>
        ആകെ ഘടകങ്ങൾ
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="group">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            KH
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-[#002349]">
            {partA.kh || 0}
          </div>
        </div>
        <div className="group">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            VKH
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-[#002349]">
            {partA.vkh || 0}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAreaPartB = (partB) => {
    const wings = [
      { key: 'jih', label: 'JIH' },
      { key: 'vanitha', label: 'വനിത' },
      { key: 'solidarity', label: 'സോളിഡാരിറ്റി' },
      { key: 'sio', label: 'SIO' },
      { key: 'gio', label: 'GIO' }
    ];
    return (
      <>
        {/* Monthly Meeting Status */}
        <div className="pt-6 pb-6 border-b border-gray-300">
          <h4 className="text-base font-bold text-[#002349] mb-4 flex items-center">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-[#002349] text-white text-xs font-bold rounded-full mr-2">2</span>
            മാസിക കൂടിക്കാഴ്ച
          </h4>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-700 font-medium">നടന്നുവോ?</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              partB.monthlyMeeting === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {partB.monthlyMeeting === 'Yes' ? 'അതെ' : 'ഇല്ല'}
            </span>
          </div>
          {partB.monthlyMeetingReason && (
            <div className="mt-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">കാരണം</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-xs font-medium">
                {partB.monthlyMeetingReason}
              </div>
            </div>
          )}
        </div>

        {/* Wing Attendance */}
        <div className="pt-6 pb-6 border-b border-gray-300">
          <h4 className="text-base font-bold text-[#002349] mb-4 flex items-center">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-[#957C3D] text-white text-xs font-bold rounded-full mr-2">3</span>
            വിംഗ് ഹാജരാകൽ
          </h4>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-[#002349]">വിംഗ്</th>
                  <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-[#002349]">ഹാജരായി</th>
                  <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-[#002349]">അവധി</th>
                  <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-[#002349]">ഗൈർഹാജർ</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(partB.wingAttendance || {}).map(([wing, attendance]) => (
                  <tr key={wing} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="border-b border-gray-100 px-3 py-2 text-xs font-bold text-[#002349] capitalize">{wing}</td>
                    <td className="border-b border-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-700">{attendance.present || 0}</td>
                    <td className="border-b border-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-700">{attendance.leave || 0}</td>
                    <td className="border-b border-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-700">{attendance.absent || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Main Decisions */}
        {partB.mainDecisions && partB.mainDecisions.length > 0 && (
          <div className="pt-6 pb-6 border-b border-gray-300">
            <h4 className="text-base font-bold text-[#002349] mb-4 flex items-center">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-[#957C3D] text-white text-xs font-bold rounded-full mr-2">4</span>
              പ്രധാന തീരുമാനങ്ങൾ
            </h4>
            <div className="space-y-2">
              {partB.mainDecisions.map((decision, index) => (
                <div key={index} className="flex items-start space-x-2 p-2.5 bg-gray-50 rounded-xl">
                  <span className="text-xs font-bold text-[#957C3D] mt-0.5 min-w-[16px]">{index + 1}.</span>
                  <p className="text-xs text-gray-900 font-medium">{decision}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderAreaPartC = (partC) => {
    const activityLabels = {
      newAreaWorkshop: 'പുതിയ ഏരിയ വർക്ക്ഷോപ്പ്',
      workerTraining: 'പ്രവർത്തക പരിശീലനം',
      newAreaAgenda: 'പുതിയ ഏരിയ എജണ്ട തയ്യാറാക്കൽ',
      fulltimeRecruitment: 'പൂർണ്ണസമയ നിയമനം',
      schoolGuardianCluster: 'സ്കൂൾ രക്ഷിതാവ് ക്ലസ്റ്റർ രൂപീകരണം',
      reliefDataCollection: 'ആശ്വാസ ഗുണഭോക്താവ് ഡാറ്റ ശേഖരണം',
      workerDeployment: 'പുതിയ ഏരിയകളിലേക്ക് പ്രവർത്തക വിന്യാസം',
      weeklyMeetingEffectiveness: 'ആഴ്ചയിലെ കൂടിക്കാഴ്ച ഫലപ്രാപ്തി',
      hajjUmrahGroup: 'ഹജ്ജ്/ഉംറ ഗ്രൂപ്പ് അംഗങ്ങൾ',
      artsScienceCampus: 'ആർട്സ് & സയൻസ് കാമ്പസ് പ്രവർത്തനങ്ങൾ',
      madrasaGrowthCalculation: 'മദ്റസ വളർച്ച കണക്കുകൂട്ടൽ',
      schoolCenteredWork: 'സ്കൂൾ കേന്ദ്രീകൃത പ്രവർത്തനം',
      staffHalkaFormation: 'സ്റ്റാഫ് ഹൽക്ക രൂപീകരണം',
      islamicCollegeAlumni: 'ഇസ്‌ലാമിയ കോളജ് പൂർവ്വ വിദ്യാർത്ഥികൾ',
      quranStudyCenterWork: 'ഖുർആൻ പഠന കേന്ദ്ര പ്രവർത്തനം'
    };

    const selectedActivities = Object.entries(partC.expansionActivities || {})
      .filter(([key, value]) => value)
      .map(([key]) => ({ key, label: activityLabels[key] || key }));

    return (
      <div className="pt-6 pb-6 border-b border-gray-300">
        <h3 className="text-base font-bold text-[#002349] mb-4 flex items-center">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-[#002349] text-white text-xs font-bold rounded-full mr-2">5</span>
          ശ്രദ്ധേയമായ മേഖലകൾ
        </h3>
        
        {selectedActivities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedActivities.map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-2 py-1.5 px-2.5 bg-gray-50 rounded-xl">
                <div className="w-1.5 h-1.5 bg-[#957C3D] rounded-full"></div>
                <span className="text-xs text-gray-900 font-medium">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600 font-medium">ശ്രദ്ധേയമായ മേഖലകൾ തിരഞ്ഞെടുത്തിട്ടില്ല</p>
        )}
      </div>
    );
  };

  const renderAreaPartD = (partD) => {
    const wingLabels = {
      jih: 'JIH',
      vanitha: 'Vanitha',
      solidarity: 'Solidarity',
      sio: 'SIO',
      gio: 'GIO'
    };
    if (!partD?.activities) return null;
    return (
      <div className="pt-6 pb-6 border-b border-gray-300">
        <h3 className="text-base font-bold text-[#002349] mb-4 flex items-center">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-[#002349] text-white text-xs font-bold rounded-full mr-2">6</span>
          ഏരിയ ടീം പ്രവർത്തനങ്ങൾ
        </h3>
        
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-[#002349]">വിംഗ്</th>
                <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-[#002349]">ഘടക സന്ദർശനങ്ങൾ</th>
                <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-[#002349]">പുതിയ ഘടക ശ്രമങ്ങൾ</th>
                <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-[#002349]">പുതിയ വ്യക്തി കണ്ടെത്തൽ ശ്രമങ്ങൾ</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(partD.activities).map(([wing, data]) => (
                <tr key={wing} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="border-b border-gray-100 px-3 py-2 text-xs font-bold text-[#002349]">{wingLabels[wing] || wing}</td>
                  <td className="border-b border-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-700">{data.componentVisits || 0}</td>
                  <td className="border-b border-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                    {data.newComponentAttempts === 1 ? 'അതെ' : data.newComponentAttempts === 0 ? 'ഇല്ല' : '-'}
                  </td>
                  <td className="border-b border-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                    {data.newPersonDiscoveryAttempts === 1 ? 'അതെ' : data.newPersonDiscoveryAttempts === 0 ? 'ഇല്ല' : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAreaPartE = (partE) => {
    const categoryLabels = {
      personalConnection: 'വ്യക്തിബന്ധം',
      literaryConnection: 'സാഹിത്യബന്ധം',
      qscStudent: 'QSC പഠിതാവ്',
      regularKhutbaListener: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാൾ',
      prabodhanamReader: 'പ്രബോധനം വായനക്കാരൻ',
      jaBeneficiary: 'PF ഗുണഭോക്താവ്',
      adaBeneficiary: 'BZ ഗുണഭോക്താവ്',
      localReliefBeneficiary: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്',
      aaramamReader: 'ആരാമം വായനക്കാരി',
      thawheedulMaraStudent: 'തംഹീദുൽ മർഅ പഠിതാവ്',
      madrasaAlumni: 'മദ്റസ പൂർവ്വ വിദ്യാർത്ഥി',
      islamicCollegeAlumni: 'ഇസ്‌ലാമിയ കോളജ് പൂർവ്വ വിദ്യാർത്ഥി',
      neighborhoodMember: 'അയൽകൂട്ടം അംഗം',
      palliativeConnection: 'പാലിയേറ്റീവ് ബന്ധം',
      friendsClubMember: 'Friends Club അംഗം',
      mediaReader: 'മാധ്യമം വായനക്കാരൻ',
      ayahDarsQuranStudent: 'ആയാത് ദർസെ ഖുർആൻ പഠിതാവ്',
      heavenGuardian: 'ഹെവൻസിലെ രക്ഷിതാവ്',
      schoolGuardian: 'സ്കൂളിലെ രക്ഷിതാവ്',
      arabicCollegeGuardian: 'അറബികോളജ് രക്ഷിതാവ്',
      arabicCollegeStudent: 'അറബിക് കോളജ് വിദ്യാർത്ഥി',
      artsCollegeStudent: 'ആർട്സ് കോളജ് വിദ്യാർത്ഥി',
      artsCollegeGuardian: 'ആർട്സ് കോളജ് രക്ഷിതാവ്',
      publicCampusStudent: 'പൊതു കാമ്പസിലെ വിദ്യാർത്ഥി',
      otherNGOs: 'മറ്റു NGO കൾ',
      mahallConnection: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം',
      fulltimeWorkerConnection: 'ഫുൾടൈം പ്രവർത്തകനുമായുള്ള ബന്ധം'
    };

    const selectedCategories = Object.entries(partE.categories || {})
      .filter(([key, value]) => value && (value.male || value.female))
      .map(([key, value]) => ({ 
        key, 
        label: categoryLabels[key] || key,
        male: value.male,
        female: value.female,
        maleCount: partE.categoriesCounts?.[key]?.male || 0,
        femaleCount: partE.categoriesCounts?.[key]?.female || 0
      }));

    return (
      <div className="pt-6 pb-6 border-b border-gray-300">
        <h3 className="text-base font-bold text-[#002349] mb-4 flex items-center">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-[#957C3D] text-white text-xs font-bold rounded-full mr-2">7</span>
          പുതിയ വ്യക്തികളെ കണ്ടെത്തുന്നതിനായി സംസാരിച്ച വ്യക്തികൾ
        </h3>
        
        <div className="space-y-4">
          {/* Gender Count */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                ആണ്‍
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-[#002349]">
                {partE.male || 0}
              </div>
            </div>
            <div className="group">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                പെണ്‍
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-[#002349]">
                {partE.female || 0}
              </div>
            </div>
          </div>

          {/* Categories */}
          {selectedCategories.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-[#002349] mb-3">ഏത് കാറ്റഗറിയിൽപെട്ടവരോടാണ് സംസാരിച്ചത് (✓ മാർക്ക് ചെയ്യുക)</h4>
              <div className="space-y-2">
                {selectedCategories.map(({ key, label, male, female, maleCount, femaleCount }) => (
                  <div key={key} className="p-2.5 border border-gray-200 rounded-xl bg-gray-50">
                    <div className="text-xs font-medium text-gray-700 mb-2">{label}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Male Section */}
                      <div className="flex flex-col space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={male}
                            readOnly
                            className="h-3.5 w-3.5 text-blue-600 border-gray-300 rounded"
                          />
                          <span className="text-xs font-medium text-blue-800">ആൺ</span>
                        </div>
                        {male && (
                          <input
                            type="number"
                            value={maleCount || 0}
                            readOnly
                            className="w-full px-2 py-1.5 border border-blue-300 rounded-lg bg-blue-50 text-base sm:text-xs"
                            placeholder="എണ്ണം"
                          />
                        )}
                      </div>
                      
                      {/* Female Section */}
                      <div className="flex flex-col space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={female}
                            readOnly
                            className="h-3.5 w-3.5 text-pink-600 border-gray-300 rounded"
                          />
                          <span className="text-xs font-medium text-pink-800">പെൺ </span>
                        </div>
                        {female && (
                          <input
                            type="number"
                            value={femaleCount || 0}
                            readOnly
                            className="w-full px-2 py-1.5 border border-pink-300 rounded-lg bg-pink-50 text-base sm:text-xs"
                            placeholder="എണ്ണം"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Category */}
          {partE.otherCategory && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">മറ്റുള്ളവ (വ്യക്തമാക്കുക)</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-xs font-medium">
                {partE.otherCategory}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAreaPartF = (partF) => {
    const wingLabels = {
      jih: 'JIH',
      vanitha: 'Vanitha',
      solidarity: 'Solidarity',
      sio: 'SIO',
      gio: 'GIO',
      teenIndia: 'Teen India',
      malarvadi: 'Malarvadi'
    };

    const totalComponents = Object.values(partF.wingGrowth || {}).reduce((sum, data) => sum + (data.newComponents || 0), 0);
    const totalMembers = Object.values(partF.wingGrowth || {}).reduce((sum, data) => sum + (data.newMembers || 0), 0);

    return (
      <div className="pt-6 pb-6 border-b border-gray-300">
        <h3 className="text-base font-bold text-[#002349] mb-4 flex items-center">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-[#002349] text-white text-xs font-bold rounded-full mr-2">8</span>
          റിപ്പോർട്ട് കാലയളവിലെ വർദ്ധനവ്
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(partF.wingGrowth || {}).map(([wing, data]) => (
            <div key={wing} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold text-[#002349] uppercase tracking-wide">
                  {wingLabels[wing] || wing}
                </h5>
                <div className="text-[10px] text-gray-600 font-semibold">
                  {((data.newComponents || 0) + (data.newMembers || 0))} ആകെ
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-green-50 rounded-xl">
                  <div className="text-base font-bold text-green-700 mb-0.5">{data.newComponents || 0}</div>
                  <div className="text-[10px] text-green-600 font-medium">ഘടകങ്ങൾ</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-xl">
                  <div className="text-base font-bold text-blue-700 mb-0.5">{data.newMembers || 0}</div>
                  <div className="text-[10px] text-blue-600 font-medium">അംഗങ്ങൾ</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Total Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-6">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-xl font-bold text-green-600">{totalComponents}</div>
              <div className="text-xs text-gray-600 font-semibold">ആകെ ഘടകങ്ങൾ</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-xl font-bold text-[#002349]">{totalMembers}</div>
              <div className="text-xs text-gray-600 font-semibold">ആകെ അംഗങ്ങൾ</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Unit level renderer (compact but complete) - matches UnitDashboardPage.jsx structure
  const renderUnitDetails = (survey) => {
    const partA = survey.partA || {};
    const partB = survey.partB || {};
    const partC = survey.partC || {};
    const partD = survey.partD || {};

    return (
      <>
        {/* Part A */}
        {(survey.workers || partA) && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-[#002349] mb-4">ഭാഗം A: Expansion മായി ബന്ധപെട്ട് നടന്ന പ്രവർത്തനങ്ങൾ</h3>
            
            {/* Workers Information */}
            {survey.workers && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">1</span>
                  പ്രവർത്തകർ (എണ്ണം)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">റുക്കുൻ</label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{survey.workers.rukkun ?? 0}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">കർക്കുൻ</label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{survey.workers.karkun ?? 0}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ആക്ടീവ് അസോസിയേറ്റ്‌സ്</label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{survey.workers.activeAssociate ?? 0}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Codes */}
            {partA?.codes && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">2</span>
                  A സ്‌കോഡുകൾ
                </label>
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{partA.codes || '—'}</div>
              </div>
            )}
            
            {/* Spoken Persons */}
            {partA?.spokenPersons && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">3</span>
                  സംസാരിച്ച വ്യക്തികൾ ആണ്‍
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ആൺ</label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{partA.spokenPersons.male ?? 0}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">പെൺ</label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{partA.spokenPersons.female ?? 0}</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Authority Persons Gender with Counts */}
            {partA?.authorityPersonsGender && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">4</span>
                  ഏത് കാറ്റഗറിയിൽ പെട്ടവരോട് ആണ് പെട്ടവരോട് സംസാരിച്ചവർ (✓ മാർക്ക് ചെയ്യുക)
                </label>
                <div className="space-y-3">
                  {authorityPersonsOptions.map((option) => {
                    const genderData = partA.authorityPersonsGender?.[option.key] || { male: false, female: false };
                    const countData = partA.authorityPersonsCounts?.[option.key] || { male: 0, female: 0 };
                    const hasSelection = genderData.male || genderData.female;
                    const hasCounts = (typeof countData.male === 'number' && countData.male > 0) || (typeof countData.female === 'number' && countData.female > 0);
                    
                    if (!hasSelection && !hasCounts) return null;
                    
                    return (
                      <div key={option.key} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="text-sm font-medium text-gray-900 mb-3">{option.label}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Male Section */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">ആൺ</label>
                            {(genderData.male || (typeof countData.male === 'number' && countData.male > 0)) ? (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-blue-800">✓ Selected</span>
                                  <span className="text-sm font-semibold text-blue-900">{typeof countData.male === 'number' ? countData.male : 0}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-400 text-sm">—</div>
                            )}
                          </div>
                          
                          {/* Female Section */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">പെൺ</label>
                            {(genderData.female || (typeof countData.female === 'number' && countData.female > 0)) ? (
                              <div className="bg-pink-50 border border-pink-200 rounded-lg px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-pink-800">✓ Selected</span>
                                  <span className="text-sm font-semibold text-pink-900">{typeof countData.female === 'number' ? countData.female : 0}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-400 text-sm">—</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Authority Other Text */}
            {partA?.authorityOtherText && partA.authorityOtherText.trim() !== '' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">5</span>
                  മറ്റുള്ളവ (വ്യക്തമാക്കുക)
                </label>
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{partA.authorityOtherText}</div>
              </div>
            )}
          </div>
        )}

        {/* Part B */}
        {partB && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-[#002349] mb-4">ഭാഗം B: പുതിയ അംഗങ്ങൾ</h3>
            
            {/* New JIH Members */}
            {partB?.newJIHMembers && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">6</span>
                  പുതുതായി പ്രതിവാരയോഗത്തിൽ വന്നവർ
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ആൺ</label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{partB.newJIHMembers.male ?? 0}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">പെൺ</label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{partB.newJIHMembers.female ?? 0}</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Member Categories with Gender and Counts */}
            {partB?.memberCategoriesGender && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">7</span>
                  ഏത് കാറ്റഗരിയിൽപെട്ടവരാണ് വന്നത് (✓ മാർക്ക് ചെയ്യുക)
                </label>
                <div className="space-y-3">
                  {memberCategoriesOptions.map((option) => {
                    const genderData = partB.memberCategoriesGender?.[option.key] || { male: false, female: false };
                    const countData = partB.memberCategoriesCounts?.[option.key] || { male: 0, female: 0 };
                    const hasSelection = genderData.male || genderData.female;
                    const hasCounts = (typeof countData.male === 'number' && countData.male > 0) || (typeof countData.female === 'number' && countData.female > 0);
                    
                    if (!hasSelection && !hasCounts) return null;
                    
                    return (
                      <div key={option.key} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="text-sm font-medium text-gray-900 mb-3">{option.label}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Male Section */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">ആൺ</label>
                            {(genderData.male || (typeof countData.male === 'number' && countData.male > 0)) ? (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-blue-800">✓ Selected</span>
                                  <span className="text-sm font-semibold text-blue-900">{typeof countData.male === 'number' ? countData.male : 0}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-400 text-sm">—</div>
                            )}
                          </div>
                          
                          {/* Female Section */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">പെൺ</label>
                            {(genderData.female || (typeof countData.female === 'number' && countData.female > 0)) ? (
                              <div className="bg-pink-50 border border-pink-200 rounded-lg px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-pink-800">✓ Selected</span>
                                  <span className="text-sm font-semibold text-pink-900">{typeof countData.female === 'number' ? countData.female : 0}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-400 text-sm">—</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Part C */}
        {partC && partC.publicMeetingAttendees && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-[#002349] mb-4">ഭാഗം C: പൊതുയോഗം</h3>
            
            {/* Public Meeting Attendees */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">8</span>
                പ്രതിമാസ പൊതുയോഗത്തിൽ വന്നവർ
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ആൺ</label>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{partC.publicMeetingAttendees.male ?? 0}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">പെൺ</label>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{partC.publicMeetingAttendees.female ?? 0}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Part D */}
        {partD && partD.growthAcceleration && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-[#002349] mb-4">ഭാഗം D: വർധനവ്</h3>
            
            {/* Growth Acceleration */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">9</span>
                റിപ്പോർട്ട് കാലയളവിലെ വർധനവ് രേഖപ്പെടുത്തുക
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Rukkun */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <label className="block text-sm font-medium text-gray-900 mb-3">റുക്ൻ</label>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">പുരുഷൻ</label>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-900 text-center text-base font-semibold">
                        {typeof partD.growthAcceleration.rukkun === 'object' 
                          ? (partD.growthAcceleration.rukkun?.male || 0)
                          : (partD.growthAcceleration.rukkun || 0)
                        }
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">സ്ത്രീ</label>
                      <div className="bg-pink-50 border border-pink-200 rounded-lg px-3 py-2 text-pink-900 text-center text-base font-semibold">
                        {typeof partD.growthAcceleration.rukkun === 'object' 
                          ? (partD.growthAcceleration.rukkun?.female || 0)
                          : 0
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Karkun */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <label className="block text-sm font-medium text-gray-900 mb-3">കാർകുൻ</label>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">പുരുഷൻ</label>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-900 text-center text-base font-semibold">
                        {typeof partD.growthAcceleration.karkun === 'object' 
                          ? (partD.growthAcceleration.karkun?.male || 0)
                          : (partD.growthAcceleration.karkun || 0)
                        }
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">സ്ത്രീ</label>
                      <div className="bg-pink-50 border border-pink-200 rounded-lg px-3 py-2 text-pink-900 text-center text-base font-semibold">
                        {typeof partD.growthAcceleration.karkun === 'object' 
                          ? (partD.growthAcceleration.karkun?.female || 0)
                          : 0
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Solidarity - display total only */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <label className="block text-sm font-medium text-gray-900 mb-3">സോളിഡാരിറ്റി</label>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">മൊത്തം</label>
                    <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-center text-base font-semibold">
                      {typeof partD.growthAcceleration.solidarity === 'object' 
                        ? ((partD.growthAcceleration.solidarity?.male || 0) + (partD.growthAcceleration.solidarity?.female || 0))
                        : (partD.growthAcceleration.solidarity || 0)
                      }
                    </div>
                  </div>
                </div>

                {/* SIO - display total only */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <label className="block text-sm font-medium text-gray-900 mb-3">SIO</label>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">മൊത്തം</label>
                    <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-center text-base font-semibold">
                      {typeof partD.growthAcceleration.sio === 'object' 
                        ? ((partD.growthAcceleration.sio?.male || 0) + (partD.growthAcceleration.sio?.female || 0))
                        : (partD.growthAcceleration.sio || 0)
                      }
                    </div>
                  </div>
                </div>

                {/* GIO - display total only */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <label className="block text-sm font-medium text-gray-900 mb-3">GIO</label>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">മൊത്തം</label>
                    <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-center text-base font-semibold">
                      {typeof partD.growthAcceleration.gio === 'object' 
                        ? ((partD.growthAcceleration.gio?.male || 0) + (partD.growthAcceleration.gio?.female || 0))
                        : (partD.growthAcceleration.gio || 0)
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const getSubmissionLevelIcon = (level) => {
    switch (level) {
      case 'district': return <Building className="w-4 h-4" />;
      case 'area': return <Users className="w-4 h-4" />;
      case 'unit': return <FileText className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getSubmissionLevelColor = (level) => {
    switch (level) {
      case 'district': return 'bg-blue-100 text-blue-800';
      case 'area': return 'bg-green-100 text-green-800';
      case 'unit': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Focus area options for district surveys
  const focusAreaOptions = [
    { key: 'newAreaExpansionWorkshop', label: 'പുതിയ ഏരിയ എക്സ്പാൻഷൻ വർക്ക്‌ഷോപ്പ്' },
    { key: 'workerTraining', label: 'വർക്കർ ട്രെയിനിംഗ്' },
    { key: 'newAreaAgendaPreparation', label: 'പുതിയ ഏരിയ അജണ്ട തയ്യാറാക്കൽ' },
    { key: 'fulltimeRecruitment', label: 'ഫുൾടൈം റിക്രൂട്ട്മെന്റ്' },
    { key: 'schoolGuardianClusterFormation', label: 'സ്കൂൾ ഗാർഡിയൻ ക്ലസ്റ്റർ രൂപീകരണം' },
    { key: 'reliefBeneficiaryDataCollection', label: 'റിലീഫ് ബെനിഫിഷറി ഡാറ്റ ശേഖരം' },
    { key: 'workerDeploymentToNewAreas', label: 'പുതിയ ഏരിയകളിലേക്ക് വർക്കർ നിയോഗം' },
    { key: 'weeklyMeetingEffectiveness', label: 'വാരാന്ത്യ മീറ്റിംഗിന്റെ ഫലപ്രാപ്തി' },
    { key: 'khatibUtilization', label: 'ഖതീബിന്റെ പ്രാപനം' },
    { key: 'madrasaMovementGrowthCalculation', label: 'മദ്റസ മൂവ്‌മെന്റ് വളർച്ച കണക്കാക്കൽ' },
    { key: 'schoolCenteredWork', label: 'സ്കൂൾ സെൻറർഡ് വർക്ക്' },
    { key: 'staffHalkaFormation', label: 'സ്റ്റാഫ് ഹൽഖ രൂപീകരണം' },
    { key: 'islamicCollegeAlumniDiscovery', label: 'ഇസ്‌ലാമിക് കോളേജ് അൽമ്നി കണ്ടെത്തൽ' },
    { key: 'quranStudyCenterWork', label: 'ഖുർആൻ സ്റ്റഡി സെൻറർ പ്രവർത്തനം' },
    { key: 'artsScienceCampusLeadership', label: 'ജില്ലയിലെ Arts & Science കോളജ് കാമ്പസില്‍ ഫ്രറ്റേണിറ്റി, SIO, GIO, സാനിധ്യം ഉറപ്പാക്കല്‍' },
    { key: 'hajjUmrahGroupDiscovery', label: 'ഹജ്ജ്/ഉംറ ഗ്രൂപ്പ് കണ്ടെത്തൽ' },
    { key: 'majorMuslimCenterStructure', label: 'പ്രധാന മുസ്ലിം കേന്ദ്ര ഘടന' },
    { key: 'weakAreaFinancialSupport', label: 'ബലഹീന ഏരിയകൾക്ക് സാമ്പത്തിക പിന്തുണ' },
    { key: 'qscTeacherOrientation', label: 'QSC ടീച്ചർ ഓറിയൻറേഷൻ' },
    { key: 'khatibOrientation', label: 'ഖതീബ് ഓറിയൻറേഷൻ' },
    { key: 'institutionBearingOrientation', label: 'ഇൻസ്റ്റിറ്റ്യൂഷൻ ബെയറിംഗ് ഓറിയൻറേഷൻ' },
    { key: 'selectedWorkerTraining', label: 'തിരഞ്ഞെടുത്ത വർക്കർ ട്രെയിനിംഗ്' }
  ];

  // Focus area options for area surveys (Part C - Expansion Activities)
  const areaFocusOptions = [
    { key: 'newAreaWorkshop', label: 'പുതിയ ഏരിയ വർക്ക്‌ഷോപ്പ്' },
    { key: 'workerTraining', label: 'വർക്കർ ട്രെയിനിംഗ്' },
    { key: 'newAreaAgenda', label: 'പുതിയ ഏരിയ അജണ്ട' },
    { key: 'fulltimeRecruitment', label: 'ഫുൾടൈം റിക്രൂട്ട്മെന്റ്' },
    { key: 'schoolGuardianCluster', label: 'സ്കൂൾ ഗാർഡിയൻ ക്ലസ്റ്റർ' },
    { key: 'reliefDataCollection', label: 'റിലീഫ് ഡേറ്റ ശേഖരണം' },
    { key: 'workerDeployment', label: 'വർക്കർ നിയോഗം' },
    { key: 'weeklyMeetingEffectiveness', label: 'വാരാന്ത്യ മീറ്റിംഗിന്റെ ഫലപ്രാപ്തി' },
    { key: 'hajjUmrahGroup', label: 'ഹജ്ജ്/ ഉംറ ഗ്രൂപ്പില്‍ പോയവരെ കണ്ടെത്തല്‍' },
    { key: 'artsScienceCampus', label: 'ഏരിയയിലെ Arts & Science കോളജ് കാമ്പസില്‍ ഫ്രറ്റേണിറ്റി, SIO, GIO, സാനിധ്യം ഉറപ്പാക്കല്‍' },
    { key: 'madrasaGrowthCalculation', label: 'മദ്റസ വളർച്ച കണക്കാക്കൽ' },
    { key: 'schoolCenteredWork', label: 'സ്കൂൾ സെൻറർഡ് വർക്ക്' },
    { key: 'staffHalkaFormation', label: 'സ്റ്റാഫ് ഹൽഖ രൂപീകരണം' },
    { key: 'islamicCollegeAlumni', label: 'ഇസ്‌ലാമിക് കോളേജ് അൽമ്നി' },
    { key: 'quranStudyCenterWork', label: 'ഖുർആൻ സ്റ്റഡി സെൻറർ പ്രവർത്തനം' }
  ];

  const filteredSurveys = surveys.filter(survey => {
    // Search filter
    const matchesSearch = !searchTerm || (
      survey.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.submittedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.submittedByName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.areaName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.unitName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.month?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Focus area filter (only for district level surveys)
    const matchesFocusArea = !focusAreaFilter || 
      (survey.submissionLevel === 'district' && survey.partB?.focusAreas?.[focusAreaFilter]);

    // Area focus filter (only for area level surveys)
    const matchesAreaFocus = !areaFocusFilter || 
      (survey.submissionLevel === 'area' && survey.partC?.expansionActivities?.[areaFocusFilter]);

    return matchesSearch && matchesFocusArea && matchesAreaFocus;
  });

  // Group surveys by submission level for stats
  const surveyStats = {
    district: surveys.filter(s => s.submissionLevel === 'district').length,
    area: surveys.filter(s => s.submissionLevel === 'area').length,
    unit: surveys.filter(s => s.submissionLevel === 'unit').length,
    total: surveys.length
  };

  // Since user is always district admin, use district-specific titles
  const getDashboardTitle = () => {
    return 'പ്രതിമാസ റിപ്പോർട്ടുകൾ';
  };

  const getDashboardSubtitle = () => {
    return `District: ${userData?.district || 'Unknown'}`;
  };

  // Removed getAvailableTabs function since we're not using tabs anymore

  // Render detail view if showing survey details
  if (showDetailView && viewingSurvey) {
    // For area level forms, use AreaSurveyDetailPage styling
    if (viewingSurvey.submissionLevel === 'area') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="hidden lg:block text-2xl lg:text-4xl font-bold text-[#002349] mb-2">ഏരിയ തലം റിപ്പോർട്ട്</h1>
              </div>
              <button
                onClick={() => {
                  setShowDetailView(false);
                  setViewingSurvey(null);
                }}
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-gray-600 border border-gray-300 rounded-xl hover:bg-gradient-to-r hover:from-gray-500 hover:to-gray-600 hover:text-white transition-all duration-300 hover:shadow-md"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto pt-4">
              {/* Survey Info - No container */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                    <div className="text-base font-semibold text-gray-900">{viewingSurvey.month || '—'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                    <div className="text-base font-semibold text-gray-900">{viewingSurvey.district || 'Unknown'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Area</label>
                    <div className="text-base font-semibold text-gray-900">{viewingSurvey.area || viewingSurvey.areaName || 'Unknown'}</div>
                  </div>
                </div>
              </div>

              {/* Survey Parts */}
              <div className="space-y-0">
                {viewingSurvey.partA && renderAreaPartA(viewingSurvey.partA)}
                {viewingSurvey.partB && renderAreaPartB(viewingSurvey.partB)}
                {viewingSurvey.partC && renderAreaPartC(viewingSurvey.partC)}
                {viewingSurvey.partD && renderAreaPartD(viewingSurvey.partD)}
                {viewingSurvey.partE && renderAreaPartE(viewingSurvey.partE)}
                {viewingSurvey.partF && renderAreaPartF(viewingSurvey.partF)}
              </div>
            </main>
          </div>
        </div>
      );
    }

    // For unit level forms, use UnitDashboardPage styling
    if (viewingSurvey.submissionLevel === 'unit') {
      return (
        <div className="min-h-screen mt-0">
          {/* Header */}
          <div className="max-w-5xl mx-auto ml-15 px-0 py-1">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h1 className="hidden lg:block text-2xl lg:text-4xl font-bold text-[#002349]">യൂണിറ്റ് റിപ്പോർട്ടുകളുടെ വിശദാംശങ്ങൾ</h1>
                <p className="text-sm text-gray-600 font-medium mt-1">
                  <span className="font-bold">{viewingSurvey.month}</span> {viewingSurvey.year} - {viewingSurvey.component || viewingSurvey.unitName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailView(false);
                  setViewingSurvey(null);
                }}
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-gray-600 border border-gray-300 rounded-xl hover:bg-gradient-to-r hover:from-gray-500 hover:to-gray-600 hover:text-white transition-all duration-300 hover:shadow-md -mr-4"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Survey Details */}
          <div className="max-w-5xl mx-auto px-8 sm:px-12 lg:px-16 py-2">
            <main>
              {/* Basic Information Container */}
              <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 p-4 md:p-6 mb-8">
                <h3 className="text-lg font-semibold text-[#002349] mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{viewingSurvey.district || '—'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Area</label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{viewingSurvey.area || viewingSurvey.areaName || '—'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Component</label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{viewingSurvey.component || viewingSurvey.unitName || '—'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{viewingSurvey.month || '—'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{viewingSurvey.year || '—'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Submitted At</label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">
                      {new Date(viewingSurvey.submittedAt).toLocaleDateString()} at{' '}
                      {new Date(viewingSurvey.submittedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Unit Details - render directly without container cards */}
              {renderUnitDetails(viewingSurvey)}
            </main>
          </div>
        </div>
      );
    }

    // For district level forms, use same styling as area and unit
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="hidden lg:block text-2xl lg:text-4xl font-bold text-[#002349] mb-2">ജില്ലാ തലം റിപ്പോർട്ട്</h1>
            </div>
            <button
              onClick={() => {
                setShowDetailView(false);
                setViewingSurvey(null);
              }}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-gray-600 border border-gray-300 rounded-xl hover:bg-gradient-to-r hover:from-gray-500 hover:to-gray-600 hover:text-white transition-all duration-300 hover:shadow-md"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Content */}
          <main className="max-w-4xl mx-auto pt-4">
            {/* Survey Info - No container */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <div className="text-base font-semibold text-gray-900">{viewingSurvey.month || '—'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                  <div className="text-base font-semibold text-gray-900">{viewingSurvey.district || 'Unknown'}</div>
                </div>
              </div>
            </div>

            {/* Complete Survey Details */}
            <div className="space-y-6">
              {viewingSurvey.submissionLevel === 'district' && (
                <>
                  {viewingSurvey.partA && renderDistrictPartA(viewingSurvey.partA)}
                  {viewingSurvey.partB && renderDistrictPartB(viewingSurvey.partB)}
                  {viewingSurvey.partC && renderDistrictPartC(viewingSurvey.partC)}
                  {viewingSurvey.partD && renderDistrictPartD(viewingSurvey.partD)}
                  {viewingSurvey.partE && renderDistrictPartE(viewingSurvey.partE)}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div>
          {/* MobileTopBar (rendered by the parent dashboard shell) already names this screen on mobile. */}
          <h1 className="hidden lg:block text-2xl lg:text-4xl font-bold text-[#002349]">
            {getDashboardTitle()}
          </h1>
          <p className="text-sm text-gray-600">
            District: <span className="font-semibold text-[#002349]">{userData?.district || 'Unknown'}</span>
          </p>
        </div>
        {canCreate && (
          <>
            <JihAddButton onClick={onCreateNew}>New District Report</JihAddButton>
            <JihFab onClick={onCreateNew} label="New District Report" />
          </>
        )}
      </div>

      <JihFilterBar
        className="mb-4"
        search={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Search reports..."
        activeFilterCount={[levelFilter, monthFilter, levelFilter === 'district' && focusAreaFilter, levelFilter === 'area' && areaFocusFilter].filter(Boolean).length}
        onClear={() => { setLevelFilter(''); setMonthFilter(''); setFocusAreaFilter(''); setAreaFocusFilter(''); }}
        gridClass="sm:grid-cols-3 lg:grid-cols-4"
      >
        <JihFilterSelect icon={Building} value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          <option value="">All Levels</option>
          <option value="district">District</option>
          <option value="area">Area</option>
          <option value="unit">Unit</option>
        </JihFilterSelect>
        <JihFilterSelect icon={Calendar} value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
          <option value="">All Months</option>
          {['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
        </JihFilterSelect>
        {levelFilter === 'district' && (
          <JihFilterSelect value={focusAreaFilter} onChange={(e) => setFocusAreaFilter(e.target.value)}>
            <option value="">All Focus Areas</option>
            {focusAreaOptions.map(option => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </JihFilterSelect>
        )}
        {levelFilter === 'area' && (
          <JihFilterSelect value={areaFocusFilter} onChange={(e) => setAreaFocusFilter(e.target.value)}>
            <option value="">All Focus Areas</option>
            {areaFocusOptions.map(option => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </JihFilterSelect>
        )}
      </JihFilterBar>

      {error && (
        <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-2xl p-3 animate-fade-in text-sm">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Surveys Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-500">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#002349]"></div>
              <span className="ml-2 text-gray-600 text-sm font-medium">Loading reports...</span>
            </div>
          ) : filteredSurveys.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-white border border-gray-300 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-[#002349] mb-1">No monthly reports found</h3>
              <p className="text-gray-600 mb-4 text-xs">
                No reports found. Create the first district reports to get started.
              </p>
              {canCreate && (
                <button
                  onClick={onCreateNew}
                  className="bg-[#957C3D] hover:bg-[#8A6F35] text-white px-4 py-2.5 sm:py-2 rounded-xl transition-all duration-300 text-xs font-semibold hover:shadow-md"
                >
                  Create District Report
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: roomy tappable rows — one full-width target per record */}
              <div className="lg:hidden divide-y divide-gray-100">
                {filteredSurveys.map((survey) => (
                  <div key={survey._id} className="min-h-[56px] flex items-center gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${getSubmissionLevelColor(
                            survey.submissionLevel
                          )} shadow-sm`}
                        >
                          {getSubmissionLevelIcon(survey.submissionLevel)}
                          <span className="ml-1 capitalize">{survey.submissionLevel}</span>
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#957C3D] text-white shadow-sm">
                          {survey.month}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-[#002349] break-words leading-snug mt-1">
                        {survey.submissionLevel === 'district' && survey.district}
                        {survey.submissionLevel === 'area' && (survey.areaName || survey.area || 'Unknown Area')}
                        {survey.submissionLevel === 'unit' && (survey.unitName || survey.component || 'Unknown Unit')}
                      </p>
                      {survey.submissionLevel === 'area' && (
                        <p className="text-[11px] text-gray-500">{survey.district}</p>
                      )}
                      {survey.submissionLevel === 'unit' && (
                        <p className="text-[11px] text-gray-500">
                          {survey.areaName || survey.area} • {survey.district}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {survey.submittedByName || survey.submittedBy} · {formatDate(survey.submittedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleViewSurvey(survey)}
                        className="text-[#002349] active:text-[#1a3a5c] p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {survey.submissionLevel === 'district' && canEdit && (
                        <button
                          onClick={() => handleEditSurvey(survey)}
                          className="text-[#957C3D] active:text-[#8A6F35] p-2 hover:bg-amber-50 rounded-lg transition-all duration-200"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="overflow-x-auto">
                <table className="hidden lg:table w-full text-sm">
                  <thead className="bg-[#002349] border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wide">
                        Level
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wide">
                        Location
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wide">
                        Month
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wide">
                        Submitted By
                      </th>
                      {/* Removed Population column per requirement */}
                      <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wide">
                        Submitted At
                      </th>
                      <th className="px-4 py-2 text-right text-[11px] font-semibold text-white uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredSurveys.map((survey, index) => (
                      <tr
                        key={survey._id}
                        className={`transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                        } hover:bg-blue-50/60`}
                      >
                        <td className="px-4 py-2 whitespace-nowrap align-middle">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${getSubmissionLevelColor(
                              survey.submissionLevel
                            )} shadow-sm`}
                          >
                            {getSubmissionLevelIcon(survey.submissionLevel)}
                            <span className="ml-1 capitalize">{survey.submissionLevel}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-900 align-middle">
                          {survey.submissionLevel === 'district' && (
                            <span className="font-medium">{survey.district}</span>
                          )}
                          {survey.submissionLevel === 'area' && (
                            <div>
                              <div className="font-semibold text-[#002349]">
                                {survey.areaName || survey.area || 'Unknown Area'}
                              </div>
                              <div className="text-[11px] text-gray-500">{survey.district}</div>
                            </div>
                          )}
                          {survey.submissionLevel === 'unit' && (
                            <div>
                              <div className="font-semibold text-[#002349]">
                                {survey.unitName || survey.component || 'Unknown Unit'}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {survey.areaName || survey.area} • {survey.district}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-600 align-middle">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#957C3D] text-white shadow-sm">
                            {survey.month}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-700 font-medium align-middle">
                          {survey.submittedByName || survey.submittedBy}
                        </td>
                        {/* Removed Population cell per requirement */}
                        <td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-600 align-middle">
                          {formatDate(survey.submittedAt)}
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap text-[13px] font-medium text-right align-middle">
                          <div className="inline-flex items-center space-x-2">
                            <button
                              onClick={() => handleViewSurvey(survey)}
                              className="text-[#002349] hover:text-[#1a3a5c] p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {survey.submissionLevel === 'district' && canEdit && (
                              <button
                                onClick={() => handleEditSurvey(survey)}
                                className="text-[#957C3D] hover:text-[#8A6F35] p-2 hover:bg-amber-50 rounded-lg transition-all duration-200"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-700 font-medium">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2.5 sm:py-1.5 border border-gray-300 rounded-xl text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#002349] hover:text-[#002349] hover:bg-gray-50 transition-all duration-200"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2.5 sm:py-1.5 border border-gray-300 rounded-xl text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#002349] hover:text-[#002349] hover:bg-gray-50 transition-all duration-200"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      {/* Delete Confirmation Modal - Only show for district surveys */}
      {canDelete && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSurveyToDelete(null);
          }}
          onConfirm={handleDelete}
          title="Delete Monthly Report"
          message={`Are you sure you want to delete the monthly report for ${surveyToDelete?.month} submitted by ${surveyToDelete?.submittedByName || surveyToDelete?.submittedBy}? This action cannot be undone.`}
          confirmText="Delete"
          confirmColor="red"
        />
      )}
    </>
  );
};

export default MonthlySurveyDashboard;
