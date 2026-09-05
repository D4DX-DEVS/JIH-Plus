
import React, { useState, useEffect } from 'react';
import { FileText, Calendar, User, Edit, Trash2, Download } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import { downloadSingleFormPDF } from '../utils/pdfGenerator.jsx';

const FormDetailPage = ({ formId, formData, onBack, onEdit, onDelete, isAdmin = false }) => {
  const [form, setForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadFormDetails();
  }, [formId]);

  const loadFormDetails = async () => {
    try {
      const token = isAdmin ? localStorage.getItem('adminToken') : localStorage.getItem('userToken');
      const endpoint = isAdmin ? `/api/admin/forms/${formId}` : `/api/user/forms/${formId}`;
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setForm(response.data.form);
    } catch (error) {
      console.error('Error loading form details:', error);
      setError('Failed to load form details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      const token = isAdmin ? localStorage.getItem('adminToken') : localStorage.getItem('userToken');
      const endpoint = isAdmin ? `/api/admin/forms/${formId}` : `/api/user/forms/${formId}`;

      await axios.delete(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      toast.success('Form deleted successfully');
      setShowDeleteModal(false);
      onDelete();
    } catch (error) {
      console.error('Error deleting form:', error);
      setError('Failed to delete form');
      toast.error('Failed to delete form');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!form) return;
    
    try {
      setIsDownloading(true);
      await downloadSingleFormPDF(form);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002349] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">ഫോം വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md shadow-lg">
            <p className="text-red-600 mb-6 font-semibold">{error}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => { setError(''); setIsLoading(true); loadFormDetails(); }}
                className="min-h-[44px] bg-[#957C3D] hover:bg-[#8A6F35] text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-500 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out"
              >
                വീണ്ടും ശ്രമിക്കുക
              </button>
              <button
                onClick={onBack}
                className="min-h-[44px] bg-[#002349] hover:bg-[#1a3a5c] text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-500 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out"
              >
                തിരികെ പോകുക
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-[60vh] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-8 max-w-md shadow-lg">
            <p className="text-yellow-700 mb-6 font-semibold">ഫോം കണ്ടെത്തിയില്ല</p>
            <button
              onClick={onBack}
              className="bg-[#002349] hover:bg-[#1a3a5c] text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-500 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderPartA = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6 hover:shadow-xl transition-all duration-500">
      <h3 className="text-lg font-bold text-[#002349] mb-6">ഭാഗം-എ (പൊതു വിവരങ്ങൾ)</h3>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <h4 className="font-semibold text-[#002349] mb-4">ജനസംഖ്യാ സ്ഥിതിവിവരങ്ങൾ</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 bg-white rounded-xl">
              <span className="text-gray-600 text-sm font-medium">ആകെ ജനസംഖ്യ:</span>
              <span className="font-bold text-[#957C3D]">{form.partA?.totalPopulation?.toLocaleString() || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded-xl">
              <span className="text-gray-600 text-sm font-medium">മുസ്ലിം ശതമാനം:</span>
              <span className="font-bold text-gray-700">{form.partA?.muslimPercentage || 'N/A'}%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded-xl">
              <span className="text-gray-600 text-sm font-medium">ഹിന്ദു ശതമാനം:</span>
              <span className="font-bold text-gray-700">{form.partA?.hinduPercentage || 'N/A'}%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded-xl">
              <span className="text-gray-600 text-sm font-medium">ക്രിസ്ത്യൻ ശതമാനം:</span>
              <span className="font-bold text-gray-700">{form.partA?.christianPercentage || 'N/A'}%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded-xl">
              <span className="text-gray-600 text-sm font-medium">മറ്റുള്ളവർ ശതമാനം:</span>
              <span className="font-bold text-gray-700">{form.partA?.othersPercentage || 'N/A'}%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded-xl">
              <span className="text-gray-600 text-sm font-medium">പ്രസ്ഥാന ശതമാനം:</span>
              <span className="font-bold text-gray-700">{form.partA?.movementPercentage || 'N/A'}%</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <h4 className="font-semibold text-[#002349] mb-4">സംഘടനാ സ്ഥാനങ്ങൾ</h4>
          <div className="space-y-3">
            <div className="p-2 bg-white rounded-xl">
              <span className="text-gray-600 text-sm font-medium">മത സംഘടനകളിൽ ഭൂരിപക്ഷം:</span>
              <p className="font-bold text-[#002349] mt-1">{form.partA?.majorityInReligiousOrganizations || 'N/A'}</p>
            </div>
            <div className="p-2 bg-white rounded-xl">
              <span className="text-gray-600 text-sm font-medium">രണ്ടാം സ്ഥാനം:</span>
              <p className="font-bold text-gray-700 mt-1">{form.partA?.secondPosition || 'N/A'}</p>
            </div>
            <div className="p-2 bg-white rounded-xl">
              <span className="text-gray-600 text-sm font-medium">മൂന്നാം സ്ഥാനം:</span>
              <p className="font-bold text-gray-700 mt-1">{form.partA?.thirdPosition || 'N/A'}</p>
            </div>
            <div className="p-2 bg-white rounded-xl">
              <span className="text-gray-600 text-sm font-medium">നമ്മുടെ സ്ഥാനം:</span>
              <p className="font-bold text-gray-700 mt-1">{form.partA?.ourPosition || 'N/A'}</p>
            </div>
            <div className="p-2 bg-white rounded-xl">
              <span className="text-gray-600 text-sm font-medium">കൂടുതൽ രാഷ്ട്രീയ സ്വാധീനം:</span>
              <p className="font-bold text-gray-700 mt-1">{form.partA?.morePoliticalInfluence || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPartB = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6 hover:shadow-xl transition-all duration-500">
      <h3 className="text-lg font-bold text-[#002349] mb-6">ഭാഗം-ബി (സംഘടനാ സംവിധാനങ്ങൾ)</h3>
      
      {/* Organizations */}
      <div className="mb-6">
        <h4 className="font-semibold text-[#002349] mb-4">സംഘടനകൾ</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(form.partB?.organizations || {}).map(([orgName, orgData]) => (
            <div key={orgName} className="border border-gray-200 rounded-2xl p-4 bg-gray-50 hover:shadow-md transition-all duration-300">
              <h5 className="font-semibold text-[#002349] mb-3 capitalize">{orgName}</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-white rounded-xl">
                  <span className="text-gray-600 font-medium">ആകെ മേഖലകൾ:</span>
                  <span className="font-bold text-[#957C3D]">{orgData.totalAreas || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-xl">
                  <span className="text-gray-600 font-medium">ഘടകങ്ങൾ:</span>
                  <span className="font-bold text-gray-700">{orgData.components || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-xl">
                  <span className="text-gray-600 font-medium">പ്രവർത്തകർ 2023:</span>
                  <span className="font-bold text-gray-700">{orgData.workers2023 || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-xl">
                  <span className="text-gray-600 font-medium">പ്രവർത്തകർ 2025:</span>
                  <span className="font-bold text-gray-700">{orgData.workers2025 || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Educational Institutions */}
      <div className="mb-6">
        <h4 className="font-semibold text-[#002349] mb-4">വിദ്യാഭ്യാസ സ്ഥാപനങ്ങൾ</h4>
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="ih-table-compact w-full min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 border border-gray-200 px-4 py-3 text-left font-semibold text-[#002349]">വിവരങ്ങൾ</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-[#002349]">എണ്ണം</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-[#002349]">കുട്ടികളുടെ എണ്ണം</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-[#002349]" colSpan="2">Staff</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-[#002349]" colSpan="2">Non Teaching Staff</th>
              </tr>
              <tr className="bg-gray-100">
                <th className="sticky left-0 z-10 bg-gray-100 border border-gray-200 px-4 py-3 text-left font-medium text-gray-600"></th>
                <th className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-600"></th>
                <th className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-600"></th>
                <th className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-600">പ്രവർത്തകർ</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-600">മറ്റുള്ളവർ</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-600">പ്രവർത്തകർ</th>
                <th className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-600">മറ്റുള്ളവർ</th>
              </tr>
            </thead>
            <tbody>
              {/* Madrasas */}
              <tr className="hover:bg-gray-50 transition-colors duration-300">
                <td className="sticky left-0 z-10 bg-white border border-gray-200 px-4 py-3 font-semibold text-gray-700">9. മദ്റസകളുടെ എണ്ണം</td>
                <td className="border border-gray-200 px-4 py-3 text-center font-bold text-[#957C3D]">{form.partB?.institutions?.madrasas?.count || 0}</td>
                <td className="border border-gray-200 px-4 py-3 text-center font-bold text-gray-700">{form.partB?.institutions?.madrasas?.studentsCount || 0}</td>
                <td className="border border-gray-200 px-4 py-3 text-center font-bold text-gray-700">{form.partB?.institutions?.madrasas?.staffWorkers || 0}</td>
                <td className="border border-gray-200 px-4 py-3 text-center font-bold text-gray-700">{form.partB?.institutions?.madrasas?.staffOthers || 0}</td>
                <td className="border border-gray-200 px-4 py-3 text-center font-bold text-gray-700">{form.partB?.institutions?.madrasas?.nonTeachingWorkers || 0}</td>
                <td className="border border-gray-200 px-4 py-3 text-center font-bold text-gray-700">{form.partB?.institutions?.madrasas?.nonTeachingOthers || 0}</td>
              </tr>
              
              {/* Schools */}
              <tr>
                <td className="sticky left-0 z-10 bg-white border border-gray-300 px-4 py-3 font-medium">10. സ്കൂളുകൾ (വിദ്യാകൗൺസിൽ)</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.schools?.count || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.schools?.studentsCount || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.schools?.staffWorkers || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.schools?.staffOthers || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.schools?.nonTeachingWorkers || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.schools?.nonTeachingOthers || 0}</td>
              </tr>
              
              {/* Heavens */}
              <tr>
                <td className="sticky left-0 z-10 bg-white border border-gray-300 px-4 py-3 font-medium">11. ഹെവൻസ്</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.heavens?.count || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.heavens?.studentsCount || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.heavens?.staffWorkers || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.heavens?.staffOthers || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.heavens?.nonTeachingWorkers || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.heavens?.nonTeachingOthers || 0}</td>
              </tr>
              
              {/* Arabic Colleges */}
              <tr>
                <td className="sticky left-0 z-10 bg-white border border-gray-300 px-4 py-3 font-medium">12. അറബി കോളേജുകൾ</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.arabicColleges?.count || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.arabicColleges?.studentsCount || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.arabicColleges?.staffWorkers || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.arabicColleges?.staffOthers || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.arabicColleges?.nonTeachingWorkers || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.arabicColleges?.nonTeachingOthers || 0}</td>
              </tr>
              
              {/* Arts Colleges */}
              <tr>
                <td className="sticky left-0 z-10 bg-white border border-gray-300 px-4 py-3 font-medium">13. ആർട്സ് കോളേജുകൾ</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.artsColleges?.count || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.artsColleges?.studentsCount || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.artsColleges?.staffWorkers || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.artsColleges?.staffOthers || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.artsColleges?.nonTeachingWorkers || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.artsColleges?.nonTeachingOthers || 0}</td>
              </tr>
              
              {/* Main Campuses */}
              <tr>
                <td className="sticky left-0 z-10 bg-white border border-gray-300 px-4 py-3 font-medium">14. പ്രധാന കാമ്പസുകൾ (SIO, GIO സാന്നിധ്യമുള്ളത്)</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.mainCampuses?.count || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{form.partB?.institutions?.mainCampuses?.studentsCount || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-center bg-gray-100">-</td>
                <td className="border border-gray-300 px-4 py-3 text-center bg-gray-100">-</td>
                <td className="border border-gray-300 px-4 py-3 text-center bg-gray-100">-</td>
                <td className="border border-gray-300 px-4 py-3 text-center bg-gray-100">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

        {/* Other Part B Data */}
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">തൗഹീദ് & മറാഅ്</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">നിലവിലുള്ളത്:</span>
                <span>{form.partB?.thawheedMaraa?.existing || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">വിദ്യാർത്ഥികൾ:</span>
                <span>{form.partB?.thawheedMaraa?.students || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">പ്രവർത്തകരല്ലാത്തവർ:</span>
                <span>{form.partB?.thawheedMaraa?.nonWorkers || 0}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-3">QSC (പുരുഷന്മാർ)</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">നിലവിലുള്ളത്:</span>
                <span>{form.partB?.qscMen?.existing || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">വിദ്യാർത്ഥികൾ:</span>
                <span>{form.partB?.qscMen?.students || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">പ്രവർത്തകരല്ലാത്തവർ:</span>
                <span>{form.partB?.qscMen?.nonWorkers || 0}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-3">QSC (വനിത)</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">നിലവിലുള്ളത്:</span>
                <span>{form.partB?.qscWomen?.existing || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">വിദ്യാർത്ഥികൾ:</span>
                <span>{form.partB?.qscWomen?.students || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">പ്രവർത്തകരല്ലാത്തവർ:</span>
                <span>{form.partB?.qscWomen?.nonWorkers || 0}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="font-medium text-gray-700 mb-3">ജുമാ പള്ളികൾ</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-600">എണ്ണം:</span>
              <span>{form.partB?.jumaMosques?.count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ശരാശരി പങ്കെടുക്കുന്നവർ:</span>
              <span>{form.partB?.jumaMosques?.averageAttendees || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">പ്രവർത്തകരല്ലാത്തവർ (ഏകദേശം):</span>
              <span>{form.partB?.jumaMosques?.nonWorkersApprox || 0}</span>
            </div>
          </div>
        </div>
    </div>
  );

  const renderPartC = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6 hover:shadow-xl transition-all duration-500">
      <h3 className="text-lg font-bold text-[#002349] mb-6">ഭാഗം-സി (പൊതുവേദികൾ)</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(form.partC || {}).map(([platformName, platformData]) => (
          <div key={platformName} className="border border-gray-200 rounded-2xl p-4 bg-gray-50 hover:shadow-md transition-all duration-300">
            <h5 className="font-semibold text-[#002349] mb-3 capitalize">{platformName.replace(/([A-Z])/g, ' $1').trim()}</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white rounded-xl">
                <span className="text-gray-600 font-medium">എണ്ണം:</span>
                <span className="font-bold text-[#957C3D]">{platformData.count || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-xl">
                <span className="text-gray-600 font-medium">സഹകരിക്കുന്ന മറ്റുള്ളവർ:</span>
                <span className="font-bold text-gray-700">{platformData.cooperatingOthers || 0}</span>
              </div>
              {platformData.remarks && (
                <div className="p-2 bg-white rounded-xl">
                  <span className="text-gray-600 font-medium">അഭിപ്രായങ്ങൾ:</span>
                  <p className="text-sm mt-1 text-gray-700">{platformData.remarks}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPartD = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6 hover:shadow-xl transition-all duration-500">
      <h3 className="text-lg font-bold text-[#002349] mb-6">ഭാഗം-ഡി (പൊതുസംവിധാനങ്ങൾ)</h3>
      <div className="space-y-4">
        {/* Interest Free Systems */}
        <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50 hover:shadow-md transition-all duration-300">
          <h4 className="font-semibold text-[#002349] mb-4">1. പലിശരഹിത സംവിധാനം</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-2 bg-white rounded-xl">
              <span className="text-gray-600 font-medium">എണ്ണം:</span>
              <span className="font-bold text-[#957C3D]">{form.partD?.interestFreeSystems?.count || 0}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded-xl">
              <span className="text-gray-600 font-medium">കഴിഞ്ഞ മൂന്ന് വർഷത്തിനിടയിൽ സഹായം സ്വീകരിച്ച മറ്റുള്ളവരുടെ എണ്ണം:</span>
              <span className="font-bold text-gray-700">{form.partD?.interestFreeSystems?.beneficiariesLast3Years || 0}</span>
            </div>
          </div>
        </div>

        {/* Zakat Committee */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">2. സകാത്ത് കമ്മറ്റി</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-600">എണ്ണം:</span>
              <span className="font-medium">{form.partD?.zakatCommittee?.count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">കഴിഞ്ഞ മൂന്ന് വർഷത്തിനിടയിൽ സഹായം സ്വീകരിച്ച മറ്റുള്ളവരുടെ എണ്ണം:</span>
              <span className="font-medium">{form.partD?.zakatCommittee?.beneficiariesLast3Years || 0}</span>
            </div>
          </div>
        </div>

        {/* Peoples Foundation Beneficiaries */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">3. പീപ്പിൾസ് ഫൗണ്ടേഷനിൽ നിന്നും കഴിഞ്ഞ 3 വർഷത്തിനിടെ വ്യക്തിപരമായി സഹായം സ്വീകരിച്ച മറ്റുള്ളവർ</h4>
          <div className="flex justify-between">
            <span className="text-gray-600">എണ്ണം:</span>
            <span className="font-medium">{form.partD?.peoplesFoundationBeneficiaries || 0}</span>
          </div>
        </div>

        {/* Housing Project Beneficiaries */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">4. ഹൗസിംഗ് പ്രൊജക്‌ടുകൾ, കുടിവെള്ളപദ്ധതികൾ തുടങ്ങിയ നമ്മുടെ സേവന പ്രൊജക്ടുകളുടെ കഴിഞ്ഞ 3 വർഷത്തിനിടെ ഗുണഭോക്താക്കളായ മറ്റുള്ളവർ</h4>
          <div className="flex justify-between">
            <span className="text-gray-600">എണ്ണം:</span>
            <span className="font-medium">{form.partD?.housingProjectBeneficiaries || 0}</span>
          </div>
        </div>

        {/* Baytul Zakat Beneficiaries */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">5. ബൈത്തുസ്സകാത്തിൽ നിന്നും കഴിഞ്ഞ 3 വർഷത്തിനിടെ വ്യക്തിപരമായി സഹായം സ്വീകരിച്ച മറ്റുള്ളവർ</h4>
          <div className="flex justify-between">
            <span className="text-gray-600">എണ്ണം:</span>
            <span className="font-medium">{form.partD?.baytulZakatBeneficiaries || 0}</span>
          </div>
        </div>

        {/* Non Workers in Various Media */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">മാധ്യമ വായനക്കാരിൽ പ്രവർത്തകരല്ലാത്തവർ</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-600">മാധ്യമം വായനക്കാരിൽ:</span>
              <span className="font-medium">{form.partD?.nonWorkersinMadhyamamReaders || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">പ്രബോധനം വായനക്കാരിൽ:</span>
              <span className="font-medium">{form.partD?.nonWorkersinPrabodhanamReaders || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ആരാമം വായനക്കാരിൽ:</span>
              <span className="font-medium">{form.partD?.nonWorkersinAaramamReaders || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ആയാത്ത് ദർസെ ഖുർആൻ ഉപയോഗിക്കുന്നവർ:</span>
              <span className="font-medium">{form.partD?.nonWorkersinAyahUsers || 0}</span>
            </div>
          </div>
        </div>

        {/* Areas */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">10. നമ്മുടെ മഹല്ലുകൾ</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-600">നമ്മുടെ മഹല്ലുകൾ:</span>
              <span className="font-medium">{form.partD?.areas?.ourAreas || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">രജിസ്റ്റർ ചെയ്‌ത നമ്മുടെതല്ലാത്ത കുടുംബങ്ങൾ:</span>
              <span className="font-medium">{form.partD?.areas?.registeredNonOurFamilies || 0}</span>
            </div>
          </div>
        </div>

        {/* Other Fields */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">മറ്റ് വിവരങ്ങൾ</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-600">നമുക്ക് സ്വാധീനമുള്ള മറ്റു പൊതു മഹല്ലുകൾ:</span>
              <span className="font-medium">{form.partD?.influentialMahalls || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ഖുതുബ ശ്രവിക്കാൻ വരുന്നവർ (ഘടനയിൽ):</span>
              <span className="font-medium">{form.partD?.khutbaListenersfromOrganizedAreas || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ഖുതുബ ശ്രവിക്കാൻ വരുന്നവർ (ഘടനയില്ലാത്ത):</span>
              <span className="font-medium">{form.partD?.khutbaListenersfromNonOrganizedAreas || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ഫുൾടൈം പ്രവർത്തകർ:</span>
              <span className="font-medium">{form.partD?.FullTimeWorkers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">പാർട് ടൈം പ്രവർത്തകർ:</span>
              <span className="font-medium">{form.partD?.PartTimeWorkers || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPartE = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6 hover:shadow-xl transition-all duration-500">
      <h3 className="text-lg font-bold text-[#002349] mb-6">ഭാഗം-ഇ (അധിക വിവരങ്ങൾ)</h3>
      <div className="space-y-4">
        {/* Areas Without Presence */}
        <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50 hover:shadow-md transition-all duration-300">
          <h4 className="font-semibold text-[#002349] mb-4">1. നമ്മുടെ സാന്നിദ്ധ്യമില്ലാത്ത മുസ്‌ലിം ഭൂരിപക്ഷ പ്രദേശങ്ങൾ</h4>
          <div className="space-y-3">
            <div className="p-2 bg-white rounded-xl">
              <span className="text-gray-600 font-medium">വിവരങ്ങൾ:</span>
              <p className="text-gray-700 mt-1 font-medium">{form.partE?.areasWithoutPresence?.description || 'N/A'}</p>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded-xl">
              <span className="text-gray-600 font-medium">തരം:</span>
              <span className="font-bold text-[#957C3D]">{form.partE?.areasWithoutPresence?.type || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Panchayats Without Presence */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">2. നമ്മുടെ സാന്നിദ്ധ്യമില്ലാത്ത പഞ്ചായത്തുകൾ/ മുനിസിപ്പാലിറ്റികൾ</h4>
          <div>
            <span className="text-gray-600">വിവരങ്ങൾ:</span>
            <p className="text-gray-900 mt-1">{form.partE?.panchayatsWithoutPresence || 'N/A'}</p>
          </div>
        </div>

        {/* New Components Last 5 Years */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">3. കഴിഞ്ഞ 5 വർഷത്തിനിടയിൽ പുതുതായി ഉണ്ടായ ഘടകങ്ങളുടെ എണ്ണം</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">എണ്ണം:</span>
              <span className="font-medium">{form.partE?.newComponentsLast5Years?.count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">തരം:</span>
              <span className="font-medium">{form.partE?.newComponentsLast5Years?.type || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">വിശദ വിവരങ്ങൾ:</span>
              <p className="text-gray-900 mt-1">{form.partE?.newComponentsLast5Years?.details || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Workers Growth in Last 5 Years */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">4. കഴിഞ്ഞ 5 വർഷത്തിനിടയിൽ പ്രവർത്തകരുടെ വർധനവ്</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">വർധനവ് എണ്ണം:</span>
              <span className="font-medium">{form.partE?.workersGrowthInLast5Years?.count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">വർധനവിന്റെ തരം:</span>
              <span className="font-medium">{form.partE?.workersGrowthInLast5Years?.type || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Components to Form in 6 Months */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">5. 6 മാസത്തിനുള്ളിൽ രൂപീകരിക്കാൻ സാധിക്കുന്ന ഘടകങ്ങൾ</h4>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-600">JIH:</span>
              <span className="font-medium">{form.partE?.componentsToFormIn6Months?.jih || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">വനിത:</span>
              <span className="font-medium">{form.partE?.componentsToFormIn6Months?.vanitha || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Solidarity:</span>
              <span className="font-medium">{form.partE?.componentsToFormIn6Months?.solidarity || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">SIO:</span>
              <span className="font-medium">{form.partE?.componentsToFormIn6Months?.sio || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">GIO:</span>
              <span className="font-medium">{form.partE?.componentsToFormIn6Months?.gio || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ടീൻ ഇന്ത്യ:</span>
              <span className="font-medium">{form.partE?.componentsToFormIn6Months?.teenIndia || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">മലർവാടി:</span>
              <span className="font-medium">{form.partE?.componentsToFormIn6Months?.malarvadi || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Page Header with Action Buttons */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="hidden lg:block text-xl sm:text-2xl lg:text-4xl font-bold text-[#002349]">ഫോം വിവരങ്ങൾ</h1>
          <p className="text-lg text-gray-600 font-normal mt-1">District: <span className="font-bold">{form.district}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 min-h-[44px] rounded-xl font-semibold flex items-center space-x-2 transition-all duration-300 text-sm"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'ഡൗൺലോഡ് ചെയ്യുന്നു...' : 'PDF ഡൗൺലോഡ്'}</span>
          </button>
          {!isAdmin && (
            <button
              onClick={() => onEdit(form)}
              className="bg-[#002349] hover:bg-[#1a3a5c] text-white px-4 py-2 min-h-[44px] rounded-xl font-semibold flex items-center space-x-2 transition-all duration-300 text-sm"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 min-h-[44px] rounded-xl font-semibold flex items-center space-x-2 transition-all duration-300 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Form Info Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8 hover:shadow-xl transition-all duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#002349] to-[#1a3a5c] rounded-2xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg text-gray-600 font-medium">District:</span>
                <h2 className="text-xl font-bold text-[#002349]">{form.district}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 font-medium mt-2">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>സമർപ്പിച്ചത് {new Date(form.submittedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1 min-w-0">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="break-words">ആക്സസ് കോഡ്: {form.submittedBy}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Parts */}
      {renderPartA()}
      {renderPartB()}
      {renderPartC()}
      {renderPartD()}
      {renderPartE()}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Form"
        message={`Are you sure you want to delete the form for ${form.district}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={isDeleting}
      />
    </>
  );
  };

  export default FormDetailPage;