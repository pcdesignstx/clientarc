import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function FlowViewer() {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const { currentUser: user, workspaceId } = useAuth();
  
  console.log('FlowViewer auth state:', { userId: user?.uid, workspaceId });

  // State management
  const [flow, setFlow] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Default fields for each step type
  const defaultFields = {
    'Business Info': [
      { id: 'company-name', type: 'text', label: 'Company Name' },
      { id: 'tagline', type: 'text', label: 'Tagline or Slogan' },
      { id: 'description', type: 'textarea', label: 'Brief Company Description' },
      { id: 'logo-url', type: 'text', label: 'Logo URL' },
      { id: 'primary-color', type: 'text', label: 'Primary Brand Color' },
      { id: 'secondary-color', type: 'text', label: 'Secondary Brand Color' }
    ],
    'Homepage Content': [
      { id: 'hero-title', type: 'text', label: 'Hero Section Title' },
      { id: 'hero-description', type: 'textarea', label: 'Hero Section Description' },
      { id: 'main-offer', type: 'textarea', label: 'Main Offer or Value Proposition' },
      { id: 'cta-text', type: 'text', label: 'Call to Action Text' },
      { id: 'feature-1', type: 'textarea', label: 'Key Feature 1' },
      { id: 'feature-2', type: 'textarea', label: 'Key Feature 2' },
      { id: 'feature-3', type: 'textarea', label: 'Key Feature 3' }
    ],
    'About Section': [
      { id: 'about-title', type: 'text', label: 'About Section Title' },
      { id: 'about-description', type: 'textarea', label: 'About Section Description' },
      { id: 'mission', type: 'textarea', label: 'Company Mission' },
      { id: 'vision', type: 'textarea', label: 'Company Vision' },
      { id: 'team-description', type: 'textarea', label: 'Team Description' }
    ],
    'Services/Products': [
      { id: 'service-1', type: 'textarea', label: 'Service/Product 1' },
      { id: 'service-1-desc', type: 'textarea', label: 'Service/Product 1 Description' },
      { id: 'service-2', type: 'textarea', label: 'Service/Product 2' },
      { id: 'service-2-desc', type: 'textarea', label: 'Service/Product 2 Description' },
      { id: 'service-3', type: 'textarea', label: 'Service/Product 3' },
      { id: 'service-3-desc', type: 'textarea', label: 'Service/Product 3 Description' }
    ],
    'Contact Info': [
      { id: 'phone', type: 'text', label: 'Phone Number' },
      { id: 'email', type: 'text', label: 'Email Address' },
      { id: 'address', type: 'textarea', label: 'Physical Address' },
      { id: 'hours', type: 'textarea', label: 'Business Hours' },
      { id: 'social-facebook', type: 'text', label: 'Facebook URL' },
      { id: 'social-instagram', type: 'text', label: 'Instagram URL' },
      { id: 'social-linkedin', type: 'text', label: 'LinkedIn URL' }
    ]
  };

  useEffect(() => {
    async function fetchFlow() {
      if (!user?.uid || !workspaceId) {
        console.log('Waiting for auth data...', { userId: user?.uid, workspaceId });
        return;
      }
      
      try {
        console.log('Starting flow fetch with:', { flowId, workspaceId, userId: user.uid });
        
        // First verify the client has access to this flow
        const clientRef = doc(db, 'workspaces', workspaceId, 'clients', user.uid);
        console.log('Fetching client document:', clientRef.path);
        const clientDoc = await getDoc(clientRef);
        
        if (!clientDoc.exists()) {
          console.log('Client document not found, creating new client document...');
          // Create a new client document if it doesn't exist
          await setDoc(clientRef, {
            createdAt: serverTimestamp(),
            email: user.email,
            assignedFlows: [],
            lastUpdated: serverTimestamp()
          });
          console.log('New client document created');
        }

        const clientData = clientDoc.exists() ? clientDoc.data() : { assignedFlows: [] };
        console.log('Client data retrieved:', clientData);
        
        // Check if flow is assigned, if not, assign it
        let assignedFlow = clientData.assignedFlows?.find(flow => flow.flowId === flowId);
        
        if (!assignedFlow) {
          console.log('Flow not assigned to client, assigning now...');
          // Fetch the flow data first to ensure it exists
          const flowRef = doc(db, 'workspaces', workspaceId, 'flows', flowId);
          const flowDoc = await getDoc(flowRef);
          
          if (!flowDoc.exists()) {
            console.error('Flow document not found:', flowRef.path);
            setError('Flow not found');
            setLoading(false);
            toast.error('Flow not found');
            return;
          }

          const flowData = flowDoc.data();
          
          // Add the flow to assignedFlows
          const updatedAssignedFlows = [
            ...(clientData.assignedFlows || []),
            {
              flowId,
              name: flowData.name,
              status: 'in_progress',
              progress: 0,
              assignedAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }
          ];

          // Update the client document with console logging
          console.log('Updating client document with new flow:', {
            flowId,
            assignedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          });

          await updateDoc(clientRef, {
            assignedFlows: updatedAssignedFlows,
            lastUpdated: serverTimestamp()
          });

          console.log('Flow assigned to client with date:', new Date().toISOString());
          assignedFlow = updatedAssignedFlows.find(flow => flow.flowId === flowId);
        }

        // Fetch the flow data
        const flowRef = doc(db, 'workspaces', workspaceId, 'flows', flowId);
        console.log('Fetching flow document:', flowRef.path);
        const flowDoc = await getDoc(flowRef);
        
        if (!flowDoc.exists()) {
          console.error('Flow document not found:', flowRef.path);
          setError('Flow not found');
          setLoading(false);
          toast.error('Flow not found');
          return;
        }

        const flowData = flowDoc.data();
        console.log('Flow data retrieved:', flowData);
        
        if (!flowData.steps || !Array.isArray(flowData.steps)) {
          console.error('Invalid flow structure:', flowData);
          setError('Invalid flow structure');
          setLoading(false);
          toast.error('Invalid flow structure');
          return;
        }

        // Fetch existing responses
        const responseRef = doc(db, 'workspaces', workspaceId, 'clients', user.uid, 'responses', flowId);
        console.log('Fetching responses:', responseRef.path);
        const responseDoc = await getDoc(responseRef);
        
        let existingResponses = {};
        if (responseDoc.exists()) {
          existingResponses = responseDoc.data();
          console.log('Found existing responses:', existingResponses);
        }

        // Process and set the flow data
        const processedFlow = {
          id: flowDoc.id,
          ...flowData,
          steps: flowData.steps.map(step => {
            console.log('Processing step:', step);
            return {
              ...step,
              questions: Array.isArray(step.questions) ? step.questions : []
            };
          })
        };

        console.log('Setting processed flow:', processedFlow);
        setFlow(processedFlow);
        setResponses(existingResponses);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching flow:', error);
        setError(error.message);
        setLoading(false);
        toast.error('Failed to load flow');
      }
    }

    fetchFlow();
  }, [flowId, workspaceId, user?.uid]);

  const handleResponseChange = (stepId, fieldId, value) => {
    // Only update if we have a valid value
    if (value !== undefined && value !== null) {
      setResponses(prev => ({
        ...prev,
        [stepId]: {
          ...prev[stepId],
          [fieldId]: value,
          timestamp: serverTimestamp()
        }
      }));
    }
  };

  const handleNext = async () => {
    if (!flow || saving || !user?.uid || !workspaceId) return;

    const currentStepId = flow.steps[currentStep].id;
    setSaving(true);

    try {
      // Clean up responses before saving - remove any undefined values
      const cleanResponses = Object.entries(responses || {}).reduce((acc, [stepId, stepResponses]) => {
        if (!stepResponses) return acc;
        
        const cleanStepResponses = Object.entries(stepResponses || {}).reduce((stepAcc, [fieldId, value]) => {
          if (value !== undefined && value !== null) {
            stepAcc[fieldId] = value;
          }
          return stepAcc;
        }, {});
        
        if (Object.keys(cleanStepResponses).length > 0) {
          acc[stepId] = cleanStepResponses;
        }
        return acc;
      }, {});

      // Save responses
      const responseRef = doc(db, 'workspaces', workspaceId, 'clients', user.uid, 'responses', flowId);
      const isLastStep = currentStep === flow.steps.length - 1;
      
      await setDoc(responseRef, {
        ...cleanResponses,
        lastUpdated: serverTimestamp(),
        status: isLastStep ? 'completed' : 'in_progress',
        completedAt: isLastStep ? serverTimestamp() : null
      }, { merge: true });

      // Update client progress - only if we have valid responses
      const currentStepResponses = cleanResponses[currentStepId] || {};
      if (Object.keys(currentStepResponses).length > 0) {
        const progressRef = doc(db, 'workspaces', workspaceId, 'clients', user.uid, 'progress', flowId);
        
        // First check if the document exists
        const progressDoc = await getDoc(progressRef);
        if (!progressDoc.exists()) {
          // Create the document if it doesn't exist
          await setDoc(progressRef, {
            steps: {},
            lastUpdated: serverTimestamp()
          });
        }
        
        // Now update the document
        await updateDoc(progressRef, {
          [`steps.${currentStepId}.responses`]: currentStepResponses,
          [`steps.${currentStepId}.completed`]: true,
          [`steps.${currentStepId}.completedAt`]: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
      }

      // Calculate progress
      const totalQuestions = flow.steps.reduce((total, step) => total + (step.questions?.length || 0), 0);
      const answeredQuestions = Object.entries(currentStepResponses).reduce((total, [questionId, response]) => {
        const step = flow.steps.find(s => s.id === questionId);
        const validResponses = step?.questions?.filter(q => {
          const stepResponse = currentStepResponses[q.id];
          return stepResponse && (
            (typeof stepResponse === 'string' && stepResponse.trim() !== '') ||
            (Array.isArray(stepResponse) && stepResponse.length > 0)
          );
        }).length || 0;
        return total + validResponses;
      }, 0);
      
      const progress = Math.round((answeredQuestions / totalQuestions) * 100);

      // Update client document
      const clientRef = doc(db, 'workspaces', workspaceId, 'clients', user.uid);
      const clientDoc = await getDoc(clientRef);
      
      if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        const assignedFlows = clientData.assignedFlows || [];
        const flowIndex = assignedFlows.findIndex(f => f.flowId === flowId);
        
        if (flowIndex !== -1) {
          const updatedFlows = [...assignedFlows];
          updatedFlows[flowIndex] = {
            ...assignedFlows[flowIndex],
            progress: progress,
            status: isLastStep ? 'completed' : 'in_progress',
            lastUpdated: new Date().toISOString(),
            completedAt: isLastStep ? new Date().toISOString() : null
          };
          
          await updateDoc(clientRef, {
            assignedFlows: updatedFlows,
            lastUpdated: serverTimestamp()
          });
        }
      }

      if (isLastStep) {
        toast.success('Flow completed successfully!');
        navigate('/client/dashboard');
      } else {
        setCurrentStep(prev => prev + 1);
        toast.success('Progress saved');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (stepId, questionId, files) => {
    if (!user?.uid || !workspaceId) return;
    
    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        // Create a unique filename with timestamp
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `${timestamp}.${fileExtension}`;
        
        // Upload to Firebase Storage
        const fileRef = ref(storage, `uploads/${workspaceId}/clients/${user.uid}/flows/${flowId}/${stepId}/${questionId}/${fileName}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);
        
        return {
          fileName: file.name,
          fileUrl,
          uploadedAt: new Date().toISOString()
        };
      });
      
      const uploadedFiles = await Promise.all(uploadPromises);
      
      setResponses(prev => ({
        ...prev,
        [stepId]: {
          ...prev[stepId],
          [questionId]: uploadedFiles
        }
      }));
      
      toast.success('Files uploaded successfully!');
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const renderQuestion = (question, index) => {
    // Get the question text, handling both string and object formats
    const questionText = typeof question.text === 'string' ? question.text : question.text?.text || '';

    switch (question.type) {
      case 'short_answer':
        return (
          <input
            type="text"
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter your answer"
            value={responses[step.id]?.[question.id] || ''}
            onChange={(e) => handleResponseChange(step.id, question.id, e.target.value)}
          />
        );
      case 'long_answer':
        return (
          <textarea
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter your answer"
            value={responses[step.id]?.[question.id] || ''}
            onChange={(e) => handleResponseChange(step.id, question.id, e.target.value)}
          />
        );
      case 'dropdown':
        return (
          <select
            className="w-full px-3 py-2 border rounded"
            value={responses[step.id]?.[question.id] || ''}
            onChange={(e) => handleResponseChange(step.id, question.id, e.target.value)}
          >
            <option value="">Select an option</option>
            {question.options?.map((option, i) => {
              // Handle both string and object options
              const optionValue = typeof option === 'string' ? option : option.value || option.text || '';
              const optionLabel = typeof option === 'string' ? option : option.label || option.text || optionValue;
              return (
                <option key={i} value={optionValue}>{optionLabel}</option>
              );
            })}
          </select>
        );
      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {question.options?.map((option, i) => {
              // Handle both string and object options
              const optionValue = typeof option === 'string' ? option : option.value || option.text || '';
              const optionLabel = typeof option === 'string' ? option : option.label || option.text || optionValue;
              return (
                <label key={i} className="flex items-center">
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={optionValue}
                    checked={responses[step.id]?.[question.id] === optionValue}
                    onChange={(e) => handleResponseChange(step.id, question.id, e.target.value)}
                    className="mr-2"
                  />
                  {optionLabel}
                </label>
              );
            })}
          </div>
        );
      case 'yes_no':
        return (
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name={`question-${index}`}
                value="Yes"
                checked={responses[step.id]?.[question.id] === 'Yes'}
                onChange={(e) => handleResponseChange(step.id, question.id, e.target.value)}
                className="mr-2"
              />
              Yes
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={`question-${index}`}
                value="No"
                checked={responses[step.id]?.[question.id] === 'No'}
                onChange={(e) => handleResponseChange(step.id, question.id, e.target.value)}
                className="mr-2"
              />
              No
            </label>
          </div>
        );
      case 'file_upload':
        return (
          <div className="space-y-2">
            <input
              type="file"
              onChange={(e) => handleFileUpload(step.id, question.id, Array.from(e.target.files))}
              className="w-full"
            />
            {responses[step.id]?.[question.id] && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">Uploaded: {responses[step.id][question.id]}</p>
              </div>
            )}
          </div>
        );
      case 'color':
        const colorValue = responses[step.id]?.[question.id] || '#000000';
        return (
          <div className="flex items-center space-x-4">
            <input
              type="color"
              value={colorValue}
              onChange={(e) => handleResponseChange(step.id, question.id, e.target.value)}
              className="h-10 w-20"
            />
            <input
              type="text"
              value={colorValue}
              onChange={(e) => handleResponseChange(step.id, question.id, e.target.value)}
              placeholder="#000000"
              className="px-3 py-2 border rounded"
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your flow...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we retrieve your content.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Flow</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/client/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!flow || !flow.steps || !flow.steps[currentStep]) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Flow Not Found</h1>
          <p className="text-gray-600 mb-4">The requested flow could not be found or has an invalid structure.</p>
          <button
            onClick={() => navigate('/client/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const step = flow.steps[currentStep];
  console.log('Current step:', step);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/client/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="mr-2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          <div className="text-sm font-medium text-gray-700">
            Step {currentStep + 1} of {flow.steps.length}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / flow.steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Content */}
        <div className="mt-6 space-y-6">
          {step.questions?.map((question, index) => (
            <div key={question.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {question.label || question.text || `Question ${index + 1}`}
              </label>
              {renderQuestion(question, index)}
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => handleNext()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {currentStep === flow.steps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}