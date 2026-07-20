import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Edit } from 'lucide-react';
import axios from 'axios';
import FormPage from './FormPage';
import FormDetailPage from './FormDetailPage';
import { FormProvider } from '../contexts/FormContext';
import ConfirmationModal from '../components/modals/ConfirmationModal';

const FormSubmissionPage = ({ onLogout, onBack, onCreateNew, onEdit, userData: propUserData }) => {
  const [userData, setUserData] = useState(propUserData);
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formToDelete, setFormToDelete] = useState(null);
  const [editingForm, setEditingForm] = useState(null);

  useEffect(() => {
    // Use prop userData if available, otherwise get from localStorage
    if (propUserData) {
      setUserData(propUserData);
    } else {
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        setUserData(JSON.parse(storedUserData));
      }
    }
    
    // Load user's forms
    loadUserForms();
  }, [propUserData]);

  const loadUserForms = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/forms`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setForms(response.data.forms);
    } catch (error) {
      console.error('Error loading forms:', error);
      setError('Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  };

  const [showForm, setShowForm] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);

  const handleCreateForm = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      setShowForm(true);
    }
  };

  const handleFormBack = () => {
    setShowForm(false);
  };

  const handleFormSubmit = (formData) => {
    setShowForm(false);
    setEditingForm(null);
    // Reload forms after submission
    loadUserForms();
  };

  const handleViewForm = (form) => {
    setSelectedFormId(form._id);
    setShowDetailView(true);
  };

  const handleEditForm = (form) => {
    if (onEdit) {
      onEdit(form);
    } else {
      setEditingForm(form);
      setShowForm(true);
    }
  };

  const handleDetailBack = () => {
    setShowDetailView(false);
    setSelectedFormId(null);
  };

  const handleDetailEdit = (form) => {
    setShowDetailView(false);
    setSelectedFormId(null);
    setEditingForm(form);
    setShowForm(true);
  };

  const handleDetailDelete = () => {
    setShowDetailView(false);
    setSelectedFormId(null);
    loadUserForms();
  };

  const handleDeleteForm = (form) => {
    setFormToDelete(form);
    setShowDeleteModal(true);
  };

  const confirmDeleteForm = async () => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/user/forms/${formToDelete._id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      loadUserForms();
      setFormToDelete(null);
    } catch (error) {
      console.error('Error deleting form:', error);
      setError('Failed to delete form');
    }
  };

  if (showForm) {
    return (
      <FormProvider>
        <FormPage 
          onBack={handleFormBack} 
          onSubmit={handleFormSubmit} 
          editingForm={editingForm}
        />
      </FormProvider>
    );
  }

  if (showDetailView && selectedFormId) {
    return (
      <FormDetailPage
        formId={selectedFormId}
        onBack={handleDetailBack}
        onEdit={handleDetailEdit}
        onDelete={handleDetailDelete}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002349] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div>
          <h1 className="text-4xl font-bold text-[#002349]">
            വാർഷിക റിപ്പോർട്ട്
          </h1>
          <p className="text-sm text-gray-600">
            District: <span className="font-semibold text-[#002349]">{userData?.district || 'Unknown'}</span>
          </p>
        </div>
        {onCreateNew && (
          <button
            onClick={handleCreateForm}
            className="bg-[#002349] hover:bg-[#1a3a5c] text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 transition-all duration-300 hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Form</span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-red-600 font-semibold text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Forms Table */}
      {forms.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-lg border border-gray-200">
          <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-[#002349] mb-2">No forms submitted yet</h3>
          <p className="text-gray-600 mb-1 text-sm">
            Get started by creating your first form submission from the top button.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#002349] border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Submission Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {forms.map((form) => (
                <tr 
                  key={form._id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleViewForm(form)}
                >
                  <td className="px-4 py-3 text-sm font-semibold text-[#002349]">
                    {form.district || 'Unnamed District'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(form.submittedAt).toLocaleDateString()} at {new Date(form.submittedAt).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditForm(form);
                        }}
                        className="p-2 text-gray-400 hover:text-[#002349] hover:bg-gray-100 rounded-lg transition-all duration-300"
                        title="Edit Form"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteForm(form);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300"
                        title="Delete Form"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteForm}
        title="Delete Form"
        message={`Are you sure you want to delete the form for ${formToDelete?.district}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default FormSubmissionPage;