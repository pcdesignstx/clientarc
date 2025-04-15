import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/Card';

// Step components
import Welcome from '../../components/onboarding/Welcome';
import WorkspaceSetup from '../../components/onboarding/WorkspaceSetup';
import AccountSetup from '../../components/onboarding/AccountSetup';
import FlowSetup from '../../components/onboarding/FlowSetup';
import ClientSetup from '../../components/onboarding/ClientSetup';
import Completion from '../../components/onboarding/Completion';

const STEPS = [
  { id: 'welcome', title: 'Welcome', component: Welcome },
  { id: 'workspace', title: 'Workspace Setup', component: WorkspaceSetup },
  { id: 'account', title: 'Account Setup', component: AccountSetup },
  { id: 'flow', title: 'Flow Setup', component: FlowSetup },
  { id: 'client', title: 'Client Setup', component: ClientSetup },
  { id: 'completion', title: 'All Set!', component: Completion }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState({
    workspace: { name: '', logo: null },
    account: { name: '', timezone: '', language: 'en' },
    flow: { id: null, name: '' },
    client: { id: null, email: '' }
  });

  const currentStep = STEPS[currentStepIndex];
  const StepComponent = currentStep.component;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const progress = ((currentStepIndex) / (STEPS.length - 1)) * 100;

  const handleNext = async (stepData) => {
    // Update form data with the current step's data
    setFormData(prev => ({
      ...prev,
      [currentStep.id]: { ...prev[currentStep.id], ...stepData }
    }));

    if (isLastStep) {
      navigate('/dashboard');
    } else {
      setCurrentStepIndex(i => i + 1);
    }
  };

  const handleBack = () => {
    setCurrentStepIndex(i => i - 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white">
              Step {currentStepIndex + 1} of {STEPS.length}
            </h2>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div
              className="h-2 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <StepComponent
          formData={formData}
          onNext={handleNext}
          onBack={handleBack}
          loading={false}
        />
      </div>
    </div>
  );
} 