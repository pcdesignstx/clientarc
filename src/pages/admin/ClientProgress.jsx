import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs, query, where, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon, EnvelopeIcon, ArrowPathIcon, ArrowDownTrayIcon, PhotoIcon, PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { getFunctions } from 'firebase/functions';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '../../lib/firebase';

export default function ClientProgress() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user, workspaceId } = useAuth();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [flowData, setFlowData] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingImages, setDownloadingImages] = useState(false);
  const [hasImages, setHasImages] = useState(false);
  const [showAssignFlowModal, setShowAssignFlowModal] = useState(false);
  const [availableFlows, setAvailableFlows] = useState([]);
  const [selectedFlowTemplate, setSelectedFlowTemplate] = useState(null);
  const [customFlowName, setCustomFlowName] = useState('');
  const [hasResponses, setHasResponses] = useState(false);

  useEffect(() => {
    const fetchClientAndFlows = async () => {
      if (!workspaceId) {
        setError('No workspace found');
        setLoading(false);
        return;
      }

      try {
        // Fetch client document
        const clientRef = doc(db, 'workspaces', workspaceId, 'clients', clientId);
        const clientDoc = await getDoc(clientRef);

        if (!clientDoc.exists()) {
          setError('Client not found');
          setLoading(false);
          return;
        }

        const clientData = clientDoc.data();
        
        // Fetch flow details for each assigned flow
        const flowsPromises = (clientData.assignedFlows || []).map(async (flow) => {
          try {
            const flowRef = doc(db, 'workspaces', workspaceId, 'flows', flow.flowId);
            const flowDoc = await getDoc(flowRef);
            
            if (!flowDoc.exists()) {
              return {
                ...flow,
                flowName: 'Unnamed Flow',
                steps: [],
              };
            }

            const flowData = flowDoc.data();

            // Fetch responses for this flow to determine step completion
            const responseRef = doc(db, 'workspaces', workspaceId, 'clients', clientId, 'responses', flow.flowId);
            const responseDoc = await getDoc(responseRef);
            const responseData = responseDoc.exists() ? responseDoc.data() : {};

            // Get steps array (handle both steps and sections naming)
            const steps = flowData.steps || flowData.sections || [];

            // Calculate completed steps based on responses
            const completedSteps = steps.reduce((completed, step, index) => {
              const stepResponses = responseData[step.id] || {};
              const hasResponses = step.questions?.some(q => {
                const response = stepResponses[q.id];
                return response && (
                  (typeof response === 'string' && response.trim() !== '') ||
                  (Array.isArray(response) && response.length > 0)
                );
              });
              
              // If this step has responses and all previous steps are completed
              if (hasResponses && (index === 0 || completed.includes(steps[index - 1].id))) {
                completed.push(step.id);
              }
              return completed;
            }, []);

            return {
              ...flow,
              id: flowDoc.id,
              flowName: flowData.title || flowData.name || 'Unnamed Flow',
              steps: steps,
              completedSteps,
              status: responseData.status || flow.status || 'in_progress',
              dueDate: flow.dueDate
            };
          } catch (error) {
            console.error('Error fetching flow:', error);
            return {
              ...flow,
              flowName: 'Error loading flow',
              steps: [],
              completedSteps: []
            };
          }
        });

        const flowsWithDetails = await Promise.all(flowsPromises);
        
        // Set the first flow as selected by default
        if (flowsWithDetails.length > 0) {
          setSelectedFlow(flowsWithDetails[0]);
        }

        setClient({
          id: clientDoc.id,
          ...clientData,
          fullName: clientData.fullName || clientData.name || (clientData.firstName && clientData.lastName ? `${clientData.firstName} ${clientData.lastName}` : 'Unnamed Client'),
          assignedFlows: flowsWithDetails,
        });
        setError(null);
      } catch (error) {
        console.error('Error fetching client:', error);
        setError('Failed to load client data');
        toast.error('Failed to load client data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchClientAndFlows();
  }, [clientId, workspaceId]);

  useEffect(() => {
    const checkForImages = async () => {
      if (!workspaceId || !clientId || !selectedFlow) {
        console.log('Missing required data for image check:', { workspaceId, clientId, selectedFlow });
        return;
      }

      try {
        console.log('Checking for images in flow:', selectedFlow.flowId);
        const responseRef = doc(db, 'workspaces', workspaceId, 'clients', clientId, 'responses', selectedFlow.flowId);
        const responseDoc = await getDoc(responseRef);
        const responseData = responseDoc.exists() ? responseDoc.data() : {};
        
        console.log('Full response data structure:', {
          keys: Object.keys(responseData),
          metadata: {
            lastUpdated: responseData.lastUpdated,
            status: responseData.status,
            completedAt: responseData.completedAt
          }
        });

        // Check each step's responses for image URLs
        let foundImages = false;
        for (const stepId of Object.keys(responseData)) {
          if (stepId === 'lastUpdated' || stepId === 'status' || stepId === 'completedAt') continue;
          
          const stepResponses = responseData[stepId];
          console.log('Checking step:', stepId, 'responses structure:', {
            keys: Object.keys(stepResponses),
            sampleResponse: stepResponses[Object.keys(stepResponses)[0]]
          });
          
          for (const questionId of Object.keys(stepResponses)) {
            const response = stepResponses[questionId];
            console.log('Checking question:', questionId, 'response type:', typeof response, 'response value:', response);
            
            // Handle both string and array responses
            const responsesToCheck = Array.isArray(response) ? response : [response];
            
            for (const resp of responsesToCheck) {
              // Check for file upload responses that contain fileUrl
              if (typeof resp === 'object' && resp.fileUrl) {
                const fileUrl = resp.fileUrl;
                console.log('Found file upload response with URL:', fileUrl);
                
                // Check if the file is an image
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
                if (imageExtensions.some(ext => fileUrl.toLowerCase().includes(ext))) {
                  console.log('Found image URL in file upload:', fileUrl);
                  foundImages = true;
                  break;
                }
              }
              
              // Check for direct image URLs
              if (typeof resp === 'string') {
                if (resp.startsWith('https://') || resp.startsWith('http://') || resp.startsWith('gs://')) {
                  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
                  if (imageExtensions.some(ext => resp.toLowerCase().includes(ext))) {
                    console.log('Found image URL by extension:', resp);
                    foundImages = true;
                    break;
                  }
                }
                
                // Check for Firebase Storage URLs
                if (resp.includes('firebasestorage.googleapis.com')) {
                  console.log('Found Firebase Storage URL:', resp);
                  foundImages = true;
                  break;
                }

                // Check for base64 encoded images
                if (resp.startsWith('data:image/')) {
                  console.log('Found base64 encoded image');
                  foundImages = true;
                  break;
                }

                // Check for image filenames
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
                if (imageExtensions.some(ext => resp.toLowerCase().includes(ext))) {
                  console.log('Found image filename:', resp);
                  foundImages = true;
                  break;
                }
              }
            }
            if (foundImages) break;
          }
          if (foundImages) break;
        }

        console.log('Final image check result:', { 
          foundImages, 
          responseDataKeys: Object.keys(responseData),
          sampleStep: responseData[Object.keys(responseData)[0]],
          hasResponses: Object.keys(responseData).length > 0
        });
        setHasImages(foundImages);
      } catch (error) {
        console.error('Error checking for images:', error);
        setHasImages(false);
      }
    };

    checkForImages();
  }, [workspaceId, clientId, selectedFlow]);

  // Add a debug log for the button rendering
  useEffect(() => {
    console.log('Button visibility state:', { hasImages, hasResponses, selectedFlow });
  }, [hasImages, hasResponses, selectedFlow]);

  useEffect(() => {
    const checkForResponses = async () => {
      if (!workspaceId || !clientId || !selectedFlow) return;

      try {
        const responseRef = doc(db, 'workspaces', workspaceId, 'clients', clientId, 'responses', selectedFlow.flowId);
        const responseDoc = await getDoc(responseRef);
        const responseData = responseDoc.exists() ? responseDoc.data() : {};

        // Check if there are any responses
        let foundResponses = false;
        for (const stepId of Object.keys(responseData)) {
          if (stepId === 'lastUpdated' || stepId === 'status' || stepId === 'completedAt') continue;
          const stepResponses = responseData[stepId];
          for (const questionId of Object.keys(stepResponses)) {
            const response = stepResponses[questionId];
            if (response && (
              (typeof response === 'string' && response.trim() !== '') ||
              (Array.isArray(response) && response.length > 0)
            )) {
              foundResponses = true;
              break;
            }
          }
          if (foundResponses) break;
        }

        setHasResponses(foundResponses);
      } catch (error) {
        console.error('Error checking for responses:', error);
        setHasResponses(false);
      }
    };

    checkForResponses();
  }, [workspaceId, clientId, selectedFlow]);

  const calculateProgress = (flow) => {
    if (!flow || !flow.steps || !flow.completedSteps) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    
    const total = flow.steps.length;
    const completed = flow.completedSteps.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  const handleFlowSelect = (flow) => {
    setSelectedFlow(flow);
  };

  const handleFlowDueDateChange = async (date) => {
    if (!workspaceId || !client || !selectedFlow) return;

    try {
      const clientRef = doc(db, 'workspaces', workspaceId, 'clients', clientId);
      const clientDoc = await getDoc(clientRef);
      
      if (clientDoc.exists()) {
        const assignedFlows = clientDoc.data().assignedFlows || [];
        const updatedFlows = assignedFlows.map(flow => {
          if (flow.flowId === selectedFlow.flowId) {
            return {
              ...flow,
              dueDate: date
            };
          }
          return flow;
        });

        await updateDoc(clientRef, {
          assignedFlows: updatedFlows
        });

        setFlowData(selectedFlow);
        toast.success('Due date updated successfully');
      }
    } catch (error) {
      console.error('Error updating due date:', error);
      toast.error('Failed to update due date');
    }
  };

  const isFlowOverdue = () => {
    if (!flowData?.dueDate) return false;
    return new Date() > flowData.dueDate;
  };

  const handleSendReminder = async (flowId) => {
    if (!workspaceId || !client || !flowId) {
      toast.error('Missing required information to send reminder');
      return;
    }

    const flow = client.assignedFlows?.find(f => f.flowId === flowId);
    if (!flow) {
      toast.error('Flow not found');
      return;
    }

    setSendingReminder(true);
    try {
      const response = await fetch('https://sendreminderemail-izil7fxcdq-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientEmail: client.email,
          clientName: client.name || client.fullName,
          flowName: flow.flowName || flow.name,
          dueDate: flow.dueDate?.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reminder');
      }

      toast.success('Reminder sent successfully');
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleDownloadResponses = async () => {
    if (!workspaceId || !client || !selectedFlow) {
      toast.error('Missing required information to download responses');
      return;
    }

    setDownloading(true);
    try {
      // Fetch responses for the selected flow
      const responseRef = doc(db, 'workspaces', workspaceId, 'clients', clientId, 'responses', selectedFlow.flowId);
      const responseDoc = await getDoc(responseRef);
      const responseData = responseDoc.exists() ? responseDoc.data() : {};

      // Format responses into readable text
      let formattedContent = `Client: ${client.fullName || client.name}\n`;
      formattedContent += `Flow: ${selectedFlow.flowName}\n`;
      formattedContent += `Date: ${new Date().toLocaleDateString()}\n\n`;

      selectedFlow.steps?.forEach((step, stepIndex) => {
        formattedContent += `Step ${stepIndex + 1}: ${step.title}\n`;
        if (step.description) {
          formattedContent += `Description: ${step.description}\n`;
        }
        formattedContent += '----------------------------------------\n';

        const stepResponses = responseData[step.id] || {};
        step.questions?.forEach((question, qIndex) => {
          const response = stepResponses[question.id];
          formattedContent += `Q${qIndex + 1}: ${question.text}\n`;
          if (response) {
            if (Array.isArray(response)) {
              formattedContent += `A: ${response.join(', ')}\n`;
            } else {
              formattedContent += `A: ${response}\n`;
            }
          } else {
            formattedContent += `A: No response provided\n`;
          }
          formattedContent += '\n';
        });
        formattedContent += '\n';
      });

      // Create and trigger download
      const blob = new Blob([formattedContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${client.fullName || client.name}_${selectedFlow.flowName}_responses.txt`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Responses downloaded successfully');
    } catch (error) {
      console.error('Error downloading responses:', error);
      toast.error('Failed to download responses');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadImages = async () => {
    if (!workspaceId || !clientId || !selectedFlow || !hasImages) {
      toast.error('No valid images found to download');
      return;
    }

    setDownloadingImages(true);
    try {
      // Check for authentication first
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('User not authenticated. Cannot download images.');
        toast.error('You must be logged in to download images');
        return;
      }

      // Get the ID token with error handling
      let idToken;
      try {
        idToken = await currentUser.getIdToken();
      } catch (authError) {
        console.error('Failed to get authentication token:', authError);
        toast.error('Authentication failed. Please try logging in again.');
        return;
      }

      const responseRef = doc(db, 'workspaces', workspaceId, 'clients', clientId, 'responses', selectedFlow.flowId);
      const responseDoc = await getDoc(responseRef);
      const responseData = responseDoc.exists() ? responseDoc.data() : {};

      const zip = new JSZip();
      let imageCount = 0;
      let failedDownloads = 0;

      const stepDetails = selectedFlow.steps?.reduce((acc, step) => {
        acc[step.id] = step;
        return acc;
      }, {});

      const folder = zip.folder('images');

      for (const stepId of Object.keys(responseData)) {
        if (stepId === 'lastUpdated' || stepId === 'status' || stepId === 'completedAt') continue;
        
        const stepResponses = responseData[stepId];
        const step = stepDetails?.[stepId];
        
        for (const questionId of Object.keys(stepResponses)) {
          const response = stepResponses[questionId];
          const responsesToProcess = Array.isArray(response) ? response : [response];
          
          for (const resp of responsesToProcess) {
            let imageUrl = null;
            let originalFilename = null;

            if (typeof resp === 'object' && resp.fileUrl) {
              imageUrl = resp.fileUrl;
              originalFilename = resp.fileName || null;
            } else if (typeof resp === 'string') {
              const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
              
              if (resp.startsWith('https://') || resp.startsWith('http://')) {
                imageUrl = resp;
                const urlParts = resp.split('/');
                originalFilename = urlParts[urlParts.length - 1].split('?')[0];
              } else if (resp.startsWith('gs://')) {
                const bucket = 'clientgateway-668db.firebasestorage.app';
                const storagePath = resp.replace('gs://', '').split('/').slice(1).join('/');
                imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storagePath)}?alt=media`;
                originalFilename = storagePath.split('/').pop();
              } else if (resp.includes('firebasestorage.googleapis.com')) {
                imageUrl = resp;
                const urlParts = resp.split('/');
                originalFilename = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
              } else if (resp.startsWith('data:image/')) {
                imageUrl = resp;
                originalFilename = `image_${imageCount}.${resp.split(';')[0].split('/')[1]}`;
              } else if (imageExtensions.some(ext => resp.toLowerCase().includes(ext))) {
                const storagePath = `uploads/${workspaceId}/clients/${clientId}/flows/${selectedFlow.flowId}/${resp}`;
                imageUrl = `https://firebasestorage.googleapis.com/v0/b/clientgateway-668db.firebasestorage.app/o/${encodeURIComponent(storagePath)}?alt=media`;
                originalFilename = resp;
              }
            }

            if (imageUrl) {
              try {
                console.log('Attempting to download image from:', imageUrl);
                
                const fetchOptions = {
                  method: 'GET',
                  headers: {},
                  mode: 'cors'
                };

                // Add authorization header for Firebase Storage URLs
                if (imageUrl.includes('firebasestorage.googleapis.com')) {
                  fetchOptions.headers['Authorization'] = `Bearer ${idToken}`;
                }

                const imageResponse = await fetch(imageUrl, fetchOptions);
                
                if (!imageResponse.ok) {
                  throw new Error(`HTTP error! status: ${imageResponse.status}`);
                }
                
                const blob = await imageResponse.blob();
                
                const question = step?.questions?.find(q => q.id === questionId);
                const stepTitle = step?.title?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'step';
                const questionText = question?.text?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'image';
                
                let filename;
                if (originalFilename) {
                  filename = originalFilename;
                } else {
                  const extension = blob.type.split('/')[1] || 'jpg';
                  filename = `${stepTitle}_${questionText}_${imageCount}.${extension}`;
                }
                
                folder.file(filename, blob);
                imageCount++;
                console.log('Successfully added image to zip:', filename);
              } catch (error) {
                console.error('Error downloading image:', error);
                failedDownloads++;
                toast.error(`Failed to download image: ${error.message}`);
              }
            }
          }
        }
      }

      if (imageCount > 0) {
        const content = await zip.generateAsync({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: {
            level: 9
          }
        });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${client.fullName || client.name}_${selectedFlow.flowName}_images.zip`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        if (failedDownloads > 0) {
          toast.warning(`Downloaded ${imageCount} images, but ${failedDownloads} failed`);
        } else {
          toast.success(`Successfully downloaded ${imageCount} images`);
        }
      } else {
        toast.error('No valid images found to download');
      }
    } catch (error) {
      console.error('Error downloading images:', error);
      toast.error('Failed to download images');
    } finally {
      setDownloadingImages(false);
    }
  };

  const handleAssignFlow = async () => {
    if (!workspaceId || !clientId || !selectedFlowTemplate) {
      toast.error('Missing required information to assign flow');
      return;
    }

    try {
      const clientRef = doc(db, 'workspaces', workspaceId, 'clients', clientId);
      const clientDoc = await getDoc(clientRef);
      
      if (clientDoc.exists()) {
        const assignedFlows = clientDoc.data().assignedFlows || [];
        const flowCount = assignedFlows.filter(f => f.flowTemplateId === selectedFlowTemplate.id).length;
        
        // Generate a unique ID for this flow instance
        const assignedFlowId = uuidv4();
        
        // Create the new flow instance
        const newFlowInstance = {
          assignedFlowId,
          flowTemplateId: selectedFlowTemplate.id,
          flowName: customFlowName || `${selectedFlowTemplate.title} #${flowCount + 1}`,
          assignedAt: new Date().toISOString(),
          status: 'incomplete',
          dueDate: null,
          completedSteps: [],
          steps: selectedFlowTemplate.steps || []
        };

        // Update the client document
        await updateDoc(clientRef, {
          assignedFlows: arrayUnion(newFlowInstance),
          lastUpdated: serverTimestamp()
        });

        // Refresh the client data
        await fetchClientAndFlows();
        
        toast.success('Flow assigned successfully');
        setShowAssignFlowModal(false);
        setSelectedFlowTemplate(null);
        setCustomFlowName('');
      }
    } catch (error) {
      console.error('Error assigning flow:', error);
      toast.error('Failed to assign flow');
    }
  };

  const fetchAvailableFlows = async () => {
    if (!workspaceId) return;

    try {
      const flowsRef = collection(db, 'workspaces', workspaceId, 'flows');
      const flowsSnapshot = await getDocs(flowsRef);
      const flows = flowsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableFlows(flows);
    } catch (error) {
      console.error('Error fetching available flows:', error);
      toast.error('Failed to load available flows');
    }
  };

  useEffect(() => {
    if (showAssignFlowModal) {
      fetchAvailableFlows();
    }
  }, [showAssignFlowModal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{error}</h3>
          <button
            onClick={() => navigate('/admin/clients')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Clients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {client?.fullName || client?.name || (client?.firstName && client?.lastName ? `${client?.firstName} ${client?.lastName}` : 'Unnamed Client')}'s Progress
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Track progress through assigned flows
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAssignFlowModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Assign New Flow
            </button>
            <Link
              to="/admin/clients"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <ArrowLeftIcon className="mr-2 -ml-1 h-5 w-5" aria-hidden="true" />
              Back to Clients
            </Link>
          </div>
        </div>

        {/* Assign Flow Modal */}
        {showAssignFlowModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Assign New Flow
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="flowTemplate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Flow Template
                  </label>
                  <select
                    id="flowTemplate"
                    value={selectedFlowTemplate?.id || ''}
                    onChange={(e) => {
                      const flow = availableFlows.find(f => f.id === e.target.value);
                      setSelectedFlowTemplate(flow);
                    }}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a flow...</option>
                    {availableFlows.map((flow) => (
                      <option key={flow.id} value={flow.id}>
                        {flow.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="customName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Custom Flow Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="customName"
                    value={customFlowName}
                    onChange={(e) => setCustomFlowName(e.target.value)}
                    placeholder="e.g., Homepage Content - Round 2"
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAssignFlowModal(false);
                      setSelectedFlowTemplate(null);
                      setCustomFlowName('');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignFlow}
                    disabled={!selectedFlowTemplate}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Assign Flow
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              {selectedFlow && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {selectedFlow.flowName}
                      </h2>
                      {selectedFlow.dueDate && (
                        <p className={`text-sm ${isFlowOverdue() ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          Due: {new Date(selectedFlow.dueDate).toLocaleDateString()}
                          {isFlowOverdue() && (
                            <span className="ml-2 inline-flex items-center">
                              <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                              Overdue
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Overall Progress
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {calculateProgress(selectedFlow).percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full"
                        style={{ width: `${calculateProgress(selectedFlow).percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedFlow.steps?.map((step, index) => (
                      <div
                        key={step.id}
                        className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          selectedFlow.completedSteps.includes(step.id)
                            ? 'bg-green-100 dark:bg-green-900/20'
                            : 'bg-gray-100 dark:bg-gray-600'
                        }`}>
                          {selectedFlow.completedSteps.includes(step.id) ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            {step.title}
                          </h3>
                          {step.description && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Progress Summary
                </h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Total Steps
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                      {calculateProgress(selectedFlow).total}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Completed Steps
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
                      {calculateProgress(selectedFlow).completed}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Remaining Steps
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
                      {calculateProgress(selectedFlow).total - calculateProgress(selectedFlow).completed}
                    </dd>
                  </div>
                </dl>
              </div>

              {selectedFlow && (
                <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Actions
                  </h3>
                  <div className="space-y-3">
                    {hasImages && (
                      <button
                        onClick={handleDownloadImages}
                        disabled={downloadingImages}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {downloadingImages ? (
                          <>
                            <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Downloading Images...
                          </>
                        ) : (
                          <>
                            <PhotoIcon className="-ml-1 mr-2 h-4 w-4" />
                            Download Images
                          </>
                        )}
                      </button>
                    )}
                    {hasResponses && (
                      <button
                        onClick={handleDownloadResponses}
                        disabled={downloading}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {downloading ? (
                          <>
                            <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <ArrowDownTrayIcon className="-ml-1 mr-2 h-4 w-4" />
                            Download Responses
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleSendReminder(selectedFlow.id)}
                      disabled={sendingReminder}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingReminder ? (
                        <>
                          <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <EnvelopeIcon className="-ml-1 mr-2 h-4 w-4" />
                          Send Reminder
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {client?.assignedFlows?.length > 1 && (
                <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Other Flows
                  </h3>
                  <div className="space-y-2">
                    {client.assignedFlows.map((flow) => (
                      <button
                        key={flow.id}
                        onClick={() => handleFlowSelect(flow)}
                        className={`w-full text-left px-4 py-2 rounded-md text-sm font-medium ${
                          selectedFlow?.id === flow.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        {flow.flowName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 