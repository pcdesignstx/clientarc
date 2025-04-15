import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, getDocs, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [navigationAttempted, setNavigationAttempted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Reset navigation attempted when location changes
  useEffect(() => {
    setNavigationAttempted(false);
  }, [location.pathname]);

  // Handle auth state changes
  useEffect(() => {
    console.log('[Auth] Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[Auth] Auth state changed:', {
        hasUser: !!user,
        userId: user?.uid,
        email: user?.email
      });

      if (user) {
        try {
          console.log('[Auth] Fetching user document for:', user.uid);
          // Get user document
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('[Auth] User document found:', userData);
            
            let finalWorkspaceId = userData.workspaceId;

            if (!finalWorkspaceId && userData.role === 'admin') {
              finalWorkspaceId = user.email.split('@')[0].toLowerCase().replace(/\s+/g, '-');

              await setDoc(doc(db, 'users', user.uid), {
                ...userData,
                workspaceId: finalWorkspaceId,
                onboardingComplete: userData.onboardingComplete || false,
                updatedAt: serverTimestamp()
              }, { merge: true });

              await setDoc(doc(db, 'workspaces', finalWorkspaceId), {
                name: finalWorkspaceId,
                owner: user.uid,
                createdAt: serverTimestamp()
              });

              console.log('[Auth] Workspace ID was missing. Created and updated:', finalWorkspaceId);
            }

            // Update user state all at once to prevent multiple re-renders
            setCurrentUser(user);
            setRole(userData.role || 'admin');
            setWorkspaceId(finalWorkspaceId);
            setOnboardingComplete(userData.onboardingComplete || false);
            setLoading(false);
          } else {
            console.warn('[Auth] No user document found, checking if user is a client');
            
            // Check if user exists in any workspace's clients collection
            const workspacesRef = collection(db, 'workspaces');
            const workspacesQuery = query(workspacesRef);
            const workspacesSnapshot = await getDocs(workspacesQuery);
            
            let isClient = false;
            let clientWorkspaceId = null;
            
            for (const workspaceDoc of workspacesSnapshot.docs) {
              const clientsRef = collection(db, 'workspaces', workspaceDoc.id, 'clients');
              const clientQuery = query(clientsRef, where('uid', '==', user.uid));
              const clientSnapshot = await getDocs(clientQuery);
              
              if (!clientSnapshot.empty) {
                isClient = true;
                clientWorkspaceId = workspaceDoc.id;
                const clientData = clientSnapshot.docs[0].data();
                console.log('[Auth] Found client data:', clientData);
                break;
              }
            }
            
            // Create user document with appropriate role
            const newUserData = {
              email: user.email,
              role: isClient ? 'client' : 'admin',
              workspaceId: isClient ? clientWorkspaceId : null,
              onboardingComplete: isClient ? false : true,
              createdAt: serverTimestamp()
            };
            
            console.log('[Auth] Creating new user document with data:', newUserData);
            await setDoc(doc(db, 'users', user.uid), newUserData);
            
            // Update user state all at once
            setCurrentUser(user);
            setRole(isClient ? 'client' : 'admin');
            setWorkspaceId(isClient ? clientWorkspaceId : null);
            setOnboardingComplete(isClient ? false : true);
            setLoading(false);
            console.log(`[Auth] Created new user document with role: ${isClient ? 'client' : 'admin'}`);
          }
        } catch (error) {
          console.error('[Auth] Error fetching/creating user data:', error);
          // Still set the user even if there's an error
          setCurrentUser(user);
          setRole('admin');
          setWorkspaceId(null);
          setOnboardingComplete(false);
          setLoading(false);
        }
      } else {
        console.log('[Auth] No user, resetting state');
        // Reset all state at once
        setCurrentUser(null);
        setRole(null);
        setWorkspaceId(null);
        setOnboardingComplete(false);
        setNavigationAttempted(false);
        setLoading(false);
      }
    });

    return () => {
      console.log('[Auth] Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  // Handle navigation after auth state changes
  useEffect(() => {
    async function handleNavigation() {
      const timestamp = new Date().toISOString();

      console.log(`[${timestamp}] [NAVIGATION] 🔍 Checking:`, {
        hasUser: !!currentUser,
        role,
        workspaceId,
        loading,
        navigationAttempted,
        currentPath: location.pathname
      });

      if (
        !navigationAttempted &&
        currentUser &&
        role &&
        !loading &&
        (workspaceId || location.pathname === '/onboarding')
      ) {
        console.log(`[${timestamp}] [NAVIGATION] 🚦 Attempting navigation...`);
        setNavigationAttempted(true);

        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (!userDoc.exists()) {
            console.warn(`[${timestamp}] [NAVIGATION] ⚠️ User doc not found`);
            return;
          }

          const userData = userDoc.data();
          console.log(`[${timestamp}] [NAVIGATION] 📄 User data fetched:`, userData);

          const isLoginPath = location.pathname === '/login';
          const isAdminPath = location.pathname.startsWith('/admin');
          const isClientPath = location.pathname.startsWith('/client');

          // Prevent clients from accessing admin routes
          if (role === 'client' && isAdminPath) {
            console.log(`[${timestamp}] [NAVIGATION] ⚠️ Client attempting to access admin route`);
            navigate('/client/dashboard', { replace: true });
            return;
          }

          // Prevent admins from accessing client routes
          if (role === 'admin' && isClientPath) {
            console.log(`[${timestamp}] [NAVIGATION] ⚠️ Admin attempting to access client route`);
            navigate('/admin/dashboard', { replace: true });
            return;
          }

          if (isLoginPath) {
            if (role === 'admin') {
              if (!userData.onboardingComplete && !userData.workspaceId) {
                console.log(`[${timestamp}] [NAVIGATION] 🧭 New admin needs onboarding`);
                navigate('/onboarding', { replace: true });
              } else {
                console.log(`[${timestamp}] [NAVIGATION] ✅ Admin ready for dashboard`);
                navigate('/admin/dashboard', { replace: true });
              }
            } else if (role === 'client') {
              console.log(`[${timestamp}] [NAVIGATION] 👥 Client routing to dashboard`);
              navigate('/client/dashboard', { replace: true });
            }
          }
        } catch (error) {
          console.error(`[${timestamp}] [NAVIGATION] Error during navigation:`, error);
        }
      }
    }

    handleNavigation();
  }, [currentUser, role, workspaceId, loading, navigationAttempted, location.pathname, navigate]);

  const signup = async (email, password, workspaceName) => {
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Generate workspace ID
      const workspaceId = workspaceName.toLowerCase().replace(/\s+/g, '-');

      // Create workspace document
      await setDoc(doc(db, 'workspaces', workspaceId), {
        name: workspaceName.trim(),
        owner: user.uid,
        createdAt: serverTimestamp()
      });

      // Create user document
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role: 'admin',
        workspaceId,
        onboardingComplete: false,
        createdAt: serverTimestamp()
      });

      // Update context
      setRole('admin');
      setWorkspaceId(workspaceId);
    } catch (error) {
      console.error('[Auth] Error during signup:', error);
      throw error;
    }
  };

  const login = async (email, password) => {
    console.log('[Auth] Login attempt for:', email);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('[Auth] Login successful:', {
        userId: result.user.uid,
        email: result.user.email
      });
    } catch (error) {
      console.error('[Auth] Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('[Auth] Logout attempt');
    try {
      await signOut(auth);
      console.log('[Auth] Logout successful, resetting state');
      setRole(null);
      setWorkspaceId(null);
      setNavigationAttempted(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      throw error;
    }
  };

  async function loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      return user;
    } catch (error) {
      throw error;
    }
  }

  const value = {
    currentUser,
    role,
    workspaceId,
    onboardingComplete,
    loading,
    navigationAttempted,
    setWorkspaceId,
    signup,
    login,
    logout,
    loginWithGoogle
  };

  console.log('[Auth] Current context state:', {
    hasUser: !!currentUser,
    role,
    workspaceId,
    loading,
    navigationAttempted,
    currentPath: location.pathname
  });

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthContext; 