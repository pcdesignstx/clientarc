import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useState } from 'react';

export default function Completion({ formData, onNext }) {
  const { currentUser } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleComplete = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      // Update the user document to mark onboarding as complete
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        onboardingComplete: true,
        updatedAt: new Date()
      });

      console.log('Onboarding marked as complete');
      onNext({ completed: true });
    } catch (error) {
      console.error('Error updating onboarding status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        You're All Set!
      </h2>
      
      <div className="max-w-md mx-auto text-left mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Here's what you've set up:
        </h3>
        
        <ul className="space-y-3 text-gray-600 dark:text-gray-300">
          <li className="flex items-start">
            <svg
              className="w-5 h-5 text-green-500 mr-2 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Workspace: {formData.workspaceName}</span>
          </li>
          
          <li className="flex items-start">
            <svg
              className="w-5 h-5 text-green-500 mr-2 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Account preferences set</span>
          </li>
          
          {formData.flowName && (
            <li className="flex items-start">
              <svg
                className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Content flow: {formData.flowName}</span>
            </li>
          )}
          
          {formData.clientName && (
            <li className="flex items-start">
              <svg
                className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Client invited: {formData.clientName}</span>
            </li>
          )}
        </ul>
      </div>

      <div className="max-w-md mx-auto text-left mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Next steps:
        </h3>
        
        <ul className="space-y-3 text-gray-600 dark:text-gray-300">
          <li className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-500 mr-2 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>Create your first content piece</span>
          </li>
          
          <li className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-500 mr-2 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>Invite more clients to your workspace</span>
          </li>
          
          <li className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-500 mr-2 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>Explore your dashboard</span>
          </li>
          
          <li className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-500 mr-2 mt-0.5"
              fill="none"
              stroke="currentUser"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>Customize your workspace settings</span>
          </li>
        </ul>
      </div>

      <button
        onClick={handleComplete}
        disabled={isUpdating}
        className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50"
      >
        {isUpdating ? 'Finishing up...' : 'Go to Dashboard'}
      </button>
    </div>
  );
} 