import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function AdminViewResponses() {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [assignedFlow, setAssignedFlow] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch all clients for the workspace
  useEffect(() => {
    async function fetchClients() {
      try {
        const clientsRef = collection(db, `workspaces/${currentUser.workspaceId}/clients`);
        const clientsQuery = query(clientsRef, where('createdBy', '==', currentUser.uid));
        const clientsSnapshot = await getDocs(clientsQuery);
        
        const clientsList = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setClients(clientsList);
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast.error('Failed to load clients');
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, [currentUser.workspaceId, currentUser.uid]);

  // Listen for changes to the selected client's assigned flow
  useEffect(() => {
    if (!selectedClient) {
      setAssignedFlow(null);
      return;
    }

    setLoading(true);
    const flowRef = doc(db, `workspaces/${currentUser.workspaceId}/clients/${selectedClient.id}/assignedFlow`);
    
    const unsubscribe = onSnapshot(flowRef, (doc) => {
      if (doc.exists()) {
        setAssignedFlow(doc.data());
      } else {
        setAssignedFlow(null);
        toast.error('No assigned flow found for this client');
      }
      setLoading(false);
    }, (error) => {
      console.error('Error listening to flow:', error);
      toast.error('Failed to load client responses');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClient, currentUser.workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">View Client Responses</h1>

        {/* Client Selection */}
        <div className="mb-8">
          <label htmlFor="client-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Client
          </label>
          <select
            id="client-select"
            value={selectedClient?.id || ''}
            onChange={(e) => {
              const client = clients.find(c => c.id === e.target.value);
              setSelectedClient(client || null);
            }}
            className="input w-full"
          >
            <option value="">Choose a client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.email}
              </option>
            ))}
          </select>
        </div>

        {/* Flow Progress */}
        {assignedFlow && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress: {assignedFlow.progress} of {assignedFlow.steps.length} steps completed
              </span>
              <span className="text-sm text-gray-500">
                {Math.round((assignedFlow.progress / assignedFlow.steps.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(assignedFlow.progress / assignedFlow.steps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Steps and Responses */}
        {assignedFlow && (
          <div className="space-y-6">
            {assignedFlow.steps.map((step, index) => (
              <div key={step.id} className="border rounded-lg p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Step {index + 1}: {step.title}
                  </h3>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {step.type}
                  </span>
                </div>

                {step.description && (
                  <p className="text-sm text-gray-500 mb-4">
                    {step.description}
                  </p>
                )}

                <div className="mt-4">
                  {!step.response ? (
                    <p className="text-sm text-gray-500 italic">No response yet</p>
                  ) : step.type === 'file' ? (
                    <div className="flex items-center space-x-2">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      <a
                        href={step.response.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-500 text-sm"
                      >
                        {step.response.fileName}
                      </a>
                      <span className="text-xs text-gray-500">
                        ({new Date(step.response.uploadedAt?.toDate()).toLocaleString()})
                      </span>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-md p-4">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {step.response}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!selectedClient && (
          <p className="text-center text-gray-500 py-8">
            Select a client to view their responses
          </p>
        )}

        {selectedClient && !assignedFlow && (
          <p className="text-center text-gray-500 py-8">
            No assigned flow found for this client
          </p>
        )}
      </div>
    </div>
  );
} 