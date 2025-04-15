import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function WorkspaceSetup({ onComplete, onNext }) {
  const { currentUser, setWorkspaceId } = useAuth();
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('You must be logged in to create a workspace');
      navigate('/login');
      return;
    }

    if (!workspaceName.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }

    setLoading(true);
    try {
      // Generate workspace ID from name
      const workspaceId = workspaceName.toLowerCase().replace(/\s+/g, '-');

      // Create workspace document
      await setDoc(doc(db, 'workspaces', workspaceId), {
        name: workspaceName.trim(),
        owner: currentUser.uid,
        createdAt: new Date().toISOString()
      });

      // Update user document with workspaceId
      await updateDoc(doc(db, 'users', currentUser.uid), {
        workspaceId,
        onboardingComplete: false
      });

      // Update auth context with workspace ID
      setWorkspaceId(workspaceId);

      // Notify parent component
      if (typeof onComplete === 'function') {
        onComplete(workspaceId);
      }
      if (typeof onNext === 'function') {
        onNext({ workspaceId });
      }
    } catch (error) {
      console.error('[WorkspaceSetup] Error creating workspace:', error);
      toast.error('Failed to create workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return null; // Will redirect to login
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Create Your Workspace
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Workspace Name
          </label>
          <input
            id="workspace-name"
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter your workspace name"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating workspace...' : 'Create Workspace'}
        </button>
      </form>
    </div>
  );
} 