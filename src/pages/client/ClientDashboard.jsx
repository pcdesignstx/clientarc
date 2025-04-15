import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { currentUser, workspaceId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flows, setFlows] = useState([]);
  const [businessName, setBusinessName] = useState('');
  const [workspaceLogo, setWorkspaceLogo] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      console.log('Starting data fetch:', { 
        userId: currentUser?.uid, 
        workspaceId,
        email: currentUser?.email 
      });

      if (!currentUser || !workspaceId) {
        console.log('Missing required data:', { currentUser, workspaceId });
        setError('Missing authentication data');
        setLoading(false);
        return;
      }

      try {
        // Fetch workspace data
        const workspaceDoc = doc(db, 'workspaces', workspaceId);
        const workspaceSnapshot = await getDoc(workspaceDoc);
        
        if (!workspaceSnapshot.exists()) {
          console.error('Workspace not found:', workspaceId);
          setError('Workspace not found');
          setLoading(false);
          return;
        }

        const workspaceData = workspaceSnapshot.data();
        setWorkspaceLogo(workspaceData.logoUrl || '');
        setWorkspaceName(workspaceData.name || '');

        // Fetch client document directly using UID
        const clientDoc = doc(db, 'workspaces', workspaceId, 'clients', currentUser.uid);
        const clientSnapshot = await getDoc(clientDoc);
        
        if (!clientSnapshot.exists()) {
          console.error('Client document not found:', currentUser.uid);
          setError('Client profile not found');
          setLoading(false);
          return;
        }

        const clientData = clientSnapshot.data();
        console.log('Client data retrieved:', clientData);
        
        setBusinessName(clientData.businessName || '');
        const assignedFlows = clientData.assignedFlows || [];

        if (assignedFlows.length === 0) {
          console.log('No flows assigned to client');
          setFlows([]);
          setLoading(false);
          return;
        }

        // Fetch all assigned flows
        const flowPromises = assignedFlows.map(async (assignedFlow) => {
          try {
            const flowDoc = doc(db, 'workspaces', workspaceId, 'flows', assignedFlow.flowId);
            const flowSnapshot = await getDoc(flowDoc);

            if (!flowSnapshot.exists()) {
              console.error('Flow document not found:', assignedFlow.flowId);
              return null;
            }

            const flowData = flowSnapshot.data();
            console.log('Flow data retrieved:', { id: flowSnapshot.id, ...flowData });

            // Fetch responses for this flow
            const responseRef = doc(db, 'workspaces', workspaceId, 'clients', currentUser.uid, 'responses', assignedFlow.flowId);
            const responseDoc = await getDoc(responseRef);
            
            let progress = assignedFlow.progress || 0;
            let status = assignedFlow.status || 'not_started';

            if (responseDoc.exists()) {
              const responseData = responseDoc.data();
              console.log('Response data retrieved:', responseData);
              
              if (responseData.status) {
                status = responseData.status;
              }
              
              if (status === 'completed') {
                progress = 100;
              } else {
                // Calculate progress based on actual responses
                const totalQuestions = flowData.steps.reduce((total, step) => total + (step.questions?.length || 0), 0);
                const answeredQuestions = Object.entries(responseData).reduce((total, [stepId, stepResponses]) => {
                  if (stepId === 'lastUpdated' || stepId === 'status' || stepId === 'completedAt') return total;
                  const step = flowData.steps.find(s => s.id === stepId);
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

            return {
              id: flowSnapshot.id,
              name: flowData.name,
              description: flowData.description || '',
              progress,
              status,
              assignedAt: assignedFlow.assignedAt,
              lastUpdated: assignedFlow.lastUpdated
            };
          } catch (error) {
            console.error('Error fetching flow data:', error);
            return null;
          }
        });

        const fetchedFlows = (await Promise.all(flowPromises)).filter(Boolean);
        console.log('Final flows data:', fetchedFlows);
        setFlows(fetchedFlows);
        setError(null);
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError('Failed to load dashboard data');
        toast.error('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentUser, workspaceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow duration-300">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome Back{businessName ? `, ${businessName}` : ''}
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Here's what we have for you today
            </p>
          </div>

          {flows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No flows have been assigned to you yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  className="bg-gray-50 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200 border border-gray-100"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{flow.name}</h2>
                      <p className="mt-1 text-sm text-gray-600">{flow.description}</p>
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${flow.progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{flow.progress}%</span>
                        </div>
                        <div className="mt-1 flex flex-col gap-1">
                          <p className="text-xs text-gray-500 capitalize">
                            Status: {flow.status.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            Assigned on: {flow.assignedAt ? new Date(flow.assignedAt).toLocaleDateString() : 'Not assigned'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/client/flows/${flow.id}`)}
                      disabled={flow.status === 'completed'}
                      className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                        flow.status === 'completed'
                          ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                          : 'text-white bg-blue-600 hover:bg-blue-700 border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      }`}
                    >
                      {flow.status === 'completed' ? (
                        <>
                          <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Completed
                        </>
                      ) : flow.progress > 0 ? 'Continue' : 'Start'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 