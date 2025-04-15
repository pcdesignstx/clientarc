import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const { currentUser, workspaceId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    phone: '',
    website: '',
    notes: ''
  });

  useEffect(() => {
    async function fetchClientData() {
      if (!currentUser || !workspaceId) return;

      try {
        // First try to get the client document from the workspace's clients collection
        const clientsRef = collection(db, 'workspaces', workspaceId, 'clients');
        const q = query(clientsRef, where('uid', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const clientDoc = querySnapshot.docs[0];
          const data = clientDoc.data();
          console.log('Found client data:', data);
          setFormData({
            fullName: data.fullName || '',
            businessName: data.businessName || '',
            phone: data.phone || '',
            website: data.website || '',
            notes: data.notes || ''
          });
        } else {
          console.log('No client document found');
        }
      } catch (error) {
        console.error('Error fetching client data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    }

    fetchClientData();
  }, [currentUser, workspaceId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatWebsiteUrl = (url) => {
    if (!url) return '';
    // Remove any existing http:// or https://
    url = url.replace(/^https?:\/\//, '');
    // Add https:// if not present
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Format website URL before saving
      const formattedData = {
        ...formData,
        website: formatWebsiteUrl(formData.website)
      };

      // First, try to find the existing client document
      const clientsRef = collection(db, 'workspaces', workspaceId, 'clients');
      const q = query(clientsRef, where('uid', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Update the existing client document
        const clientDoc = querySnapshot.docs[0];
        await updateDoc(clientDoc.ref, {
          ...formattedData,
          onboardingComplete: true,
          updatedAt: new Date()
        });
      } else {
        // If no document exists, create a new one
        const clientRef = doc(db, 'workspaces', workspaceId, 'clients', currentUser.uid);
        await setDoc(clientRef, {
          ...formattedData,
          onboardingComplete: true,
          updatedAt: new Date(),
          uid: currentUser.uid
        });
      }

      // Update user document to mark onboarding as complete
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        onboardingComplete: true
      });

      toast.success('Profile updated successfully');
      navigate('/client/dashboard');
    } catch (error) {
      console.error('Error updating client profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-md rounded-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Complete Your Profile
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Please fill in your details to complete your profile and get started with your account.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your business name"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Website
                </label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your website (e.g. example.com)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any additional information about your business"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : 'Complete Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 