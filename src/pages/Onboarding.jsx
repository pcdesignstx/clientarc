import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WorkspaceSetup from '../components/onboarding/WorkspaceSetup';
import AccountSetup from '../components/onboarding/AccountSetup';
import FlowSetup from '../components/onboarding/FlowSetup';
import { toast } from 'react-hot-toast';

export default function Onboarding() {
  console.log("✅ Onboarding component rendered");
  const [currentStep, setCurrentStep] = useState(1);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const { currentUser, workspaceId: contextWorkspaceId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log(`[RENDER] ${location.pathname} mounted`);
  }, [location.pathname]);

  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  // If workspace is already set in context, use it
  useEffect(() => {
    if (contextWorkspaceId) {
      setWorkspaceId(contextWorkspaceId);
    }
  }, [contextWorkspaceId]);

  const handleWorkspaceComplete = (id) => {
    setWorkspaceId(id);
    setCurrentStep(2);
  };

  const handleAccountComplete = () => {
    setCurrentStep(3);
  };

  const handleFlowComplete = () => {
    toast.success('Onboarding completed!');
    navigate('/admin/dashboard');
  };

  if (!currentUser) {
    return null; // Will redirect to login
  }

  if (!workspaceId && currentStep > 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome to ClientArc
            </h1>
            <div className="flex space-x-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === currentStep
                      ? 'bg-blue-600 text-white'
                      : step < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          {currentStep === 1 && (
            <WorkspaceSetup onComplete={handleWorkspaceComplete} />
          )}
          {currentStep === 2 && workspaceId && (
            <AccountSetup
              workspaceId={workspaceId}
              onComplete={handleAccountComplete}
            />
          )}
          {currentStep === 3 && workspaceId && (
            <FlowSetup
              workspaceId={workspaceId}
              onComplete={handleFlowComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
} 