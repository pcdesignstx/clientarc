import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';

export default function WorkspaceSettings() {
  const { workspaceId } = useAuth();
  const { updateWorkspaceTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWorkspaceSettings = async () => {
      try {
        const workspaceRef = doc(db, 'workspaces', workspaceId);
        const workspaceDoc = await getDoc(workspaceRef);
        
        if (workspaceDoc.exists()) {
          const { theme = 'light' } = workspaceDoc.data();
          setCurrentTheme(theme);
        }
      } catch (error) {
        console.error('Error loading workspace settings:', error);
        toast.error('Failed to load workspace settings');
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaceSettings();
  }, [workspaceId]);

  const handleThemeChange = async (theme) => {
    try {
      await updateWorkspaceTheme(theme);
      setCurrentTheme(theme);
      toast.success('Theme updated successfully');
    } catch (error) {
      console.error('Error updating theme:', error);
      toast.error('Failed to update theme');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
        Workspace Settings
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Appearance
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose how your workspace looks for you and your clients
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  currentTheme === 'light'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  currentTheme === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Dark
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 