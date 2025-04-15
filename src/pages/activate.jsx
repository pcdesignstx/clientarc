import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';

export default function Activate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifyActivation() {
      const token = searchParams.get('token');
      
      if (!token) {
        setError('No activation token provided');
        setLoading(false);
        return;
      }

      try {
        // Find the workspace with this activation token
        const workspacesRef = doc(db, 'activationTokens', token);
        const workspaceDoc = await getDoc(workspacesRef);

        if (!workspaceDoc.exists()) {
          setError('Invalid or expired activation token');
          setLoading(false);
          return;
        }

        const { workspaceId } = workspaceDoc.data();

        if (!workspaceId) {
          setError('Invalid workspace data');
          setLoading(false);
          return;
        }

        // Update the workspace status
        const workspaceRef = doc(db, 'workspaces', workspaceId);
        await updateDoc(workspaceRef, {
          status: 'active',
          activatedAt: new Date().toISOString(),
        });

        // Clean up the activation token
        // Note: In production, you might want to move this to a Cloud Function
        // to ensure atomic operations
        // await deleteDoc(workspacesRef);

        setSuccess(true);
        toast.success('Workspace activated successfully!');
      } catch (error) {
        console.error('Error activating workspace:', error);
        setError('Failed to activate workspace. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    verifyActivation();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Verifying activation...</p>
        <p className="mt-2 text-sm text-gray-500">Please wait while we activate your workspace.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Activation Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Activation Successful!</h2>
        <p className="text-gray-600 mb-6">Your workspace has been activated successfully.</p>
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Continue to Login
        </button>
      </div>
    </div>
  );
} 