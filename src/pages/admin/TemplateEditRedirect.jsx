import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function TemplateEditRedirect() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const checkTemplate = async () => {
      if (!templateId) {
        navigate('/templates');
        return;
      }

      try {
        // Check if template exists
        const templateRef = doc(db, 'templates', templateId);
        const templateDoc = await getDoc(templateRef);

        if (!templateDoc.exists()) {
          toast.error('Template not found');
          navigate('/templates');
          return;
        }

        // Show warning and redirect
        toast.error('Templates cannot be edited directly. Create a flow from this template instead.');
        navigate(`/templates/${templateId}`);
      } catch (err) {
        console.error('Error checking template:', err);
        toast.error('An error occurred');
        navigate('/templates');
      }
    };

    checkTemplate();
  }, [templateId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
          Templates Cannot Be Edited Directly
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          You are being redirected to the template view page.
        </p>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
} 