import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/Card';
import { toast } from 'react-hot-toast';

export default function AdminDashboard() {
  const { currentUser, workspaceId } = useAuth();
  const [stats, setStats] = useState({
    flows: 0,
    clients: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      console.log('Fetching stats with workspaceId:', workspaceId);
      if (!workspaceId) {
        console.log('No workspace ID available');
        setLoading(false);
        return;
      }

      try {
        // Fetch flows count from workspace collection
        const flowsRef = collection(db, `workspaces/${workspaceId}/flows`);
        const flowsSnapshot = await getDocs(flowsRef);
        console.log('Flows count:', flowsSnapshot.size);

        // Fetch clients count from workspace collection
        const clientsRef = collection(db, `workspaces/${workspaceId}/clients`);
        const clientsSnapshot = await getDocs(clientsRef);
        console.log('Clients count:', clientsSnapshot.size);

        // TODO: Add recent activity from workspaces/{workspaceId}/activityLog
        // This will be implemented in a future enhancement
        const recentActivity = [];

        setStats({
          flows: flowsSnapshot.size,
          clients: clientsSnapshot.size,
          recentActivity
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">Dashboard</h1>
        <div className="flex space-x-3">
          <Link
            to="/admin/flows/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:ring-offset-gray-900"
          >
            Create Flow
          </Link>
          <Link
            to="/admin/clients/add"
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:ring-offset-gray-900"
          >
            Add Client
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Content Flows">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.flows}</div>
            <Link
              to="/admin/flows"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:ring-offset-gray-900"
            >
              View All →
            </Link>
          </div>
        </Card>

        <Card title="Clients">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.clients}</div>
            <Link
              to="/admin/clients"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:ring-offset-gray-900"
            >
              View All →
            </Link>
          </div>
        </Card>

        {/* TODO: Add recent activity section when activityLog collection is implemented */}
        <Card title="Recent Activity" className="lg:col-span-2">
          <div className="space-y-4">
            <p className="text-gray-500 dark:text-gray-400">Coming soon: Recent activity tracking</p>
          </div>
        </Card>
      </div>
    </div>
  );
} 