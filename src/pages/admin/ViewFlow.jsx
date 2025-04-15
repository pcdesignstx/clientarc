import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function ViewFlow() {
  const { flowId } = useParams();
  const { user } = useAuth();
  const [flow, setFlow] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFlow = async () => {
      if (!user?.workspaceId || !flowId) return;

      try {
        const flowRef = doc(db, 'workspaces', user.workspaceId, 'flows', flowId);
        const flowDoc = await getDoc(flowRef);

        if (!flowDoc.exists()) {
          setError('Flow not found');
          return;
        }

        const flowData = flowDoc.data();
        setFlow(flowData);

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
  }, [user?.workspaceId, flowId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No flow data available</div>
      </div>
    );
  }

  const getSelectedStepData = () => {
    if (!selectedStep || !flow.steps) return null;
    return flow.steps.find(step => step.id === selectedStep);
  };

  const renderQuestion = (question, index) => {
    switch (question.type) {
      case 'short_answer':
        return (
          <input
            type="text"
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter your answer"
            value={question.answer || ''}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
          />
        );
      case 'long_answer':
        return (
          <textarea
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter your answer"
            value={question.answer || ''}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
          />
        );
      case 'dropdown':
        return (
          <select
            className="w-full px-3 py-2 border rounded"
            value={question.answer || ''}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
          >
            <option value="">Select an option</option>
            {question.options?.map((option, i) => (
              <option key={i} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {question.options?.map((option, i) => (
              <label key={i} className="flex items-center">
                <input
                  type="radio"
                  name={`question-${index}`}
                  value={option}
                  checked={question.answer === option}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  className="mr-2"
                />
                {option}
              </label>
            ))}
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
                checked={question.answer === 'Yes'}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                className="mr-2"
              />
              Yes
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={`question-${index}`}
                value="No"
                checked={question.answer === 'No'}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
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
              onChange={(e) => handleFileUpload(index, e.target.files[0])}
              className="w-full"
            />
            {question.answer && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">Uploaded: {question.answer}</p>
              </div>
            )}
          </div>
        );
      case 'color':
        return (
          <div className="flex items-center space-x-4">
            <input
              type="color"
              value={question.answer || '#000000'}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              className="h-10 w-20"
            />
            <input
              type="text"
              value={question.answer || ''}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              placeholder="#000000"
              className="px-3 py-2 border rounded"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Flow Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {flow.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Created on {new Date(flow.createdAt?.toDate()).toLocaleDateString()}
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Steps List */}
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

          {/* Right Column - Step Details */}
          <div className="md:col-span-2">
            {selectedStep ? (
              <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-md rounded-lg p-6">
                <div className="space-y-6">
                  {/* Step Header */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {getSelectedStepData()?.name || 'Untitled Step'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {getSelectedStepData()?.description || 'No description provided'}
                    </p>
                  </div>

                  {/* Questions List */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      Questions
                    </h4>
                    <div className="space-y-4">
                      {getSelectedStepData()?.questions?.map((question, index) => (
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

                          {/* Question Options */}
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

                          {renderQuestion(question, index)}
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