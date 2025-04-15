import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { DocumentTextIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import ConfirmModal from '../../components/ConfirmModal';
import Card from '../../components/Card';

export default function Flows() {
  const navigate = useNavigate();
  const { currentUser, workspaceId } = useAuth();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState(null);

  useEffect(() => {
    const fetchFlows = async () => {
      console.log('Fetching flows with:', { currentUser, workspaceId });
      if (!workspaceId) {
        console.log('No workspace ID available');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const flowsRef = collection(db, 'workspaces', workspaceId, 'flows');
        const snapshot = await getDocs(flowsRef);

        const flowsData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Flow data:', {
            id: doc.id,
            name: data.name,
            description: data.description,
            steps: data.steps,
            sections: data.sections,
            rawData: data
          });
          
          // Convert sections to steps if needed
          const steps = data.steps || data.sections || [];
          console.log('Processed steps:', steps);
          
          return {
            id: doc.id,
            name: data.name || 'Untitled Flow',
            description: data.description || '',
            steps: steps,
            createdAt: data.createdAt?.toDate() || new Date(),
            createdBy: data.createdBy || currentUser.uid
          };
        });

        console.log('Setting flows:', flowsData);
        setFlows(flowsData);
      } catch (err) {
        console.error('Failed to fetch flows:', err);
        setError('Could not load flows.');
        toast.error('Failed to load flows');
      } finally {
        setLoading(false);
      }
    };

    fetchFlows();
  }, [currentUser, workspaceId]);

  const handleDelete = async () => {
    if (!workspaceId || !flowToDelete) return;

    try {
      const flowRef = doc(db, 'workspaces', workspaceId, 'flows', flowToDelete.id);
      await deleteDoc(flowRef);
      
      setFlows(prevFlows => prevFlows.filter(flow => flow.id !== flowToDelete.id));
      toast.success('Flow deleted successfully');
    } catch (error) {
      console.error('Error deleting flow:', error);
      toast.error('Failed to delete flow');
    } finally {
      setIsDeleteModalOpen(false);
      setFlowToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading flows...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">No Workspace Selected</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Please select a workspace to view flows.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flows</h1>
        {flows.length > 0 && (
          <button
            onClick={() => navigate('/admin/flows/create')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create New Flow
          </button>
        )}
      </div>

      {flows.length === 0 ? (
        <Card>
          <div className="text-center py-10 text-gray-500">
            <p>No flows found</p>
            <button 
              onClick={() => navigate('/admin/flows/create')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create New Flow
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {flows.map(flow => (
            <div 
              key={flow.id} 
              className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                    {flow.name}
                  </h3>
                  {flow.description && flow.description.trim() !== '' && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {flow.description}
                    </p>
                  )}
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => navigate(`/admin/flows/${flow.id}/edit`)}
                    className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-200 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="Edit flow"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      setFlowToDelete(flow);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete flow"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {flow.steps?.length > 0 && (
                  <div className="flex items-center text-sm">
                    <DocumentTextIcon className="w-5 h-5 mr-2 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {flow.steps.length} {flow.steps.length === 1 ? 'step' : 'steps'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="absolute inset-0 rounded-xl transition-opacity duration-300 opacity-0 group-hover:opacity-100 pointer-events-none bg-gradient-to-t from-blue-500/5 dark:from-blue-400/5 to-transparent"></div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setFlowToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Flow"
        message="Are you sure you want to delete this flow? This action cannot be undone."
      />
    </div>
  );
} 