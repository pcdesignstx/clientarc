import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/Card';
import { toast } from 'react-hot-toast';
import { PencilIcon, TrashIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import ConfirmModal from '../../components/ConfirmModal';

export default function Clients() {
  const { user, workspaceId } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [progressData, setProgressData] = useState({});

  useEffect(() => {
    async function fetchClients() {
      if (!workspaceId) {
        setError('No workspace found');
        setLoading(false);
        return;
      }

      try {
        const clientsRef = collection(db, 'workspaces', workspaceId, 'clients');
        const clientsQuery = query(clientsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(clientsQuery);
        
        const clientsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        
        setClients(clientsData);
        setError(null);

        // Fetch progress data for each client's flows
        const progressPromises = clientsData.map(async (client) => {
          if (!client.assignedFlows?.length) return {};

          const clientProgress = {};
          for (const flow of client.assignedFlows) {
            const responseRef = doc(db, 'workspaces', workspaceId, 'clients', client.id, 'responses', flow.flowId);
            const responseDoc = await getDoc(responseRef);
            
            let progress = 0;
            let status = flow.status || 'not_started';

            if (responseDoc.exists()) {
              const responseData = responseDoc.data();
              if (responseData.status) {
                status = responseData.status;
              }
              if (status === 'completed') {
                progress = 100;
              } else {
                const totalQuestions = flow.sections?.reduce((total, step) => total + (step.questions?.length || 0), 0) || 0;
                const answeredQuestions = Object.entries(responseData).reduce((total, [stepId, stepResponses]) => {
                  if (stepId === 'lastUpdated' || stepId === 'status' || stepId === 'completedAt') return total;
                  const step = flow.sections?.find(s => s.id === stepId);
                  const validResponses = step?.questions?.filter(q => {
                    const response = stepResponses[q.id];
                    return response && (
                      (typeof response === 'string' && response.trim() !== '') ||
                      (Array.isArray(response) && response.length > 0)
                    );
                  }).length || 0;
                  return total + validResponses;
                }, 0);
                
                progress = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
              }
            }

            clientProgress[flow.flowId] = { progress, status };
          }
          return { [client.id]: clientProgress };
        });

        const progressResults = await Promise.all(progressPromises);
        const combinedProgress = progressResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setProgressData(combinedProgress);
      } catch (error) {
        console.error('Error fetching clients:', error);
        setError('Failed to load clients');
        toast.error('Failed to load clients. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, [workspaceId]);

  const handleDeleteClick = (client) => {
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete || !workspaceId) return;

    try {
      // Delete from Firestore
      const clientRef = doc(db, 'workspaces', workspaceId, 'clients', clientToDelete.id);
      await deleteDoc(clientRef);

      // Delete from Firebase Auth
      const response = await fetch('https://us-central1-clientgateway-668db.cloudfunctions.net/deleteClient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: clientToDelete.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete client from Auth');
      }

      // Update UI
      setClients(clients.filter(client => client.id !== clientToDelete.id));
      toast.success('Client deleted successfully');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client. Please try again.');
    } finally {
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading clients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Clients</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:ring-offset-gray-900"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Clients</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'} in your workspace
          </p>
        </div>
        {clients.length > 0 && (
          <Link
            to="/admin/clients/add"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:ring-offset-gray-900"
          >
            Add New Client
          </Link>
        )}
      </div>

      <Card>
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No clients yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Get started by adding your first client.</p>
            <Link
              to="/admin/clients/add"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:ring-offset-gray-900"
            >
              Add Client
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {clients.map((client) => (
              <li key={client.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{client.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {client.email}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Added {client.createdAt.toLocaleDateString()}
                    </p>
                    {client.assignedFlows?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Assigned Flows:
                        </p>
                        <ul className="mt-1 space-y-1">
                          {client.assignedFlows.map((flow, index) => (
                            <li key={index} className="text-xs text-gray-400 dark:text-gray-500">
                              • {flow.name} (assigned {new Date(flow.assignedAt).toLocaleDateString()})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/admin/clients/${client.id}/progress`}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="View progress"
                    >
                      <ChartBarIcon className="h-5 w-5" />
                    </Link>
                    <Link
                      to={`/admin/clients/${client.id}/edit`}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Edit client"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(client)}
                      className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Delete client"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {/* Progress Indicator */}
                <div className="mt-4">
                  {client.assignedFlows?.length > 0 ? (
                    <div className="space-y-2">
                      {client.assignedFlows.map((flow, index) => {
                        const flowProgress = progressData[client.id]?.[flow.flowId] || { progress: 0, status: 'not_started' };
                        
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600 dark:text-gray-300">
                                {flow.name}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {flowProgress.progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                                style={{ width: `${flowProgress.progress}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No flows assigned yet
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setClientToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Client"
        message="Are you sure you want to delete this client? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
} 