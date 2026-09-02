import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useForm } from '../contexts/FormContext';
import PartA from '../components/forms/monthly/PartA';
import PartB from '../components/forms/monthly/PartB';
import PartC from '../components/forms/monthly/PartC';
import PartD from '../components/forms/monthly/PartD';
import MonthlySurveyPartE from '../components/forms/monthly/MonthlySurveyPartE';

const MonthlySurveyPage = ({ onBack, onSubmit, editingSurvey, isAdmin = false }) => {
  const { currentStep, formData, setFormData } = useForm();

  // Load editing survey data if provided
  React.useEffect(() => {
    if (editingSurvey) {
      const normalizedFormData = {
        district: editingSurvey.district || '',
        month: editingSurvey.month || '',
        partA: {
          totalPopulation: editingSurvey.partA?.totalPopulation || null,
          muslimPercentage: editingSurvey.partA?.muslimPercentage || null,
          hinduPercentage: editingSurvey.partA?.hinduPercentage || null,
          christianPercentage: editingSurvey.partA?.christianPercentage || null,
          othersPercentage: editingSurvey.partA?.othersPercentage || null,
          movementPercentage: editingSurvey.partA?.movementPercentage || null,
          majorityInReligiousOrganizations: editingSurvey.partA?.majorityInReligiousOrganizations || '',
          secondPosition: editingSurvey.partA?.secondPosition || '',
          thirdPosition: editingSurvey.partA?.thirdPosition || '',
          ourPosition: editingSurvey.partA?.ourPosition || '',
          morePoliticalInfluence: editingSurvey.partA?.morePoliticalInfluence || ''
        },
        partB: editingSurvey.partB || {},
        partC: editingSurvey.partC || {},
        partD: editingSurvey.partD || {},
        partE: {
          areasWithoutPresence: editingSurvey.partE?.areasWithoutPresence || { description: '', type: 'urban' },
          panchayatsWithoutPresence: editingSurvey.partE?.panchayatsWithoutPresence || '',
          newComponentsLast5Years: editingSurvey.partE?.newComponentsLast5Years || { count: null, type: 'urban', details: '' },
          workersGrowthInLast5Years: editingSurvey.partE?.workersGrowthInLast5Years || { count: null, type: 'personalConnections' },
          componentsToFormIn6Months: editingSurvey.partE?.componentsToFormIn6Months || {
            jih: null, vanitha: null, solidarity: null, sio: null, gio: null, teenIndia: null, malarvadi: null
          }
        }
      };
      setFormData(normalizedFormData);
    }
  }, [editingSurvey]);

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return <PartA />;
      case 2: return <PartB />;
      case 3: return <PartC />;
      case 4: return <PartD />;
      case 5: return <MonthlySurveyPartE onSubmit={onSubmit} editingSurvey={editingSurvey} isAdmin={isAdmin} />;
      default: return <PartA />;
    }
  };  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'PART-A (പൊതു വിവരങ്ങൾ)';
      case 2: return 'PART-B (സംഘടനാ സംവിധാനങ്ങൾ)';
      case 3: return 'PART-C (പൊതുവേദികൾ)';
      case 4: return 'PART-D (പൊതുസംവിധാനങ്ങൾ)';
      case 5: return 'PART-E (കൂടുതൽ വിവരങ്ങൾ)';
      default: return 'Monthly Report';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex min-w-0 flex-1 items-center space-x-4">
              <button
                onClick={onBack}
                aria-label="തിരികെ പോകുക"
                className="shrink-0 min-h-[44px] text-gray-600 hover:text-[#002349] transition-all duration-500 flex items-center space-x-2 text-sm font-medium border border-gray-300 hover:border-[#002349] px-4 py-2 rounded-2xl hover:shadow-md transform hover:scale-105 ease-out hover:bg-gradient-to-br hover:from-[#002349]/5 hover:to-[#002349]/10"
              >
                <ArrowLeft className="w-4 h-4" />
                {/* MobileTopBar-equivalent context is provided by the parent shell; keep the label for lg+ only to save width on phones. */}
                <span className="hidden sm:inline">തിരികെ പോകുക</span>
              </button>
              <div className="min-w-0 flex-1">
                {/* Parent dashboard shell already names the screen on mobile; avoid a duplicate title below lg. */}
                <h1 className="hidden lg:block text-xl font-bold text-[#002349] truncate">
                  {editingSurvey && editingSurvey._id ? 'പ്രതിമാസ  റിപ്പോർട്ട് എഡിറ്റ് ചെയ്യുക' : 'പുതിയ പ്രതിമാസ  റിപ്പോർട്ട്'}
                </h1>
                <p className="text-sm text-gray-600 font-medium truncate">{getStepTitle()}</p>
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="hidden md:flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shadow-md transition-all duration-500 ${
                      step === currentStep
                        ? 'bg-gradient-to-br from-[#002349] to-[#1a3a5c] text-white'
                        : step < currentStep
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step < currentStep ? '✓' : step}
                  </div>
                  {step < 5 && (
                    <div
                      className={`w-8 h-1 mx-2 rounded-full transition-all duration-500 ${
                        step < currentStep ? 'bg-[#002349] shadow-md' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {renderCurrentStep()}
      </main>
    </div>
  );
};

export default MonthlySurveyPage;