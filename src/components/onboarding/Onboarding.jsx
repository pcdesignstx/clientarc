import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Welcome from './Welcome';
import WorkspaceSetup from './WorkspaceSetup';
import AccountSetup from './AccountSetup';
import FlowSetup from './FlowSetup';
import ClientSetup from './ClientSetup';
import Completion from './Completion';

const STEPS = [
  { id: 'welcome', component: Welcome },
  { id: 'workspace', component: WorkspaceSetup },
  { id: 'account', component: AccountSetup },
  { id: 'flow', component: FlowSetup },
  { id: 'client', component: ClientSetup },
  { id: 'completion', component: Completion }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { workspaceId, currentUser } = useAuth();
  const navigate = useNavigate();

  // Load saved progress from Firestore
  useEffect(() => {
    const loadProgress = async () => {
      if (!workspaceId) {
        setLoading(false);
        return;
      }

      try {
        const workspaceRef = doc(db, 'workspaces', workspaceId);
        const workspaceDoc = await getDoc(workspaceRef);
        if (workspaceDoc.exists()) {
          const data = workspaceDoc.data();
          setCurrentStep(data.onboardingProgress || 0);
          setFormData(data.onboardingData || {});
        }
      } catch (error) {
        console.error('Error loading progress:', error);
        setError('Failed to load onboarding progress');
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [workspaceId]);

  const handleNext = async (stepData) => {
    try {
      setLoading(true);
      setError(null);

      const updatedFormData = { ...formData, ...stepData };
      setFormData(updatedFormData);

      // If this is the last step or we're on the completion step, mark onboarding as complete
      if (currentStep === STEPS.length - 1 || stepData.completed) {
        try {
          if (workspaceId) {
            const workspaceRef = doc(db, 'workspaces', workspaceId);
            await updateDoc(workspaceRef, {
              onboardingComplete: true,
              onboardingData: updatedFormData
            });
          }
        } catch (err) {
          console.error('Error marking onboarding as complete:', err);
          // Continue with navigation even if Firestore update fails
        }
        navigate('/dashboard');
        return;
      }

      // For other steps, update progress
      try {
        if (workspaceId) {
          const workspaceRef = doc(db, 'workspaces', workspaceId);
          const nextStep = currentStep + 1;
          await updateDoc(workspaceRef, {
            onboardingProgress: nextStep,
            onboardingData: updatedFormData
          });
          setCurrentStep(nextStep);
        }
      } catch (err) {
        console.error('Error saving progress:', err);
        setError('Failed to save progress. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Error in handleNext:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSkip = async () => {
    try {
      setLoading(true);
      setError(null);

      const workspaceRef = doc(db, 'workspaces', workspaceId);
      const nextStep = currentStep + 1;

      await updateDoc(workspaceRef, {
        onboardingProgress: nextStep
      });

      setCurrentStep(nextStep);
    } catch (err) {
      setError('Failed to skip step. Please try again.');
      console.error('Error skipping step:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  // Ensure currentStep is within bounds
  const safeCurrentStep = Math.min(Math.max(0, currentStep), STEPS.length - 1);
  const CurrentStepComponent = STEPS[safeCurrentStep]?.component;

  if (!CurrentStepComponent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-red-600 dark:text-red-400">Error: Invalid onboarding step</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <CurrentStepComponent
                formData={formData}
                onNext={handleNext}
                onBack={handleBack}
                onSkip={handleSkip}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 