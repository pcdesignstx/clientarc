import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/Card';
import ConfirmModal from '../../components/ConfirmModal';
import { toast } from 'react-hot-toast';

export default function FlowDetail() {
  const { flowId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);

  useEffect(() => {
    const fetchFlow = async () => {
      if (!currentUser?.workspaceId || !flowId) return;

      try {
        const flowRef = doc(db, 'workspaces', currentUser.workspaceId, 'flows', flowId);
        const flowDoc = await getDoc(flowRef);

        if (!flowDoc.exists()) {
          setError('Flow not found');
          return;
        }

        const flowData = flowDoc.data();
        setFlow({
          ...flowData,
          id: flowDoc.id,
          // Convert Firestore timestamp to Date if it exists
          createdAt: flowData.createdAt?.toDate?.() || new Date()
        });

        // Select the first step by default
        if (flowData.steps && flowData.steps.length > 0) {
          setSelectedStep(flowData.steps[0].id);
        }
      } catch (err) {
        console.error('Error fetching flow:', err);
        setError('Failed to load flow');
        toast.error('Failed to load flow details');
      } finally {
        setLoading(false);
      }
    };

    fetchFlow();
  }, [currentUser?.workspaceId, flowId]);

  const handleDelete = async () => {
    if (!currentUser?.workspaceId || !flowId) return;

    setIsDeleting(true);
    try {
      const flowRef = doc(db, 'workspaces', currentUser.workspaceId, 'flows', flowId);
      await deleteDoc(flowRef);
      toast.success('Flow deleted successfully');
      navigate('/flows');
    } catch (err) {
      console.error('Error deleting flow:', err);
      toast.error('Failed to delete flow');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const getSelectedStepData = () => {
    if (!flow || !selectedStep) return null;
    return flow.steps.find(step => step.id === selectedStep);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/flows')}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Flows
          </button>
        </div>
        <Card>
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!flow) return null;

  return (
    <div className="h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {flow.name}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Created on {flow.createdAt?.toLocaleDateString() || 'Unknown date'}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate(`/flows/${flowId}/edit`)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit Flow
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Flow
            </button>
            <button
              onClick={() => navigate('/flows')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Flows
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-md rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Steps
              </h2>
              <div className="space-y-2">
                {flow.steps.map((step) => (
                  <div
                    key={step.id}
                    onClick={() => setSelectedStep(step.id)}
                    className={`p-3 rounded-md cursor-pointer ${
                      selectedStep === step.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {step.name || 'Untitled Step'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            {selectedStep ? (
              <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-md rounded-lg p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {getSelectedStepData()?.name || 'Untitled Step'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {getSelectedStepData()?.description || 'No description provided'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      Questions
                    </h4>
                    <div className="space-y-4">
                      {getSelectedStepData()?.questions?.map((question) => (
                        <div
                          key={question.id}
                          className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {question.text}
                              </p>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {question.type}
                              </span>
                            </div>
                          </div>

                          {question.options && question.options.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Options:
                              </p>
                              <ul className="space-y-1">
                                {question.options.map((option) => (
                                  <li
                                    key={option.id}
                                    className="text-sm text-gray-600 dark:text-gray-300"
                                  >
                                    • {option.text}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-md rounded-lg p-6">
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Select a step
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Choose a step from the sidebar to view its details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 