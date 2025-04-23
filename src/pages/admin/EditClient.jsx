import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function EditClient() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user, workspaceId } = useAuth();
  const [client, setClient] = useState(null);
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState('');
  const [loading, setLoading] = useState(true);
  const [flowsLoading, setFlowsLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    tempPassword: '',
    businessName: '',
    industry: '',
    businessSize: '',
    website: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: ''
  });

  useEffect(() => {
    const fetchClient = async () => {
      if (!workspaceId) return;

      try {
        const clientRef = doc(db, 'workspaces', workspaceId, 'clients', clientId);
        const clientDoc = await getDoc(clientRef);
        
        if (clientDoc.exists()) {
          const data = clientDoc.data();
          setClient({ id: clientDoc.id, ...data });
          setFormData({
            fullName: data.fullName || '',
            email: data.email || '',
            tempPassword: data.tempPassword || '',
            businessName: data.businessName || '',
            industry: data.industry || data.businessType || '',
            businessSize: data.businessSize || '',
            website: data.website || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipCode || '',
            notes: data.notes || ''
          });
        }
      } catch (error) {
        console.error('Error fetching client:', error);
        toast.error('Failed to load client details');
      } finally {
        setLoading(false);
      }
    };

    const fetchFlows = async () => {
      if (!workspaceId) return;

      try {
        setFlowsLoading(true);
        const flowsRef = collection(db, 'workspaces', workspaceId, 'flows');
        
        // Set up real-time listener
        const unsubscribe = onSnapshot(flowsRef, 
          (snapshot) => {
            const flowsData = snapshot.docs.map(doc => ({
              id: doc.id,
              name: doc.data().name,
              description: doc.data().description || '',
              steps: doc.data().steps || []
            }));
            setFlows(flowsData);
            setFlowsLoading(false);
          },
          (error) => {
            console.error('Error fetching flows:', error);
            toast.error('Failed to load flows');
            setFlowsLoading(false);
          }
        );

        // Cleanup subscription on unmount
        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up flows listener:', error);
        toast.error('Failed to set up flows listener');
        setFlowsLoading(false);
      }
    };

    fetchClient();
    fetchFlows();
  }, [clientId, workspaceId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workspaceId) return;

    try {
      const clientRef = doc(db, 'workspaces', workspaceId, 'clients', clientId);
      const updateData = {
        ...formData,
        updatedAt: serverTimestamp()
      };
      
      // Remove businessType if it exists in the document
      const clientDoc = await getDoc(clientRef);
      if (clientDoc.exists() && clientDoc.data().businessType) {
        await updateDoc(clientRef, {
          businessType: null // Remove the old field
        });
      }
      
      await updateDoc(clientRef, updateData);

      toast.success('Client updated successfully!');
      navigate('/admin/clients');
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Failed to update client');
    }
  };

  const handleAssignFlow = async () => {
    if (!selectedFlow || !workspaceId) return;

    try {
      const selectedFlowData = flows.find(f => f.id === selectedFlow);
      if (!selectedFlowData) {
        toast.error("Selected flow not found");
        return;
      }

      const clientRef = doc(db, 'workspaces', workspaceId, 'clients', clientId);
      const clientDoc = await getDoc(clientRef);
      const currentData = clientDoc.data();
      const assignedFlows = currentData.assignedFlows || [];

      // Check if flow is already assigned
      if (assignedFlows.some(f => f.flowId === selectedFlowData.id)) {
        toast.error(`Flow "${selectedFlowData.name}" is already assigned to this client`);
        return;
      }

      // Create the new flow assignment with proper ISO string timestamp
      const newFlowAssignment = {
        flowId: selectedFlowData.id,
        name: selectedFlowData.name,
        status: 'not_started',
        progress: 0,
        assignedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      // Update Firestore with the new flow assignment
      await updateDoc(clientRef, {
        assignedFlows: [...assignedFlows, newFlowAssignment],
        updatedAt: serverTimestamp()
      });

      // Update local state
      setClient(prev => ({
        ...prev,
        assignedFlows: [...(prev.assignedFlows || []), newFlowAssignment]
      }));

      setSelectedFlow('');
      toast.success(`Successfully assigned "${selectedFlowData.name}" to ${client.fullName}`);
    } catch (error) {
      console.error('Error assigning flow:', error);
      toast.error("Failed to assign flow. Please try again.");
    }
  };

  const handleRemoveFlow = async (flowId) => {
    if (!workspaceId) return;

    try {
      const flowToRemove = client.assignedFlows.find(f => f.flowId === flowId);
      if (!flowToRemove) {
        toast.error("Flow not found in assigned flows");
        return;
      }

      const clientRef = doc(db, 'workspaces', workspaceId, 'clients', clientId);
      const clientDoc = await getDoc(clientRef);
      const currentData = clientDoc.data();
      const assignedFlows = currentData.assignedFlows || [];

      // Remove the flow from the assignedFlows array
      const updatedFlows = assignedFlows.filter(f => f.flowId !== flowId);

      // Update Firestore with the new assignedFlows array
      await updateDoc(clientRef, {
        assignedFlows: updatedFlows,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setClient(prev => ({
        ...prev,
        assignedFlows: updatedFlows
      }));

      toast.success(`Successfully removed "${flowToRemove.name}" from ${client.fullName}`);
    } catch (error) {
      console.error('Error removing flow:', error);
      toast.error("Failed to remove flow. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Client not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">Edit Client</h1>
        <div className="flex items-center space-x-3">
          <Link
            to={`/admin/clients/${clientId}/progress`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Progress & Reminders
          </Link>
          <button
            onClick={() => navigate('/admin/clients')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Clients
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-8">Profile Information</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div key="fullName" className="space-y-2">
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    id="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  />
                </div>

                <div key="email" className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  />
                </div>

                <div key="businessName" className="space-y-2">
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Business Name
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    id="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  />
                </div>

                <div key="phone" className="space-y-2">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  />
                </div>

                <div key="website" className="space-y-2">
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    id="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  />
                </div>

                <div key="industry" className="space-y-2">
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Industry
                  </label>
                  <select
                    name="industry"
                    id="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  >
                    <option value="">Select an industry</option>
                    {[
                      "Accounting", "Advertising", "Agriculture", "Architecture", "Automotive",
                      "Banking", "Beauty", "Construction", "Consulting", "Dental", "Education",
                      "Engineering", "Entertainment", "Financial Services", "Fitness",
                      "Food & Beverage", "Healthcare", "Hospitality", "Insurance", "Legal",
                      "Manufacturing", "Marketing", "Medical", "Non-Profit", "Real Estate",
                      "Retail", "Technology", "Transportation", "Other"
                    ].map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>

                <div key="businessSize" className="space-y-2">
                  <label htmlFor="businessSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Business Size
                  </label>
                  <select
                    name="businessSize"
                    id="businessSize"
                    value={formData.businessSize}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  >
                    <option value="">Select a size</option>
                    {[
                      { value: "micro", label: "Micro (1-9 employees)" },
                      { value: "small", label: "Small (10-49 employees)" },
                      { value: "medium", label: "Medium (50-249 employees)" },
                      { value: "large", label: "Large (250+ employees)" }
                    ].map((size) => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div key="address" className="space-y-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    id="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  />
                </div>

                <div key="city" className="space-y-2">
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    id="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  />
                </div>

                <div key="state" className="space-y-2">
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    id="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  />
                </div>

                <div key="zipCode" className="space-y-2">
                  <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Assigned Flows */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-8">Assigned Flows</h2>
            
            {flowsLoading ? (
              <div className="flex items-center space-x-2">
                <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Loading flows...</span>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-6">
                  <select
                    value={selectedFlow}
                    onChange={(e) => setSelectedFlow(e.target.value)}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  >
                    <option value="">Select a flow</option>
                    {flows.map(flow => (
                      <option key={flow.id} value={flow.id}>
                        {flow.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAssignFlow}
                  disabled={!selectedFlow}
                  className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Assign Flow
                </button>
              </>
            )}

            {client.assignedFlows?.length > 0 && (
              <div className="mt-8 space-y-4">
                {client.assignedFlows.map((flow) => (
                  <div key={flow.flowId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">{flow.name}</p>
                      <p className="text-xs text-gray-400">
                        Assigned on {new Date(flow.assignedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveFlow(flow.flowId)}
                      className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Remove flow"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 