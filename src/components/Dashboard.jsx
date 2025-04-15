import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadWorkspace() {
      if (!currentUser?.workspaceId) {
        setLoading(false);
        return;
      }

      try {
        const workspaceRef = doc(db, 'workspaces', currentUser.workspaceId);
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          setWorkspace(workspaceSnap.data());
        } else {
          setError('Workspace not found');
        }
      } catch (err) {
        console.error('Error loading workspace:', err);
        setError('Failed to load workspace data');
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, [currentUser?.workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading workspace data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome to {workspace?.name || 'your workspace'}
        </h1>
      </div>
      
      {/* Add your dashboard content here */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Example dashboard cards */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          {/* Add activity content */}
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h2>
          {/* Add stats content */}
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tasks</h2>
          {/* Add tasks content */}
        </div>
      </div>
    </div>
  );
} 