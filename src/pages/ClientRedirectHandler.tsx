import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const ClientRedirectHandler: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        // Query client_flows collection for the current user
        const flowsQuery = query(
          collection(db, 'client_flows'),
          where('clientId', '==', user.uid),
          orderBy('createdAt', 'asc')
        );

        const querySnapshot = await getDocs(flowsQuery);
        const flows: any[] = [];

        querySnapshot.forEach((doc) => {
          flows.push({ id: doc.id, ...doc.data() });
        });

        // Check for incomplete onboarding flow first
        const onboardingFlow = flows.find(
          (flow) => flow.type === 'onboarding' && !flow.completed
        );

        if (onboardingFlow) {
          navigate(`/flow/${onboardingFlow.id}`);
          return;
        }

        // If no onboarding flow, find first incomplete regular flow
        const incompleteFlow = flows.find(
          (flow) => flow.type !== 'onboarding' && !flow.completed
        );

        if (incompleteFlow) {
          navigate(`/flow/${incompleteFlow.id}`);
          return;
        }

        // If all flows are completed or none exist, go to dashboard
        navigate('/client-dashboard');
      } catch (error) {
        console.error('Error fetching flows:', error);
        navigate('/client-dashboard');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Show nothing while loading to avoid flickering
  return null;
};

export default ClientRedirectHandler; 