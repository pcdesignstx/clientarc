import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import Card from './Card';
import { XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function TemplateSelector({ isOpen, onClose, onSelect }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templatesRef = collection(db, 'templates');
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
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              onClick={onClose}
              className="bg-white dark:bg-gray-800 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Choose a Template
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a template to start your new flow, or start from scratch.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Start from Scratch Option */}
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-transparent hover:border-blue-500 dark:hover:border-blue-400"
                onClick={() => onSelect(null)}
              >
                <div className="p-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Start from Scratch
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Create a new flow with a blank canvas
                  </p>
                </div>
              </Card>

              {/* Template Options */}
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-transparent hover:border-blue-500 dark:hover:border-blue-400"
                  onClick={() => onSelect(template)}
                >
                  <div className="p-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {template.description}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <DocumentTextIcon className="h-4 w-4 mr-1" />
                      {template.steps?.length || 0} steps
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 