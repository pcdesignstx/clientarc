import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// Icons for different question types
const QuestionTypeIcon = ({ type }) => {
  switch (type) {
    case 'short_answer':
      return (
        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      );
    case 'long_answer':
      return (
        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case 'dropdown':
      return (
        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    case 'multiple_choice':
      return (
        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case 'yes_no':
      return (
        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'file_upload':
      return (
        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
  }
};

// Section type badges
const SectionTypeBadge = ({ type }) => {
  const getBadgeColor = () => {
    switch (type) {
      case 'text':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'image':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'faq':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor()}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
};

export default function ViewTemplate() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!user?.workspaceId || !templateId) {
        setError('Missing workspace or template ID');
        setLoading(false);
        return;
      }

      try {
        const templateRef = doc(db, 'templates', templateId);
        const templateDoc = await getDoc(templateRef);

        if (!templateDoc.exists()) {
          setError('Template not found');
          setLoading(false);
          return;
        }

        setTemplate({
          id: templateDoc.id,
          ...templateDoc.data()
        });
      } catch (err) {
        console.error('Error loading template:', err);
        setError('Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [user?.workspaceId, templateId]);

  const handleCreateFlow = async () => {
    if (!template) return;

    try {
      // Create a new flow based on this template
      const newFlow = {
        name: `${template.name} (Copy)`,
        description: template.description,
        sections: template.sections.map(section => ({
          ...section,
          id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          questions: section.questions.map(question => ({
            ...question,
            id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }))
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
        templateId: template.id
      };

      // Save to Firestore
      const flowsRef = collection(db, 'workspaces', user.workspaceId, 'flows');
      const newFlowRef = await addDoc(flowsRef, newFlow);

      toast.success('Flow created successfully');
      navigate(`/admin/flows/${newFlowRef.id}/edit`);
    } catch (err) {
      console.error('Error creating flow:', err);
      toast.error('Failed to create flow');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {template.name}
        </h1>
        <div className="flex space-x-4">
          <Link
            to="/admin/templates"
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Back to Templates
          </Link>
          <button
            onClick={handleCreateFlow}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Flow from Template
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Template Details
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            {template.description}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {template.sections.map((section) => (
          <div key={section.id} className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  {section.title}
                </h3>
                <div className="mt-1">
                  <SectionTypeBadge type={section.type} />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {section.questions.map((question) => (
                  <li key={question.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <QuestionTypeIcon type={question.type} />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {question.label}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Type: {question.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        {question.options && question.options.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Options:
                            </p>
                            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                              {question.options.map((option) => (
                                <li key={option.id}>• {option.text}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 