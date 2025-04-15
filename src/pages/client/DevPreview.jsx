import { useState, createContext, useContext } from 'react';
import ClientLayout from '../../components/client/ClientLayout';
import FlowViewer from './FlowViewer';

// Create context for development client data
export const ClientDevContext = createContext();

export const useClientDev = () => {
  const context = useContext(ClientDevContext);
  if (!context) {
    throw new Error('useClientDev must be used within a ClientDevProvider');
  }
  return context;
};

const mockClients = [
  { label: "John Doe", clientId: "client_001", workspaceId: "ws_001" },
  { label: "Jane Smith", clientId: "client_002", workspaceId: "ws_002" }
];

export default function DevPreview() {
  // Only show in development mode
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Development Preview Only
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This page is only available in development mode.
          </p>
        </div>
      </div>
    );
  }

  const [selectedClient, setSelectedClient] = useState(null);

  const handleClientSelect = (e) => {
    const clientId = e.target.value;
    const client = mockClients.find(c => c.clientId === clientId);
    setSelectedClient(client);
  };

  return (
    <ClientDevContext.Provider value={selectedClient}>
      <ClientLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <label htmlFor="client-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select a client to preview:
            </label>
            <select
              id="client-select"
              value={selectedClient?.clientId || ''}
              onChange={handleClientSelect}
              className="block w-64 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Choose a client...</option>
              {mockClients.map(client => (
                <option key={client.clientId} value={client.clientId}>
                  {client.label}
                </option>
              ))}
            </select>
          </div>

          {selectedClient ? (
            <div className="space-y-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Client Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Client ID</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{selectedClient.clientId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Workspace ID</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{selectedClient.workspaceId}</p>
                  </div>
                </div>
              </div>

              {/* Preview FlowViewer with mock flow ID */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Flow Preview
                </h2>
                <FlowViewer flowId="mock_flow_001" />
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <p className="text-gray-500 dark:text-gray-400 text-center">
                Select a client to preview their view
              </p>
            </div>
          )}
        </div>
      </ClientLayout>
    </ClientDevContext.Provider>
  );
} 