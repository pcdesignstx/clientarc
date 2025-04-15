import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function ClientLayout() {
  const { currentUser, workspaceId, logout } = useAuth();
  const [workspaceName, setWorkspaceName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchWorkspaceName() {
      if (!workspaceId) return;
      
      try {
        const workspaceDoc = doc(db, 'workspaces', workspaceId);
        const workspaceSnapshot = await getDoc(workspaceDoc);
        if (workspaceSnapshot.exists()) {
          const workspaceData = workspaceSnapshot.data();
          setWorkspaceName(workspaceData.name || '');
        }
      } catch (error) {
        console.error('Error fetching workspace name:', error);
      }
    }

    fetchWorkspaceName();
  }, [workspaceId]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              {workspaceName || 'Loading...'}
            </h1>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              <span>{currentUser?.email}</span>
              <svg
                className={`h-5 w-5 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <main>
        <Outlet />
      </main>
    </div>
  );
} 