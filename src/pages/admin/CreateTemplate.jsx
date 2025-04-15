import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/Card';

export default function CreateTemplate() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState({
    title: '',
    type: 'text',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const navigate = useNavigate();
  const { user, workspaceId } = useAuth();

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!workspaceId) {
        console.log('No workspaceId available');
        return;
      }

      try {
        console.log('Fetching templates for workspace:', workspaceId);
        const templatesRef = collection(db, 'workspaces', workspaceId, 'templates');
        const snapshot = await getDocs(templatesRef);
        const templatesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('Fetched templates:', templatesData);
        setTemplates(templatesData);
      } catch (error) {
        console.error('Error fetching templates:', error);
        toast.error('Failed to load templates');
      }
    };

    fetchTemplates();
  }, [workspaceId]);

  const addStep = () => {
    if (!currentStep.title.trim()) {
      return toast.error('Please enter a step title');
    }

    setSteps([
      ...steps,
      {
        id: Date.now(),
        ...currentStep
      }
    ]);

    setCurrentStep({
      title: '',
      type: 'text',
      description: ''
    });
  };

  const removeStep = (id) => {
    setSteps(steps.filter(step => step.id !== id));
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setName(template.name);
    setSteps(template.steps);
    setStep(2);
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name.trim()) {
      return toast.error('Please enter a template name');
    }

    if (steps.length === 0) {
      return toast.error('Please add at least one step');
    }

    if (!workspaceId) {
      console.error('No workspaceId available');
      return toast.error('No workspace selected');
    }

    try {
      setLoading(true);
      console.log('Creating template with data:', {
        name: name.trim(),
        steps,
        createdAt: new Date().toISOString()
      });

      const templatesRef = collection(db, 'workspaces', workspaceId, 'templates');
      const docRef = await addDoc(templatesRef, {
        name: name.trim(),
        steps,
        createdAt: new Date().toISOString()
      });

      console.log('Template created with ID:', docRef.id);
      toast.success('Template created successfully!');
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Template</h1>
      </div>

      {step === 1 ? (
        <Card>
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Template Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input mt-1"
                placeholder="e.g., Website Content Collection"
                required
              />
            </div>

            {templates.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Or choose from existing templates</h2>
                <div className="grid grid-cols-1 gap-4">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{template.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {template.steps?.length || 0} steps
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Use Template
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!name.trim()}
                className="btn btn-primary"
              >
                Next: Add Steps
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Add Step</h2>
              
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Step Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={currentStep.title}
                  onChange={(e) => setCurrentStep({ ...currentStep, title: e.target.value })}
                  className="input mt-1"
                  placeholder="e.g., Company Mission"
                  required
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Response Type
                </label>
                <select
                  id="type"
                  value={currentStep.type}
                  onChange={(e) => setCurrentStep({ ...currentStep, type: e.target.value })}
                  className="input mt-1"
                >
                  <option value="text">Single Line Text</option>
                  <option value="textarea">Multi-line Text</option>
                  <option value="file">File Upload</option>
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={currentStep.description}
                  onChange={(e) => setCurrentStep({ ...currentStep, description: e.target.value })}
                  className="input mt-1"
                  rows={2}
                  placeholder="Help text for this step"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addStep}
                  className="btn btn-primary"
                >
                  Add Step
                </button>
              </div>
            </div>

            {steps.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Added Steps</h2>
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{step.title}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{step.type}</div>
                        {step.description && (
                          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{step.description}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || steps.length === 0}
                className="btn btn-primary"
              >
                {loading ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
} 