import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, auth, storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import Card from '../../components/Card';
import { TrashIcon } from '@heroicons/react/24/outline';
import ConfirmModal from '../../components/ConfirmModal';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
];

const TABS = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'management', label: 'Management' },
];

export default function Settings() {
  const { currentUser, workspaceId, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [activeTab, setActiveTab] = useState('workspace');

  const [settings, setSettings] = useState({
    workspaceName: '',
    workspaceLogo: '',
    fullName: '',
    timezone: 'America/New_York',
    language: 'en',
    newPassword: '',
    confirmPassword: '',
    notifications: {
      clientNotifications: true,
      productUpdates: true,
      billingReminders: true
    }
  });

  const [userData, setUserData] = useState(null);
  const [workspaceData, setWorkspaceData] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch user data
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        setUserData(userData);

        // Fetch workspace data
        const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
        const workspaceData = workspaceDoc.data();
        setWorkspaceData(workspaceData);

        setSettings(prev => ({
          ...prev,
          workspaceName: workspaceData?.name || '',
          workspaceLogo: workspaceData?.logoUrl || '',
          fullName: userData?.name || '',
          timezone: userData?.timezone || 'America/New_York',
          language: userData?.language || 'en',
          notifications: {
            clientNotifications: userData?.preferences?.clientNotifications ?? true,
            productUpdates: userData?.preferences?.productUpdates ?? true,
            billingReminders: userData?.preferences?.billingReminders ?? true
          }
        }));
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }

    if (currentUser && workspaceId) {
      loadData();
    }
  }, [currentUser, workspaceId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('notifications.')) {
      const notificationKey = name.split('.')[1];
      setSettings(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [notificationKey]: checked
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSaving(true);
      const storageRef = ref(storage, `workspaces/${workspaceId}/logo/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      await updateDoc(doc(db, 'workspaces', workspaceId), {
        logoUrl: downloadUrl
      });

      setSettings(prev => ({
        ...prev,
        workspaceLogo: downloadUrl
      }));

      toast.success('Logo updated successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkspaceUpdate = async () => {
    try {
      setSaving(true);
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        name: settings.workspaceName
      });
      toast.success('Workspace updated successfully');
    } catch (error) {
      console.error('Error updating workspace:', error);
      toast.error('Failed to update workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleUserUpdate = async () => {
    try {
      setSaving(true);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: settings.fullName,
        timezone: settings.timezone,
        language: settings.language,
        preferences: settings.notifications
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (settings.newPassword !== settings.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setSaving(true);
      await updatePassword(auth.currentUser, settings.newPassword);
      toast.success('Password updated successfully');
      setSettings(prev => ({
        ...prev,
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/requires-recent-login') {
        setShowReauthModal(true);
      } else {
        toast.error('Failed to update password');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReauthenticate = async () => {
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        reauthPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      setShowReauthModal(false);
      handlePasswordUpdate();
    } catch (error) {
      console.error('Error reauthenticating:', error);
      toast.error('Invalid password');
    }
  };

  const handleDeleteWorkspace = async () => {
    try {
      setSaving(true);
      await deleteDoc(doc(db, 'workspaces', workspaceId));
      await logout();
      toast.success('Workspace deleted successfully');
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast.error('Failed to delete workspace');
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const renderWorkspaceTab = () => (
    <Card>
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Workspace Logo
            </label>
            <div className="flex items-center space-x-4">
              {settings.workspaceLogo && (
                <img
                  src={settings.workspaceLogo}
                  alt="Workspace Logo"
                  className="h-12 w-12 rounded-full object-cover"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="workspaceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Workspace Name
            </label>
            <input
              type="text"
              id="workspaceName"
              name="workspaceName"
              value={settings.workspaceName}
              onChange={handleInputChange}
              onBlur={handleWorkspaceUpdate}
              className="w-full px-4 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={currentUser.email}
              disabled
              className="w-full px-4 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={settings.fullName}
              onChange={handleInputChange}
              onBlur={handleUserUpdate}
              className="w-full px-4 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                value={settings.timezone}
                onChange={handleInputChange}
                onBlur={handleUserUpdate}
                className="w-full px-4 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                id="language"
                name="language"
                value={settings.language}
                onChange={handleInputChange}
                onBlur={handleUserUpdate}
                className="w-full px-4 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderSecurityTab = () => (
    <Card>
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={settings.newPassword}
              onChange={handleInputChange}
              className="w-full px-4 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={settings.confirmPassword}
              onChange={handleInputChange}
              className="w-full px-4 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <button
            onClick={handlePasswordUpdate}
            disabled={!settings.newPassword || !settings.confirmPassword || saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Update Password
          </button>

          <div className="pt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Last login: {currentUser.metadata.lastSignInTime}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderNotificationsTab = () => (
    <Card>
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="clientNotifications"
              name="notifications.clientNotifications"
              checked={settings.notifications.clientNotifications}
              onChange={handleInputChange}
              onBlur={handleUserUpdate}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="clientNotifications" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Receive client notifications
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="productUpdates"
              name="notifications.productUpdates"
              checked={settings.notifications.productUpdates}
              onChange={handleInputChange}
              onBlur={handleUserUpdate}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="productUpdates" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Product updates and announcements
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="billingReminders"
              name="notifications.billingReminders"
              checked={settings.notifications.billingReminders}
              onChange={handleInputChange}
              onBlur={handleUserUpdate}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="billingReminders" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Billing reminders and invoices
            </label>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderManagementTab = () => (
    workspaceData?.ownerId === currentUser.uid && (
      <Card>
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-red-600 dark:text-red-500">
                Danger Zone
              </h3>
              <div className="mt-4">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="-mb-px flex space-x-8" aria-label="Settings tabs">
          {TABS.map((tab) => {
            // Only show Management tab for workspace owners
            if (tab.id === 'management' && workspaceData?.ownerId !== currentUser.uid) {
              return null;
            }
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'workspace' && renderWorkspaceTab()}
        {activeTab === 'security' && renderSecurityTab()}
        {activeTab === 'notifications' && renderNotificationsTab()}
        {activeTab === 'management' && renderManagementTab()}

        {/* Sign Out Button - Always visible */}
        <div className="flex justify-end pt-4">
          <button
            onClick={logout}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Modals */}
      {showReauthModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Please confirm your password
            </h3>
            <input
              type="password"
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-4"
              placeholder="Enter your current password"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowReauthModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleReauthenticate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteWorkspace}
        title="Delete Workspace"
        message="Are you sure you want to delete this workspace? This action cannot be undone."
        confirmText="Delete"
        confirmStyle="danger"
      />
    </div>
  );
} 