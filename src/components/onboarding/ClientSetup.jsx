import { useState } from 'react';

export default function ClientSetup({ formData, onNext, onBack, onSkip, loading }) {
  const [clientName, setClientName] = useState(formData.clientName || '');
  const [clientEmail, setClientEmail] = useState(formData.clientEmail || '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!clientName.trim()) {
      setError('Please enter the client name');
      return;
    }

    if (!clientEmail.trim()) {
      setError('Please enter the client email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    onNext({
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim()
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Add Your First Client
      </h2>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Create your first client profile to start collecting content. You'll be able to add more clients and assign them to specific flows later.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Client Name
          </label>
          <input
            type="text"
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter client's full name"
          />
        </div>

        <div>
          <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Client Email
          </label>
          <input
            type="email"
            id="clientEmail"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter client's email address"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your client will receive an email invitation to join the workspace
          </p>
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Skip for now
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </form>
    </div>
  );
} 