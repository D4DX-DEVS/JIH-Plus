import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Check, X } from 'lucide-react';
import UnitPageA from '../components/forms/unit/UnitPageA';
import UnitPageB from '../components/forms/unit/UnitPageB';
import axios from 'axios';
import jihLogo from '../assets/LogoColor.png';
import { getAuthToken, isAdminUser } from '../utils/auth';
import UnitAdminSidebar from '../components/sidebars/UnitAdminSidebar';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import MobileTopBar from '../components/sidebars/MobileTopBar';

const UnitSurveyPage = ({ onBack, editingSurvey: editingSurveyProp = null }) => {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const editingSurveyState = location.state?.editingSurvey || null;
  const isAdminFromState = location.state?.isAdmin || false;
  const editingSurvey = editingSurveyProp || editingSurveyState;
  const isAdmin = isAdminFromState || isAdminUser();
  const [adminData, setAdminData] = useState(null);
  
  // Debug: Log component props
  console.log('=== UnitSurveyPage RENDER ===');
  console.log('editingSurvey prop:', editingSurvey);
  console.log('editingSurvey type:', typeof editingSurvey);
  console.log('=== END UnitSurveyPage RENDER DEBUG ===');
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    district: '',
    area: '',
    component: '',
    workers: {
      rukkun: '',
      karkun: '',
      activeAssociate: ''
    },
    partA: {
      codes: '',
      spokenPersons: {
        male: '',
        female: ''
      },
      authorityPersons: {
        qscStudent: false,
        regularKhutbaListener: false,
        prabodhanamReader: false,
        pfBeneficiary: false,
        bzBeneficiary: false,
        regionalReliefBeneficiary: false,
        interestFreeJusticeBeneficiary: false,
        sahitiyabandham: false,
        aaramamReader: false,
        tamheedulManhabStudent: false,
        institutionAlumni: false,
        neighborhoodGroupMember: false,
        friendshipForumMember: false,
        palliativeConnection: false,
        neighborhoodGroupMember2: false,
        friendsClubMember: false,
        mediaReader: false,
        ayathulDursalQuranStudent: false,
        heavensGuardian: false,
        schoolGuardian: false,
        arabicCollegeGuardian: false,
        arabicCollegeStudent: false,
        artsCollegeStudent: false,
        artsCollegeGuardian: false,
        publicCampusStudent: false,
        otherNGOs: false,
        mahalluConnection: false,
        fullTimeWorkerConnection: false
      }
    },
    partB: {
      newJIHMembers: {
        male: '',
        female: ''
      },
      memberCategories: {
        qscStudent: false,
        regularKhutbaListener: false,
        prabodhanamReader: false,
        pfBeneficiary: false,
        bzBeneficiary: false,
        regionalReliefBeneficiary: false,
        interestFreeJusticeBeneficiary: false,
        sahitiyabandham: false,
        aaramamReader: false,
        tamheedulManhabStudent: false,
        institutionAlumni: false,
        neighborhoodGroupMember: false,
        friendshipForumMember: false,
        palliativeConnection: false,
        neighborhoodGroupMember2: false,
        friendsClubMember: false,
        mediaReader: false,
        ayathulDursalQuranStudent: false,
        heavensGuardian: false,
        schoolGuardian: false,
        arabicCollegeGuardian: false,
        arabicCollegeStudent: false,
        artsCollegeStudent: false,
        artsCollegeGuardian: false,
        publicCampusStudent: false,
        otherNGOs: false,
        mahalluConnection: false,
        fullTimeWorkerConnection: false
      }
    },
    partC: {
      growthAcceleration: {
        rukkun: '',
        karkun: '',
        solidarity: '',
        sio: '',
        gio: '',
        teenIndia: '',
        malarvadi: ''
      }
    },
    month: '',
    year: new Date().getFullYear()
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unit, setUnit] = useState(null);
  const [area, setArea] = useState(null);
  
  useEffect(() => {
    if (isAdmin) {
      const storedAdminData = localStorage.getItem('adminData');
      if (storedAdminData) {
        setAdminData(JSON.parse(storedAdminData));
      }
    }
  }, [isAdmin]);

  // Debug: Monitor success state changes
  useEffect(() => {
    console.log('=== SUCCESS STATE CHANGED ===');
    console.log('New success state:', success);
    console.log('Success state type:', typeof success);
    console.log('Success state length:', success?.length);
    console.log('=== END SUCCESS STATE MONITOR ===');
  }, [success]);

  useEffect(() => {
    // Load unit and area data
    const loadUnitData = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const token = localStorage.getItem('userToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        if (userData?.areaId) {
          const unitsResp = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/user/hierarchy/units/${encodeURIComponent(userData.areaId)}`,
            { headers, timeout: 5000 }
          );
          
          const units = unitsResp.data?.data || [];
          const found = units.find(u => (u.id || u._id || u.code) == unitId);
          
          if (found) {
            setUnit({
              id: found.id || found._id || found.code,
              name: found.title || found.name || unitId
            });
          } else {
            setUnit({ 
              id: unitId, 
              name: userData?.unit || userData?.unitName || unitId 
            });
          }

          if (userData?.districtId) {
            const areasResp = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/user/hierarchy/areas/${encodeURIComponent(userData.districtId)}`,
              { headers, timeout: 5000 }
            );
            
            const areas = areasResp.data?.data || [];
            const areaFound = areas.find(a => (a.id || a._id || a.code) == userData.areaId);
            
            if (areaFound) {
              setArea({
                id: areaFound.id || areaFound._id || areaFound.code,
                name: areaFound.title || areaFound.name || userData.areaId
              });
            } else {
              if (userData?.area || userData?.areaName) {
                setArea({
                  id: userData.areaId,
                  name: userData.area || userData.areaName
                });
              }
            }
          }
        } else {
          const fallbackUnitName = userData?.unit || userData?.unitName || unitId;
          setUnit({ id: unitId, name: fallbackUnitName });
        }
      } catch (error) {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        setUnit({ id: unitId, name: userData?.unit || userData?.unitName || unitId });
      }
    };
    
    if (unitId) {
      loadUnitData();
    } else {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      setUnit({ id: userData.unitId, name: userData?.unit || userData?.unitName || '—' });
      if (userData?.area || userData?.areaName) {
        setArea({
          id: userData.areaId,
          name: userData.area || userData.areaName
        });
      }
    }
  }, [unitId]);

  useEffect(() => {
    // Auto-fill month
    const currentDate = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    setFormData(prev => ({
      ...prev,
      month: monthNames[currentDate.getMonth()]
    }));

    // Load editing survey data if provided
    if (editingSurvey) {
      console.log('=== UnitSurveyPage: Loading editing survey ===');
      console.log('editingSurvey:', editingSurvey);
      console.log('editingSurvey._id:', editingSurvey._id);
      console.log('editingSurvey keys:', Object.keys(editingSurvey));
      console.log('=== END UnitSurveyPage editing survey debug ===');
      
      setFormData(prev => {
        // Deep merge the editing survey data with proper structure
        const newFormData = {
          ...prev,
          // Basic fields
          district: editingSurvey.district || prev.district,
          area: editingSurvey.area || prev.area,
          component: editingSurvey.component || prev.component,
          month: editingSurvey.month || prev.month,
          year: editingSurvey.year || prev.year,
          
          // Workers data
          workers: {
            rukkun: editingSurvey.workers?.rukkun || 0,
            karkun: editingSurvey.workers?.karkun || 0,
            activeAssociate: editingSurvey.workers?.activeAssociate || 0
          },
          
          // Part A data with proper structure
          partA: {
            codes: editingSurvey.partA?.codes || '',
            spokenPersons: {
              male: editingSurvey.partA?.spokenPersons?.male || 0,
              female: editingSurvey.partA?.spokenPersons?.female || 0
            },
            authorityPersons: editingSurvey.partA?.authorityPersons || {},
            authorityPersonsGender: editingSurvey.partA?.authorityPersonsGender || {},
            authorityPersonsCounts: editingSurvey.partA?.authorityPersonsCounts || {},
            authorityGender: editingSurvey.partA?.authorityGender || { male: false, female: false },
            authorityOtherText: editingSurvey.partA?.authorityOtherText || ''
          },
          
          // Part B data with proper structure
          partB: {
            newJIHMembers: {
              male: editingSurvey.partB?.newJIHMembers?.male || 0,
              female: editingSurvey.partB?.newJIHMembers?.female || 0
            },
            memberCategories: editingSurvey.partB?.memberCategories || {},
            memberCategoriesGender: editingSurvey.partB?.memberCategoriesGender || {},
            memberCategoriesCounts: editingSurvey.partB?.memberCategoriesCounts || {}
          },
          
          // Part C data with proper structure
          partC: {
            publicMeetingAttendees: {
              male: editingSurvey.partC?.publicMeetingAttendees?.male || 0,
              female: editingSurvey.partC?.publicMeetingAttendees?.female || 0
            }
          },
          
          // Part D data with proper structure
          partD: {
            growthAcceleration: {
              rukkun: editingSurvey.partD?.growthAcceleration?.rukkun || 0,
              karkun: editingSurvey.partD?.growthAcceleration?.karkun || 0,
              solidarity: editingSurvey.partD?.growthAcceleration?.solidarity || 0,
              sio: editingSurvey.partD?.growthAcceleration?.sio || 0,
              gio: editingSurvey.partD?.growthAcceleration?.gio || 0
            }
          }
        };
        
        console.log('=== Setting formData for editing ===');
        console.log('Previous formData:', prev);
        console.log('Editing survey:', editingSurvey);
        console.log('Editing survey partA:', editingSurvey.partA);
        console.log('Editing survey authorityPersonsGender:', editingSurvey.partA?.authorityPersonsGender);
        console.log('Editing survey authorityPersonsCounts:', editingSurvey.partA?.authorityPersonsCounts);
        console.log('Editing survey memberCategoriesGender:', editingSurvey.partB?.memberCategoriesGender);
        console.log('Editing survey memberCategoriesCounts:', editingSurvey.partB?.memberCategoriesCounts);
        console.log('New formData:', newFormData);
        console.log('New formData partA:', newFormData.partA);
        console.log('New formData authorityPersonsGender:', newFormData.partA?.authorityPersonsGender);
        console.log('New formData authorityPersonsCounts:', newFormData.partA?.authorityPersonsCounts);
        console.log('New formData memberCategoriesCounts:', newFormData.partB?.memberCategoriesCounts);
        console.log('=== END setting formData debug ===');
        return newFormData;
      });
    }
  }, [editingSurvey]);

  const handleNext = (data) => {
    console.log('UnitSurveyPage handleNext - data received:', data);
    console.log('UnitSurveyPage handleNext - data.partA?.authorityPersonsCounts:', data.partA?.authorityPersonsCounts);
    console.log('UnitSurveyPage handleNext - data.partB?.memberCategoriesCounts:', data.partB?.memberCategoriesCounts);
    
    setFormData(prev => ({
      ...prev,
      ...data,
      // Ensure nested objects are properly merged
      workers: { ...prev.workers, ...data.workers },
      partA: {
        ...prev.partA,
        ...data.partA,
        spokenPersons: { ...prev.partA?.spokenPersons, ...data.partA?.spokenPersons },
        authorityPersons: { ...prev.partA?.authorityPersons, ...data.partA?.authorityPersons },
        authorityPersonsGender: { ...prev.partA?.authorityPersonsGender, ...data.partA?.authorityPersonsGender },
        authorityPersonsCounts: { ...prev.partA?.authorityPersonsCounts, ...data.partA?.authorityPersonsCounts }
      },
      partB: {
        ...prev.partB,
        ...data.partB,
        newJIHMembers: { ...prev.partB?.newJIHMembers, ...data.partB?.newJIHMembers },
        memberCategories: { ...prev.partB?.memberCategories, ...data.partB?.memberCategories },
        memberCategoriesGender: { ...prev.partB?.memberCategoriesGender, ...data.partB?.memberCategoriesGender },
        memberCategoriesCounts: { ...prev.partB?.memberCategoriesCounts, ...data.partB?.memberCategoriesCounts }
      },
      partC: {
        ...prev.partC,
        ...data.partC,
        growthAcceleration: { ...prev.partC?.growthAcceleration, ...data.partC?.growthAcceleration }
      }
    }));
    setCurrentStep(2);
  };

  const handlePrevious = (data) => {
    setFormData(prev => ({
      ...prev,
      ...data,
      // Ensure nested objects are properly merged
      workers: { ...prev.workers, ...data.workers },
      partA: {
        ...prev.partA,
        ...data.partA,
        spokenPersons: { ...prev.partA?.spokenPersons, ...data.partA?.spokenPersons },
        authorityPersons: { ...prev.partA?.authorityPersons, ...data.partA?.authorityPersons },
        authorityPersonsGender: { ...prev.partA?.authorityPersonsGender, ...data.partA?.authorityPersonsGender },
        authorityPersonsCounts: { ...prev.partA?.authorityPersonsCounts, ...data.partA?.authorityPersonsCounts }
      },
      partB: {
        ...prev.partB,
        ...data.partB,
        newJIHMembers: { ...prev.partB?.newJIHMembers, ...data.partB?.newJIHMembers },
        memberCategories: { ...prev.partB?.memberCategories, ...data.partB?.memberCategories },
        memberCategoriesGender: { ...prev.partB?.memberCategoriesGender, ...data.partB?.memberCategoriesGender },
        memberCategoriesCounts: { ...prev.partB?.memberCategoriesCounts, ...data.partB?.memberCategoriesCounts }
      },
      partC: {
        ...prev.partC,
        ...data.partC,
        growthAcceleration: { ...prev.partC?.growthAcceleration, ...data.partC?.growthAcceleration }
      }
    }));
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');

      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      // Ensure proper data structure before submission
      const currentDate = new Date();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      
      console.log('=== UnitSurveyPage handleSubmit ===');
      console.log('formData before submit:', formData);
      console.log('formData.partA?.authorityPersonsCounts:', formData.partA?.authorityPersonsCounts);
      console.log('formData.partB?.memberCategoriesCounts:', formData.partB?.memberCategoriesCounts);
      
      const submitData = {
        ...formData,
        month: formData.month || monthNames[currentDate.getMonth()],
        year: formData.year || currentDate.getFullYear(),
        // Ensure required fields are present
        district: formData.district || '',
        area: formData.area || '',
        component: formData.component || '',
        // Ensure partA has proper structure
        partA: {
          codes: formData.partA?.codes || '',
          spokenPersons: {
            male: formData.partA?.spokenPersons?.male || 0,
            female: formData.partA?.spokenPersons?.female || 0
          },
          authorityPersons: formData.partA?.authorityPersons || {},
          authorityPersonsGender: formData.partA?.authorityPersonsGender || {},
          authorityPersonsCounts: formData.partA?.authorityPersonsCounts || {},
          authorityGender: formData.partA?.authorityGender || { male: false, female: false },
          authorityOtherText: formData.partA?.authorityOtherText || ''
        },
        // Ensure partB has proper structure
        partB: {
          newJIHMembers: {
            male: formData.partB?.newJIHMembers?.male || 0,
            female: formData.partB?.newJIHMembers?.female || 0
          },
          memberCategories: formData.partB?.memberCategories || {},
          memberCategoriesGender: formData.partB?.memberCategoriesGender || {},
          memberCategoriesCounts: formData.partB?.memberCategoriesCounts || {}
        },
        // Ensure partC has proper structure
        partC: {
          publicMeetingAttendees: {
            male: formData.partC?.publicMeetingAttendees?.male || 0,
            female: formData.partC?.publicMeetingAttendees?.female || 0
          }
        },
        // Ensure partD has proper structure
        partD: {
          growthAcceleration: {
            rukkun: formData.partD?.growthAcceleration?.rukkun || 0,
            karkun: formData.partD?.growthAcceleration?.karkun || 0,
            solidarity: formData.partD?.growthAcceleration?.solidarity || 0,
            sio: formData.partD?.growthAcceleration?.sio || 0,
            gio: formData.partD?.growthAcceleration?.gio || 0
          }
        }
      };

      // Debug: Log the data being submitted
      console.log('=== SUBMISSION DEBUG ===');
      console.log('Full formData:', formData);
      console.log('formData.partA.authorityPersonsGender:', formData.partA?.authorityPersonsGender);
      console.log('formData.partA.authorityPersonsCounts:', formData.partA?.authorityPersonsCounts);
      console.log('formData.partB.memberCategoriesGender:', formData.partB?.memberCategoriesGender);
      console.log('formData.partB.memberCategoriesCounts:', formData.partB?.memberCategoriesCounts);
      console.log('submitData.partA.authorityPersonsGender:', submitData.partA.authorityPersonsGender);
      console.log('submitData.partA.authorityPersonsCounts:', submitData.partA.authorityPersonsCounts);
      console.log('submitData.partB.memberCategoriesGender:', submitData.partB.memberCategoriesGender);
      console.log('submitData.partB.memberCategoriesCounts:', submitData.partB.memberCategoriesCounts);
      
      // Debug specific counts for each category
      console.log('=== SPECIFIC COUNTS DEBUG ===');
      if (submitData.partA?.authorityPersonsCounts) {
        Object.entries(submitData.partA.authorityPersonsCounts).forEach(([key, counts]) => {
          console.log(`Authority Person ${key}:`, counts);
        });
      }
      if (submitData.partB?.memberCategoriesCounts) {
        Object.entries(submitData.partB.memberCategoriesCounts).forEach(([key, counts]) => {
          console.log(`Member Category ${key}:`, counts);
        });
      }
      console.log('submitData.year:', submitData.year);
      console.log('Full submitData:', submitData);
      console.log('partA:', submitData.partA);
      console.log('partA.spokenPersons:', submitData.partA?.spokenPersons);
      console.log('partA.spokenPersons type:', typeof submitData.partA?.spokenPersons);
      console.log('partB:', submitData.partB);
      console.log('partC:', submitData.partC);
      console.log('partC.growthAcceleration:', submitData.partC?.growthAcceleration);
      console.log('partC.growthAcceleration type:', typeof submitData.partC?.growthAcceleration);
      console.log('=== END DEBUG ===');

      // Debug: Log editing survey info
      console.log('=== EDIT SUBMISSION DEBUG ===');
      console.log('editingSurvey:', editingSurvey);
      console.log('editingSurvey._id:', editingSurvey?._id);
      console.log('submitData:', submitData);
      console.log('=== END EDIT DEBUG ===');

      let response;
      if (editingSurvey && editingSurvey._id) {
        // Update existing survey
        console.log('Updating existing survey with ID:', editingSurvey._id);
        console.log('PUT URL:', `${import.meta.env.VITE_API_URL}/api/unit/unit-survey/${editingSurvey._id}`);
        console.log('Headers:', headers);
        console.log('Submit Data:', submitData);
        
        try {
        // Use admin endpoint if user is admin, otherwise use regular endpoint
        const putEndpoint = isAdminUser() 
          ? `${import.meta.env.VITE_API_URL}/api/admin/unit-surveys/${editingSurvey._id}`
          : `${import.meta.env.VITE_API_URL}/api/unit/unit-survey/${editingSurvey._id}`;
          
        response = await axios.put(putEndpoint, submitData, { headers });
          console.log('PUT response:', response);
        } catch (putError) {
          console.error('PUT request failed:', putError);
          console.error('PUT error response:', putError.response);
          throw putError;
        }
      } else {
        // Create new survey
        console.log('Creating new report');
        // Use admin endpoint if user is admin, otherwise use regular endpoint
        const endpoint = isAdminUser() 
          ? `${import.meta.env.VITE_API_URL}/api/admin/unit-surveys`
          : `${import.meta.env.VITE_API_URL}/api/unit/unit-survey`;
          
        response = await axios.post(endpoint, submitData, { headers });
      }

      const successMessage = editingSurvey ? 'യൂണിറ്റ് റിപ്പോർട്ട് വിജയകരമായി അപ്ഡേറ്റ് ചെയ്തു!' : 'യൂണിറ്റ് റിപ്പോർട്ട് വിജയകരമായി സബ്മിറ്റ് ചെയ്തു!';
      
      console.log('=== SUCCESS MESSAGE SET ===');
      console.log('Success message:', successMessage);
      console.log('Editing survey:', editingSurvey);
      console.log('=== END SUCCESS DEBUG ===');
      
      setSuccess(successMessage);
      console.log('=== SUCCESS STATE SET ===');
      console.log('Success message set to:', successMessage);
      console.log('=== END SUCCESS STATE DEBUG ===');
      
      // Alert removed - using success modal instead
      
      // Redirect after a longer delay to allow user to see the success message
      setTimeout(() => {
        console.log('=== REDIRECTING AFTER SUCCESS ===');
        console.log('onBack function exists:', !!onBack);
        console.log('unitId:', unitId);
        console.log('=== END REDIRECT DEBUG ===');
        
        // Admins should always go to admin dashboard monthly tab
        if (isAdminUser() || isAdmin) {
          navigate('/admin-dashboard', { state: { activeTab: 'monthly' } });
        } else if (onBack) {
          onBack();
        } else {
          navigate(`/unit-dashboard/${unitId}`);
        }
      }, 3000);

    } catch (error) {
      console.error('Report submission error:', error);
      setError(error.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (isAdmin) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      navigate('/', { replace: true });
      return;
    }
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    navigate('/', { replace: true });
  };

  const handleSidebarNavigate = (tabId) => {
    setIsSidebarOpen(false);

    if (isAdmin) {
      if (tabId === 'yearly' || tabId === 'monthly' || tabId === 'stats') {
        navigate('/admin-dashboard', { state: { activeTab: tabId } });
      } else if (tabId === 'notifications') {
        navigate('/notifications');
      } else if (tabId === 'view-reports') {
        navigate('/view-reports');
      } else if (tabId === 'membership') {
        navigate('/membership', { state: { roleHint: 'admin' } });
      }
      return;
    }

    if (tabId === 'monthly') {
      navigate(`/unit-dashboard/${unitId}`);
    } else if (tabId === 'stats') {
      navigate(`/unit-dashboard/${unitId}`, { state: { initialTab: 'stats' } });
    } else if (tabId === 'membership') {
      navigate('/membership', { state: { roleHint: 'unit' } });
    }
  };

  const handleClose = () => {
    if (isAdmin) {
      navigate('/admin-dashboard', { state: { activeTab: 'monthly' } });
      return;
    }
    if (onBack) {
      onBack();
    } else {
      navigate(`/unit-dashboard/${unitId}`);
    }
  };

  const renderCurrentStep = () => {
    console.log('=== renderCurrentStep DEBUG ===');
    console.log('currentStep:', currentStep);
    console.log('formData:', formData);
    console.log('editingSurvey:', editingSurvey);
    console.log('=== END renderCurrentStep DEBUG ===');
    
    switch (currentStep) {
      case 1:
        return (
          <UnitPageA
            onNext={handleNext}
            formData={formData}
            setFormData={setFormData}
          />
        );
      case 2:
        return (
          <UnitPageB
            onNext={handleSubmit}
            onPrevious={handlePrevious}
            formData={formData}
            setFormData={setFormData}
          />
        );
      default:
        return null;
    }
  };

  const sidebarElement = isAdmin ? (
    <AdminSidebar
      activeTab="monthly"
      onTabChange={handleSidebarNavigate}
      onNavigateToReports={() => navigate('/view-reports')}
      onDownloadCSV={() => {}}
      onNavigateToNotifications={() => navigate('/notifications')}
      onNavigateToMembership={() => navigate('/membership', { state: { roleHint: 'admin' } })}
      onLogout={handleLogout}
      adminEmail={adminData?.email || 'Admin'}
      totalForms={0}
      totalSurveys={0}
      isMobileOpen={isSidebarOpen}
      onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
    />
  ) : (
    <UnitAdminSidebar
      activeTab="monthly"
      onNavigate={handleSidebarNavigate}
      onLogout={handleLogout}
      onNotifications={() => navigate('/notifications')}
      onDynamicReports={() => navigate('/user-reports')}
      onNavigateToMembership={() => navigate('/membership', { state: { roleHint: 'unit' } })}
      unitName={unit?.name || '—'}
      areaName={area?.name || ''}
      isMobileOpen={isSidebarOpen}
      onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
    />
  );

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
      {sidebarElement}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar
          title="യൂണിറ്റ് റിപ്പോർട്ട്"
        />

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-4">
          {/* Header with Close Button on same horizontal level */}
          <div className="mb-6 flex items-start justify-between">
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-[#002349]">
              {editingSurvey ? 'യൂണിറ്റ് തലം പ്രതിമാസ റിപ്പോർട്ട് എഡിറ്റ്' : 'യൂണിറ്റ് തലം പ്രതിമാസ റിപ്പോർട്ട്'}
            </h1>
            {/* Close Button - Top Right */}
            <button
              onClick={handleClose}
              className="text-gray-600 hover:text-[#002349] transition-all duration-500 flex items-center justify-center w-10 h-10 border border-gray-300 hover:border-[#002349] rounded-full hover:shadow-md transform hover:-translate-y-1 hover:scale-105 ease-out hover:bg-gradient-to-br hover:from-[#002349]/5 hover:to-[#002349]/10"
              title="Close and return to monthly reports"
            >
              <X className="w-5 h-5" />
            </button>
              </div>
              
          {/* Month-Year Selection and Progress Indicator - Same Horizontal Level */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            {/* Month-Year Selection - Left Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-[#002349] mb-2">Month</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent transition-all duration-300 hover:border-[#002349]/50 font-medium"
                >
                  <option value="">Select Month</option>
                  {['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[#002349] mb-2">Year</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent transition-all duration-300 hover:border-[#002349]/50 font-medium"
                  min="2020"
                  max="2030"
                />
              </div>
            </div>

            {/* Progress Indicator - Right Side */}
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 transition-all duration-300 ${currentStep >= 1 ? 'text-[#002349]' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shadow-md transition-all duration-500 ${
                  currentStep >= 1 ? 'bg-gradient-to-br from-[#002349] to-[#1a3a5c] text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  1
                </div>
                <span className="text-sm font-semibold">Unit Page A</span>
              </div>
              
              <div className={`w-8 h-0.5 rounded-full transition-all duration-500 ${currentStep >= 2 ? 'bg-[#002349] shadow-md' : 'bg-gray-200'}`}></div>
              
              <div className={`flex items-center space-x-2 transition-all duration-300 ${currentStep >= 2 ? 'text-[#002349]' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shadow-md transition-all duration-500 ${
                  currentStep >= 2 ? 'bg-gradient-to-br from-[#002349] to-[#1a3a5c] text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  2
                </div>
                <span className="text-sm font-semibold">Unit Page B</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto">
            {/* Form Content - Removed container wrapper since UnitPageA/UnitPageB have their own */}
            {renderCurrentStep()}

            {/* Messages */}
            {error && (
              <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                <p className="text-red-600 text-sm font-semibold">{error}</p>
              </div>
            )}

            {success && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[9999]" style={{zIndex: 9999}}>
                {/* Debug: Log success modal rendering */}
                {console.log('=== SUCCESS MODAL RENDERING ===', success)}
                <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4 border-4 border-green-500 animate-scale-in">
                  <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 mb-6 shadow-lg animate-bounce-once">
                      <Check className="h-10 w-10 text-white" />
                    </div>
                    <p className="text-xl text-green-700 font-bold mb-6">{success}</p>
                    <p className="text-sm text-gray-600 font-medium mb-6">കുറച്ച് സെക്കൻഡുകൾക്കുള്ളിൽ ഡാഷ്ബോർഡിലേക്ക് തിരിച്ചുപോകും...</p>
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-[#002349]"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-6 flex items-center space-x-3 shadow-2xl border border-gray-200">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#002349]"></div>
                  <span className="text-gray-700 font-semibold">
                    {editingSurvey ? 'റിപ്പോർട്ട് അപ്ഡേറ്റ് ചെയ്യുന്നു...' : 'റിപ്പോർട്ട് സബ്മിറ്റ് ചെയ്യുന്നു...'}
                  </span>
                </div>
              </div>
            )}

            {/* Custom CSS Animations */}
            <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInDelay {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes bounceOnce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-fade-in-delay {
          animation: fadeInDelay 0.8s ease-out 0.2s both;
        }

        .animate-slide-in-left {
          animation: slideInLeft 0.6s ease-out;
        }

        .animate-slide-in-right {
          animation: slideInRight 0.6s ease-out 0.2s both;
        }

        .animate-slide-in-up {
          animation: slideInUp 0.6s ease-out 0.3s both;
        }

        .animate-scale-in {
          animation: scaleIn 0.5s ease-out;
        }

        .animate-bounce-once {
          animation: bounceOnce 1s ease-out;
        }
      `}</style>
          </main>
        </div>
      </div>
    </div>
  );
};

export default UnitSurveyPage;