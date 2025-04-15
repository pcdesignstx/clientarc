import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function FlowSetup({ formData, onNext, onBack, loading }) {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState(formData.templateId || '');
  const [customName, setCustomName] = useState(formData.flowName || '');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

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
        setError('Failed to load templates');
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedTemplate && !customName.trim()) {
      setError('Please select a template or enter a custom flow name');
      return;
    }

    setIsSaving(true);

    try {
      const template = templates.find(t => t.id === selectedTemplate);
      const flowData = {
        name: selectedTemplate ? template.name : customName.trim(),
        steps: selectedTemplate ? (template.sections || template.steps || []).map(step => ({
          name: step.title || step.name || 'Untitled Step',
          description: step.description || '',
          questions: (step.questions || []).map(question => ({
            text: question.text || question.label || '',
            type: question.type || 'short_answer',
            options: question.options || []
          }))
        })) : [],
        createdAt: serverTimestamp(),
        templateId: selectedTemplate || null // Store reference to original template
      };

      // Save the flow to Firestore
      const flowsRef = collection(db, 'workspaces', user.workspaceId, 'flows');
      const flowDoc = await addDoc(flowsRef, flowData);
      console.log('Flow created with ID:', flowDoc.id);

      // Continue with onboarding
      onNext({
        templateId: selectedTemplate,
        flowName: flowData.name,
        flowId: flowDoc.id
      });
    } catch (err) {
      console.error('Error creating flow:', err);
      setError('Failed to create flow. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (templatesLoading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Set Up Your Content Flow
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Choose a template or create your own
          </label>
          
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${
                  selectedTemplate === template.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={selectedTemplate === template.id}
                    onChange={() => setSelectedTemplate(template.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label className="ml-3 block text-sm font-medium text-gray-700 dark:text-white">
                    {template.name}
                  </label>
                </div>
                <p className="ml-7 text-sm text-gray-500 dark:text-gray-400">
                  {template.description}
                </p>
                <div className="mt-3 ml-7">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Steps included:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-500 dark:text-gray-400">
                    {(template.sections || template.steps || []).map((step, index) => (
                      <li key={index}>{step.title || step.name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
            
            <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-2">
                <input
                  type="radio"
                  name="template"
                  value="custom"
                  checked={!selectedTemplate}
                  onChange={() => setSelectedTemplate('')}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <label className="ml-3 block text-sm font-medium text-gray-700 dark:text-white">
                  Create Custom Flow
                </label>
              </div>
              
              <div className="ml-7">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => {
                    setSelectedTemplate('');
                    setCustomName(e.target.value);
                  }}
                  placeholder="Enter flow name"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Next'}
          </button>
        </div>
      </form>
    </div>
  );
} 