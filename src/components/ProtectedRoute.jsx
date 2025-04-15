import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }) {
  const { currentUser, loading, onboardingComplete } = useAuth();
  const location = useLocation();

  console.log('[ProtectedRoute] Current state:', {
    path: location.pathname,
    loading,
    hasUser: !!currentUser,
    onboardingComplete,
    user: currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email
    } : null
  });

  if (loading) {
    console.log('[ProtectedRoute] Loading state, showing spinner');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!currentUser) {
    console.log('[ProtectedRoute] No user, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is not in onboarding but trying to access onboarding page, redirect to dashboard
  if (location.pathname === "/onboarding" && onboardingComplete) {
    console.log('[ProtectedRoute] Onboarding complete but trying to access onboarding, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // If user is in onboarding but trying to access other pages, redirect to onboarding
  if (location.pathname !== "/onboarding" && !onboardingComplete) {
    console.log('[ProtectedRoute] Onboarding not complete but trying to access protected route, redirecting to onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  console.log('[ProtectedRoute] Rendering protected route:', location.pathname);
  return children;
} 