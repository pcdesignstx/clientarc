import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, XMarkIcon, KeyIcon } from '@heroicons/react/24/outline';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function ClientDetails() {
  const { clientId } = useParams();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [flows, setFlows] = useState([]);
  const [assignedFlows, setAssignedFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState('');
  const [loading, setLoading] = useState(true);
  const [flowsLoading, setFlowsLoading] = useState(true);
  const [regeneratingApiKey, setRegeneratingApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      if (!user?.workspaceId) return;

      try {
        const clientRef = doc(db, 'workspaces', user.workspaceId, 'clients', clientId);
        const clientDoc = await getDoc(clientRef);
        
        if (clientDoc.exists()) {
          setClient({ id: clientDoc.id, ...clientDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching client:', error);
        toast.error('Failed to load client details');
      } finally {
        setLoading(false);
      }
    };

    const fetchFlows = async () => {
      if (!user?.workspaceId) return;

      try {
        const flowsRef = collection(db, 'workspaces', user.workspaceId, 'flows');
        const snapshot = await getDocs(flowsRef);

        const flowsData = snapshot.docs
          .filter(doc => doc.data().published === true)
          .map(doc => ({
            id: doc.id,
            name: doc.data().name
          }));

        setFlows(flowsData);
      } catch (error) {
        console.error('Error fetching flows:', error);
        toast.error('Failed to load flows');
      } finally {
        setFlowsLoading(false);
      }
    };

    const fetchAssignedFlows = async () => {
      if (!user?.workspaceId) return;

      try {
        const assignedFlowsRef = collection(db, 'workspaces', user.workspaceId, 'clients', clientId, 'assignedFlows');
        const snapshot = await getDocs(assignedFlowsRef);

        const assignedFlowsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setAssignedFlows(assignedFlowsData);
      } catch (error) {
        console.error('Error fetching assigned flows:', error);
        toast.error('Failed to load assigned flows');
      }
    };

    fetchClient();
    fetchFlows();
    fetchAssignedFlows();
  }, [clientId, user?.workspaceId]);

  const handleAssignFlow = async () => {
    if (!selectedFlow || !user?.workspaceId) return;

    try {
      const selectedFlowData = flows.find(f => f.id === selectedFlow);
      if (!selectedFlowData) return;

      const assignedFlowsRef = collection(db, 'workspaces', user.workspaceId, 'clients', clientId, 'assignedFlows');
      const newAssignment = {
        flowId: selectedFlowData.id,
        flowName: selectedFlowData.name,
        assignedAt: serverTimestamp(),
        status: "not_started",
        progress: 0
      };

      const docRef = await addDoc(assignedFlowsRef, newAssignment);
      
      setAssignedFlows(prev => [...prev, { id: docRef.id, ...newAssignment }]);
      setSelectedFlow('');
      toast.success('Flow assigned successfully!');
    } catch (error) {
      console.error('Error assigning flow:', error);
      toast.error('Failed to assign flow');
    }
  };

  const handleRemoveFlow = async (assignedFlowId) => {
    if (!user?.workspaceId) return;

    try {
      const assignedFlowRef = doc(db, 'workspaces', user.workspaceId, 'clients', clientId, 'assignedFlows', assignedFlowId);
      await deleteDoc(assignedFlowRef);
      
      setAssignedFlows(prev => prev.filter(flow => flow.id !== assignedFlowId));
      toast.success('Flow removed successfully!');
    } catch (error) {
      console.error('Error removing flow:', error);
      toast.error('Failed to remove flow');
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!user?.workspaceId || !clientId) return;

    setRegeneratingApiKey(true);
    try {
      const functions = getFunctions();
      const regenerateApiKey = httpsCallable(functions, 'regenerateApiKey');
      
      const result = await regenerateApiKey({
        workspaceId: user.workspaceId,
        clientId
      });

      if (result.data.apiKey) {
        setClient(prev => ({
          ...prev,
          apiKey: result.data.apiKey
        }));
        toast.success('API key regenerated successfully');
      }
    } catch (error) {
      console.error('Error regenerating API key:', error);
      toast.error('Failed to regenerate API key');
    } finally {
      setRegeneratingApiKey(false);
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-md rounded-lg p-6">
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : client ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {client.name}
              </h1>
            </div>

            {/* API Key Section */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <KeyIcon className="h-5 w-5 mr-2" />
                  API Key
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={handleRegenerateApiKey}
                    disabled={regeneratingApiKey}
                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center"
                  >
                    {regeneratingApiKey ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                    )}
                    Regenerate
                  </button>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                {showApiKey ? (
                  <code className="text-sm font-mono break-all">{client.apiKey}</code>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    ••••••••••••••••••••••••••••••••
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Use this API key to authenticate API requests for this client.
              </p>
            </div>

            {/* Assigned Flows section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Assigned Flows</h2>
              
              {assignedFlows.length > 0 ? (
                <div className="space-y-4">
                  {assignedFlows.map(assignedFlow => (
                    <div key={assignedFlow.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{assignedFlow.flowName}</p>
                        <p className="text-xs text-gray-400">
                          Assigned on {new Date(assignedFlow.assignedAt?.toDate()).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          Status: {assignedFlow.status} • Progress: {assignedFlow.progress}%
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveFlow(assignedFlow.id)}
                        className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Remove flow"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No flows assigned yet</p>
              )}

              <div className="mt-6 space-y-4">
                {flowsLoading ? (
                  <div className="flex items-center space-x-2">
                    <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Loading flows...</span>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedFlow}
                      onChange={(e) => setSelectedFlow(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">Select a flow</option>
                      {flows.map(flow => (
                        <option key={flow.id} value={flow.id}>
                          {flow.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignFlow}
                      disabled={!selectedFlow}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Assign Flow
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">
            Client not found
          </div>
        )}
      </div>
    </div>
  );
} 