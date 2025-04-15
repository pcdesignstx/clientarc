import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function AuthGuard({ children, redirectIfAuthenticated = false, allowedRoles }) {
  const { currentUser, loading, workspaceId, role, onboardingComplete } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [verifyingWorkspace, setVerifyingWorkspace] = useState(false);

  // List of public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/client-redirect'];
  
  // List of routes that don't require onboarding completion
  const exemptFromOnboarding = [
    '/onboarding',
    '/client-onboarding',
    '/admin/dashboard',
    '/admin/responses',
    '/admin/clients',
    '/admin/clients/add',
    '/admin/clients/edit'
  ];

  useEffect(() => {
    let mounted = true;

    async function verifyWorkspace() {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [AUTHGUARD] 🔍 Checking:`, {
        path: location.pathname,
        hasUser: !!currentUser,
        userRole: role,
        workspaceId,
        onboardingComplete,
        loading,
        verifyingWorkspace,
        allowedRoles
      });

      // Skip verification if loading or on public route
      if (loading || publicRoutes.includes(location.pathname)) {
        console.log(`[${timestamp}] [AUTHGUARD] ⏭️ Skipping verification:`, {
          loading,
          isPublicRoute: publicRoutes.includes(location.pathname)
        });
        if (mounted) setVerifyingWorkspace(false);
        return;
      }

      // NEW: Redirect authenticated users away from login/signup pages
      if (redirectIfAuthenticated && currentUser) {
        const destination = role === 'client' ? '/client/dashboard' : '/admin/dashboard';
        console.log(`[AUTHGUARD] 🚪 Redirecting authenticated user to: ${destination}`);
        navigate(destination, { replace: true });
        return;
      }

      // Handle unauthenticated users
      if (!currentUser) {
        console.log(`[${timestamp}] [AUTHGUARD] 🔒 No user, redirecting to login`);
        if (mounted) setVerifyingWorkspace(false);
        if (!publicRoutes.includes(location.pathname)) {
          navigate('/login', { replace: true });
        }
        return;
      }

      // Check role-based access
      if (allowedRoles && !allowedRoles.includes(role)) {
        console.log(`[${timestamp}] [AUTHGUARD] 🚫 Access denied: Invalid role`);
        const destination = role === 'client' ? '/client/dashboard' : '/admin/dashboard';
        navigate(destination, { replace: true });
        return;
      }

      if (mounted) setVerifyingWorkspace(true);
      console.log(`[${timestamp}] [AUTHGUARD] 🚦 Starting workspace verification`);

      try {
        // First check if user has a workspace in their profile
        console.log(`[${timestamp}] [AUTHGUARD] 📄 Checking user workspace`);
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        let userWorkspaceId = workspaceId;

        if (!userWorkspaceId && userSnap.exists()) {
          userWorkspaceId = userSnap.data().workspaceId;
          console.log(`[${timestamp}] [AUTHGUARD] ✅ Found workspaceId in user profile:`, userWorkspaceId);
        }

        // If still no workspace, check if user owns a workspace
        if (!userWorkspaceId) {
          console.log(`[${timestamp}] [AUTHGUARD] 🔍 Checking workspace ownership`);
          const workspaceRef = doc(db, 'workspaces', currentUser.uid);
          const workspaceSnap = await getDoc(workspaceRef);

          if (workspaceSnap.exists()) {
            userWorkspaceId = currentUser.uid;
            console.log(`[${timestamp}] [AUTHGUARD] ✅ Found owned workspace:`, userWorkspaceId);
          }
        }

        // If still no workspace, check if user is a client in any workspace
        if (!userWorkspaceId) {
          console.log(`[${timestamp}] [AUTHGUARD] 🔍 Checking client workspaces`);
          const clientQuery = query(
            collection(db, 'workspaces'),
            where('clients', 'array-contains', currentUser.uid)
          );
          const clientSnap = await getDocs(clientQuery);

          if (!clientSnap.empty) {
            userWorkspaceId = clientSnap.docs[0].id;
            console.log(`[${timestamp}] [AUTHGUARD] ✅ Found client workspace:`, userWorkspaceId);
          }
        }

        // If we found a workspace, verify it exists
        if (userWorkspaceId) {
          console.log(`[${timestamp}] [AUTHGUARD] 🔍 Verifying workspace:`, userWorkspaceId);
          const workspaceRef = doc(db, 'workspaces', userWorkspaceId);
          const workspaceSnap = await getDoc(workspaceRef);

          if (workspaceSnap.exists()) {
            console.log(`[${timestamp}] [AUTHGUARD] ✅ Workspace verified successfully`);

            // Check if onboarding is required (only for admin users)
            if (
              role === 'admin' &&
              !exemptFromOnboarding.includes(location.pathname) &&
              !location.pathname.startsWith('/admin/') &&
              onboardingComplete === false &&
              !(role === 'admin' && process.env.NODE_ENV === 'development')
            ) {
              console.log(`[${timestamp}] [AUTHGUARD] 🧭 Onboarding required for admin, redirecting`);
              if (mounted) setVerifyingWorkspace(false);
              navigate('/onboarding', { replace: true });
              return;
            } else if (
              role === 'client' && 
              !onboardingComplete && 
              !location.pathname.startsWith('/client/') &&
              !location.pathname.startsWith('/client-onboarding')
            ) {
              console.log(`[${timestamp}] [AUTHGUARD] 🧭 Onboarding required for client, redirecting`);
              if (mounted) setVerifyingWorkspace(false);
              navigate('/client-onboarding', { replace: true });
              return;
            } else if (role === 'admin' && !onboardingComplete && process.env.NODE_ENV === 'development') {
              console.warn(`[${timestamp}] [AUTHGUARD] ⚠️ Bypassing onboarding for admin in dev mode`);
            }

            // Redirect from public routes if logged in
            if (publicRoutes.includes(location.pathname)) {
              const destination = role === 'client' ? '/client/dashboard' : '/admin/dashboard';
              console.log(`[${timestamp}] [AUTHGUARD] 🧭 Redirecting from public route to:`, destination);
              if (mounted) setVerifyingWorkspace(false);
              navigate(destination, { replace: true });
              return;
            }

            console.log(`[${timestamp}] [AUTHGUARD] ✅ All checks passed, rendering children`);
            if (mounted) setVerifyingWorkspace(false);
            return;
          }
        }

        // If we get here, no valid workspace was found
        console.warn(`[${timestamp}] [AUTHGUARD] ⚠️ No valid workspace found for user:`, currentUser.uid);
        if (mounted) setVerifyingWorkspace(false);
        navigate('/onboarding', { replace: true });
        
      } catch (error) {
        console.error(`[${timestamp}] [AUTHGUARD] ❌ Error verifying workspace:`, error);
        if (mounted) setVerifyingWorkspace(false);
        navigate('/onboarding', { replace: true });
      }
    }

    verifyWorkspace();

    return () => {
      mounted = false;
    };
  }, [currentUser, loading, navigate, location.pathname, onboardingComplete, role, workspaceId, allowedRoles]);

  // Show loading state
  if (loading || verifyingWorkspace) {
    return (
      <div className="h-screen flex items-center justify-center">
        <span>Verifying workspace...</span>
      </div>
    );
  }

  // Don't render children for unauthenticated users on protected routes
  if (!currentUser && !publicRoutes.includes(location.pathname)) {
    return null;
  }

  // Render children once all checks pass
  return children;
} 