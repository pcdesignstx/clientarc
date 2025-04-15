import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function ClientView() {
  const { clientId } = useParams();
  const { user } = useAuth();
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');

  useEffect(() => {
    async function fetchFlow() {
      try {
        const flowRef = doc(db, 'workspaces', user.workspaceId, 'clients', clientId, 'assignedFlow');
        const flowDoc = await getDoc(flowRef);
        
        if (!flowDoc.exists()) {
          toast.error('Flow not found');
          return;
        }

        const flowData = flowDoc.data();
        setFlow(flowData);
        
        // Set current response if exists
        if (flowData.steps[flowData.progress]?.response) {
          setCurrentResponse(flowData.steps[flowData.progress].response);
        }
      } catch (error) {
        console.error('Error fetching flow:', error);
        toast.error('Failed to load flow');
      } finally {
        setLoading(false);
      }
    }

    fetchFlow();
  }, [clientId, user.workspaceId]);

  const handleFileUpload = async (file) => {
    if (!flow) return;

    const currentStep = flow.steps[flow.progress];
    if (!currentStep) return;

    try {
      setUploading(true);

      // Create a unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExtension}`;

      // Upload to Firebase Storage
      const fileRef = ref(storage, `client_uploads/${user.workspaceId}/${clientId}/${currentStep.id}/${fileName}`);
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);

      // Update response with file info
      const fileResponse = {
        fileName: file.name,
        fileUrl,
        uploadedAt: serverTimestamp()
      };

      // Update Firestore immediately with the file info
      const flowRef = doc(db, 'workspaces', user.workspaceId, 'clients', clientId, 'assignedFlow');
      const updatedSteps = [...flow.steps];
      updatedSteps[flow.progress] = {
        ...currentStep,
        response: fileResponse
      };

      await updateDoc(flowRef, {
        steps: updatedSteps
      });

      // Update local state
      setCurrentResponse(fileResponse);
      setFlow({
        ...flow,
        steps: updatedSteps
      });

      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleNext = async () => {
    if (!flow) return;

    const currentStep = flow.steps[flow.progress];
    if (!currentStep) return;

    try {
      setSaving(true);

      // Update progress in Firestore
      const flowRef = doc(db, 'workspaces', user.workspaceId, 'clients', clientId, 'assignedFlow');
      await updateDoc(flowRef, {
        progress: flow.progress + 1
      });

      // Update local state
      setFlow({
        ...flow,
        progress: flow.progress + 1
      });

      // Reset current response
      setCurrentResponse('');

      // Show success message
      if (flow.progress === flow.steps.length - 1) {
        toast.success('Flow completed successfully!');
      } else {
        toast.success('Step saved!');
      }
    } catch (error) {
      console.error('Error saving step:', error);
      toast.error('Failed to save step');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <p className="text-gray-500">Flow not found</p>
        </div>
      </div>
    );
  }

  const currentStep = flow.steps[flow.progress];
  const isLastStep = flow.progress === flow.steps.length - 1;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="card">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{flow.name}</h1>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(flow.progress / flow.steps.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              {currentStep.title}
            </h2>
            {currentStep.description && (
              <p className="mt-1 text-sm text-gray-500">
                {currentStep.description}
              </p>
            )}
          </div>

          <div>
            {currentStep.type === 'text' && (
              <input
                type="text"
                value={currentResponse}
                onChange={(e) => setCurrentResponse(e.target.value)}
                className="input"
                placeholder="Type your answer here"
                required
              />
            )}

            {currentStep.type === 'textarea' && (
              <textarea
                value={currentResponse}
                onChange={(e) => setCurrentResponse(e.target.value)}
                className="input min-h-[150px]"
                placeholder="Type your answer here"
                required
              />
            )}

            {currentStep.type === 'file' && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center w-full">
                  <label
                    htmlFor="file-upload"
                    className="w-full flex flex-col items-center justify-center p-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg
                        className="w-8 h-8 mb-2 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="mb-1 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        {uploading ? 'Uploading...' : 'Any file type'}
                      </p>
                    </div>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files[0])}
                      disabled={uploading}
                      required
                    />
                  </label>
                </div>

                {currentResponse && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <svg
                        className="h-5 w-5 text-green-500 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm font-medium text-green-800">
                        Upload Successful
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-green-700">
                        File: {currentResponse.fileName}
                      </p>
                      <a
                        href={currentResponse.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-sm text-green-600 hover:text-green-500 underline"
                      >
                        View uploaded file
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => {
                setFlow({
                  ...flow,
                  progress: Math.max(0, flow.progress - 1)
                });
                setCurrentResponse(flow.steps[Math.max(0, flow.progress - 1)]?.response || '');
              }}
              disabled={flow.progress === 0 || saving || uploading}
              className="btn btn-secondary"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!currentResponse || saving || uploading}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : isLastStep ? 'Submit' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 