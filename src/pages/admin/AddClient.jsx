import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, getDocs, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import Card from '../../components/Card';

export default function AddClient() {
  const navigate = useNavigate();
  const { currentUser, workspaceId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [flows, setFlows] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    businessName: '',
    phone: '',
    website: '',
    assignedFlowId: '',
    notes: '',
    sendInvite: true
  });

  // Fetch available flows
  useEffect(() => {
    async function fetchFlows() {
      if (!workspaceId) return;

      try {
        const flowsRef = collection(db, 'workspaces', workspaceId, 'flows');
        const flowsQuery = query(flowsRef);
        const snapshot = await getDocs(flowsQuery);
        
        const flowsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setFlows(flowsData);
      } catch (error) {
        console.error('Error fetching flows:', error);
        toast.error('Failed to load flows');
      }
    }

    fetchFlows();
  }, [workspaceId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast.error('Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }
    if (!formData.businessName.trim()) {
      toast.error('Business name is required');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    // URL validation if provided
    if (formData.website) {
      try {
        new URL(formData.website);
      } catch {
        toast.error('Please enter a valid website URL');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[AddClient] Starting client creation process');
    
    if (!validateForm()) {
      console.log('[AddClient] Form validation failed');
      return;
    }
    
    setLoading(true);
    console.log('[AddClient] Form validated, proceeding with client creation');
    
    try {
      console.log('[AddClient] Creating Firebase Auth user');
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      );
      const clientUser = userCredential.user;
      console.log('[AddClient] Firebase Auth user created:', { uid: clientUser.uid, email: clientUser.email });

      // Send password reset email if sendInvite is checked
      if (formData.sendInvite) {
        console.log('[AddClient] Sending password reset email');
        await sendPasswordResetEmail(auth, formData.email);
        console.log('[AddClient] Password reset email sent');
      }

      // Save client data to Firestore
      console.log('[AddClient] Preparing client data for Firestore');
      const clientData = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        businessName: formData.businessName.trim(),
        phone: formData.phone.trim(),
        website: formData.website.trim(),
        notes: formData.notes.trim(),
        assignedFlowId: formData.assignedFlowId || null,
        status: formData.sendInvite ? 'invited' : 'pending',
        createdAt: serverTimestamp(),
        addedBy: currentUser.uid,
        role: 'client',
        workspaceId,
        uid: clientUser.uid
      };
      console.log('[AddClient] Client data prepared:', clientData);

      console.log('[AddClient] Saving client to Firestore');
      const clientRef = collection(db, 'workspaces', workspaceId, 'clients');
      const docRef = await addDoc(clientRef, clientData);
      console.log('[AddClient] Client saved to Firestore with ID:', docRef.id);

      toast.success(
        formData.sendInvite
          ? 'Client added successfully. An email invitation has been sent.'
          : 'Client added successfully. You can send an invite later.'
      );

      // Reset form
      setFormData({
        fullName: '',
        email: '',
        businessName: '',
        phone: '',
        website: '',
        assignedFlowId: '',
        notes: '',
        sendInvite: true
      });

      // Navigate back to clients list
      navigate('/admin/clients');
    } catch (error) {
      console.error('[AddClient] Error adding client:', error);
      console.error('[AddClient] Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      if (error.code === 'auth/email-already-in-use') {
        toast.error('A user with this email already exists');
      } else {
        toast.error('Failed to add client. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-md rounded-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add New Client
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create a new client account and assign them to your workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name Field */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter client's full name"
              required
            />
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter client's email"
              required
            />
          </div>

          {/* Business Name Field */}
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="businessName"
              name="businessName"
              value={formData.businessName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter business name"
              required
            />
          </div>

          {/* Phone Number Field */}
          <div>
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
              placeholder="Enter phone number"
            />
          </div>

          {/* Website URL Field */}
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Website URL
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://"
            />
          </div>

          {/* Assigned Flow Field */}
          <div>
            <label htmlFor="assignedFlowId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigned Flow
            </label>
            <select
              id="assignedFlowId"
              name="assignedFlowId"
              value={formData.assignedFlowId}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a flow</option>
              {flows.map(flow => (
                <option key={flow.id} value={flow.id}>
                  {flow.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes Field */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any additional notes"
            />
          </div>

          {/* Send Invite Checkbox */}
          <div className="flex items-center mt-6">
            <input
              type="checkbox"
              id="sendInvite"
              name="sendInvite"
              checked={formData.sendInvite}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
            />
            <label htmlFor="sendInvite" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Send invitation email now
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={() => navigate('/admin/clients')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                'Add Client'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 