import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, addDoc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/Card';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

// Question types
const QUESTION_TYPES = [
  { id: 'short_answer', label: 'Short Answer' },
  { id: 'long_answer', label: 'Long Answer' },
  { id: 'dropdown', label: 'Dropdown' },
  { id: 'multiple_choice', label: 'Multiple Choice' },
  { id: 'yes_no', label: 'Yes/No' },
  { id: 'file_upload', label: 'File Upload' },
  { id: 'color', label: 'Color Picker' }
];

export default function CreateFlow() {
  const navigate = useNavigate();
  const { currentUser, workspaceId } = useAuth();
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customFlow, setCustomFlow] = useState({
    name: '',
    description: '',
    steps: []
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState('');
  const [selectedStep, setSelectedStep] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch templates from Firestore
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        console.log('Fetching templates from root collection');
        const templatesRef = collection(db, 'templates');
        const templatesSnapshot = await getDocs(templatesRef);
        
        const templatesData = templatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('Fetched templates:', templatesData);
        setTemplates(templatesData);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setTemplatesError('Failed to load templates');
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleTemplateSelect = (template) => {
    console.log('Template selected:', template);
    
    // Get steps from either sections or steps property
    const steps = template.sections || template.steps || [];
    console.log('Found steps:', steps);
    
    if (!steps.length) {
      console.warn('No steps found in template', template);
      toast.error('Template has no steps');
      return;
    }
    
    // Map each step with a unique ID and preserved properties
    const mappedSteps = steps.map(step => {
      const stepId = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Map questions with unique IDs and preserved properties
      const mappedQuestions = (step.questions || []).map(question => ({
        id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: question.text || question.label || '',
        type: question.type || 'short_answer',
        options: question.options || []
      }));

      return {
        id: stepId,
        name: step.title || step.name || 'Untitled Step',
        description: step.description || '',
        questions: mappedQuestions
      };
    });

    // Update the customFlow state with the mapped steps
    setCustomFlow(prev => ({
      ...prev,
      name: template.name,
      description: template.description || '',
      steps: mappedSteps
    }));

    // Set the first step as selected if there are any steps
    if (mappedSteps.length > 0) {
      setSelectedStep(mappedSteps[0].id);
    }

    // Set the selected template and switch to create tab
    setSelectedTemplate(template);
    setActiveTab('create');
  };

  const handleStartFromScratch = () => {
    setSelectedTemplate(null);
    setCustomFlow({
      name: '',
      description: '',
      steps: []
    });
    setActiveTab('create');
  };

  const handleAddStep = () => {
    const newStepId = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCustomFlow(prev => ({
      ...prev,
      steps: [
        ...(prev.steps || []),
        {
          id: newStepId,
          name: '',
          description: '',
          questions: []
        }
      ]
    }));
    setSelectedStep(newStepId);
  };

  const handleStepChange = (stepId, field, value) => {
    setCustomFlow(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, [field]: value } : step
      )
    }));
  };

  const handleRemoveStep = (stepId) => {
    setCustomFlow(prev => {
      const newSteps = prev.steps.filter(step => step.id !== stepId);
      return {
        ...prev,
        steps: newSteps
      };
    });

    // If the deleted step was selected, either select the next step or clear selection
    if (selectedStep === stepId) {
      setCustomFlow(prev => {
        const stepIndex = prev.steps.findIndex(step => step.id === stepId);
        const nextStep = prev.steps[stepIndex + 1] || prev.steps[stepIndex - 1];
        setSelectedStep(nextStep?.id || null);
        return prev;
      });
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(customFlow.steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCustomFlow(prev => ({
      ...prev,
      steps: items
    }));
  };

  const handleAddQuestion = (stepId) => {
    const newQuestionId = `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCustomFlow(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId 
          ? {
              ...step,
              questions: [
                ...(step.questions || []),
                {
                  id: newQuestionId,
                  text: '',
                  type: 'short_answer',
                  options: []
                }
              ]
            }
          : step
      )
    }));
  };

  const handleQuestionChange = (stepId, questionId, field, value) => {
    setCustomFlow(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId 
          ? {
              ...step,
              questions: step.questions.map(q => 
                q.id === questionId ? { ...q, [field]: value } : q
              )
            }
          : step
      )
    }));
  };

  const handleRemoveQuestion = (stepId, questionId) => {
    setCustomFlow(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId 
          ? {
              ...step,
              questions: step.questions.filter(q => q.id !== questionId)
            }
          : step
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customFlow.name?.trim()) {
      setError('Flow name is required');
      return;
    }

    if (customFlow.steps.length === 0) {
      setError('At least one step is required');
      return;
    }

    if (customFlow.steps.some(step => !step.name?.trim())) {
      setError('All steps must have a name');
      return;
    }

    setLoading(true);

    try {
      const flowData = {
        name: customFlow.name.trim(),
        description: customFlow.description?.trim() || '',
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        steps: customFlow.steps.map(step => ({
          ...step,
          id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          questions: step.questions?.map(question => ({
            ...question,
            id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          })) || []
        }))
      };

      const flowsRef = collection(db, 'workspaces', workspaceId, 'flows');
      const docRef = await addDoc(flowsRef, flowData);

      console.log('New flow created with ID:', docRef.id);
      toast.success('Flow created successfully!');
      navigate('/admin/flows');
    } catch (error) {
      console.error('Failed to save flow:', error);
      setError('Something went wrong, please try again.');
      toast.error('Failed to create flow');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedStepData = () => {
    if (!selectedStep || !customFlow) return null;
    return customFlow.steps.find(step => step.id === selectedStep);
  };

  return (
    <div className="h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              key="templates-tab"
              onClick={() => setActiveTab('templates')}
              className={`${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-white'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Browse Templates
            </button>
            <button
              key="create-tab"
              onClick={() => setActiveTab('create')}
              className={`${
                activeTab === 'create'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-white'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Create Flow
            </button>
          </nav>
        </div>

        {/* Browse Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-md rounded-lg p-6 cursor-pointer hover:shadow-md dark:hover:shadow-lg transition-shadow duration-200 border border-transparent hover:border-blue-500 dark:hover:border-blue-400"
              >
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {template.description}
                </p>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <DocumentTextIcon className="w-4 h-4 mr-1" />
                  {template.steps?.length || 0} steps
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Flow Tab */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* Template Info Header */}
            {selectedTemplate && (
              <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-md rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Editing Template: {selectedTemplate.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedTemplate.description}
                </p>
              </div>
            )}

            {/* Flow Name Input */}
            <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-md rounded-lg p-6">
              <div className="space-y-1">
                <label htmlFor="flowName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Flow Name
                </label>
                <input
                  type="text"
                  id="flowName"
                  value={customFlow.name}
                  onChange={(e) => setCustomFlow(prev => ({ ...prev, name: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter flow name"
                />
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column - Steps List */}
              <div className="md:col-span-1">
                <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-md rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                      Steps
                    </h2>
                    <button
                      onClick={handleAddStep}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Add Step
                    </button>
                  </div>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="steps">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                          {customFlow.steps.map((step, index) => (
                            <Draggable 
                              key={step.id} 
                              draggableId={step.id} 
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`p-3 rounded-md cursor-pointer ${
                                    selectedStep === step.id
                                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                                  onClick={() => setSelectedStep(step.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div {...provided.dragHandleProps} className="cursor-grab">
                                        <svg
                                          className="w-5 h-5 text-gray-400 dark:text-gray-500"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 8h16M4 16h16"
                                          />
                                        </svg>
                                      </div>
                                      <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {step.name || 'Untitled Step'}
                                      </span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveStep(step.id);
                                      }}
                                      className="p-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              </div>

              {/* Right Column - Step Editor */}
              <div className="md:col-span-2">
                {selectedStep ? (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-md rounded-lg p-6">
                      <div>
                        <input
                          type="text"
                          value={getSelectedStepData()?.name || ''}
                          onChange={(e) => handleStepChange(selectedStep, 'name', e.target.value)}
                          className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                          placeholder="Step title"
                        />
                        <textarea
                          value={getSelectedStepData()?.description || ''}
                          onChange={(e) => handleStepChange(selectedStep, 'description', e.target.value)}
                          className="mt-2 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                          placeholder="Step description"
                          rows={3}
                        />
                      </div>

                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Questions
                          </h3>
                          <button
                            onClick={() => handleAddQuestion(selectedStep)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Add Question
                          </button>
                        </div>

                        <div className="space-y-4">
                          {getSelectedStepData()?.questions?.map((question) => (
                            <div
                              key={question.id}
                              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
                            >
                              <div className="flex justify-between items-start mb-4">
                                <input
                                  type="text"
                                  value={question.text}
                                  onChange={(e) => handleQuestionChange(selectedStep, question.id, 'text', e.target.value)}
                                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  placeholder="Question text"
                                />
                                <button
                                  onClick={() => handleRemoveQuestion(selectedStep, question.id)}
                                  className="ml-3 p-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                              <div className="flex items-center space-x-2">
                                <select
                                  value={question.type}
                                  onChange={(e) => handleQuestionChange(selectedStep, question.id, 'type', e.target.value)}
                                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  {QUESTION_TYPES.map(type => (
                                    <option key={type.id} value={type.id}>
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Save Flow Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          'Save Flow'
                        )}
                      </button>
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
                        Choose a step from the sidebar to edit its details
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 