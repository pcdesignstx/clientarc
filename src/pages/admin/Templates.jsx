import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import Card from '../../components/Card';
import { Link } from 'react-router-dom';

export default function Templates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Templates
        </h1>
        <Link
          to="/admin/flows"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          View My Flows
        </Link>
      </div>

      <Card>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {templates.length === 0 ? (
            <div className="px-4 py-5 sm:px-6">
              <div className="text-center text-gray-500 dark:text-gray-400">
                No templates available.
              </div>
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="px-4 py-5 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {template.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {template.description || 'No description provided'}
                    </p>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {template.steps?.length || 0} steps
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <Link
                      to={`/admin/templates/${template.id}`}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View Template
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
} 