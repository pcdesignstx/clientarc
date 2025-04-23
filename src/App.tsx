import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ClientLayout from './components/client/ClientLayout';
import Login from './pages/Login';
import Signup from './pages/admin/Signup';
import NotFound from './pages/NotFound';
import ClientRedirectHandler from './pages/ClientRedirectHandler';
import AuthGuard from './components/AuthGuard';
import { useAuth } from './contexts/AuthContext';
import Activate from './pages/activate';

// Admin imports
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminViewResponses from './pages/admin/AdminViewResponses';
import ClientDetails from './pages/admin/ClientDetails';
import ClientProgress from './pages/admin/ClientProgress';
import ClientView from './pages/admin/ClientView';
import AddClient from './pages/admin/AddClient';
import Clients from './pages/admin/Clients';
import CreateFlow from './pages/admin/CreateFlow';
import CreateTemplate from './pages/admin/CreateTemplate';
import EditClient from './pages/admin/EditClient';
import EditFlow from './pages/admin/EditFlow';
import FlowDetail from './pages/admin/FlowDetail';
import Flows from './pages/admin/Flows';
import Onboarding from './pages/admin/Onboarding';
import Settings from './pages/admin/Settings';
import Templates from './pages/admin/Templates';
import ViewFlow from './pages/admin/ViewFlow';
import ViewTemplate from './pages/admin/ViewTemplate';
import WorkspaceSettings from './pages/admin/WorkspaceSettings';
import TemplateEditRedirect from './pages/admin/TemplateEditRedirect';

// Client imports
import ClientDashboard from './pages/client/ClientDashboard';
import FlowViewer from './pages/client/FlowViewer';
import ClientOnboarding from './pages/client/ClientOnboarding';

// Configure future flags
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <AuthGuard redirectIfAuthenticated allowedRoles={[]}>
            <Login />
          </AuthGuard>
        }
      />
      <Route path="/signup" element={<Signup />} />
      <Route path="/client-redirect" element={<ClientRedirectHandler />} />
      <Route path="/activate" element={<Activate />} />
      
      {/* Root route - redirects based on user role */}
      <Route
        path="/"
        element={
          <AuthGuard allowedRoles={['admin', 'client']}>
            <Navigate to="/client/dashboard" replace />
          </AuthGuard>
        }
      />
      
      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={
          <AuthGuard allowedRoles={['admin']}>
            <Layout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="responses" element={<AdminViewResponses />} />
        <Route path="flows" element={<Flows />} />
        <Route path="flows/:flowId" element={<FlowDetail />} />
        <Route path="flows/:flowId/edit" element={<EditFlow />} />
        <Route path="flows/create" element={<CreateFlow />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/add" element={<AddClient />} />
        <Route path="clients/:clientId/edit" element={<EditClient />} />
        <Route path="clients/:clientId/progress" element={<ClientProgress />} />
        <Route path="settings" element={<Settings />} />
        <Route path="workspace-settings" element={<WorkspaceSettings />} />
        <Route path="templates" element={<Templates />} />
        <Route path="templates/:templateId" element={<ViewTemplate />} />
        <Route path="templates/:templateId/edit" element={<TemplateEditRedirect />} />
      </Route>

      {/* Client routes */}
      <Route
        path="/client"
        element={
          <AuthGuard allowedRoles={['client']}>
            <ClientLayout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ClientDashboard />} />
        <Route path="flows/:flowId" element={<FlowViewer />} />
      </Route>

      {/* Onboarding routes */}
      <Route
        path="/client-onboarding"
        element={
          <AuthGuard allowedRoles={['client']}>
            <ClientOnboarding />
          </AuthGuard>
        }
      />

      {/* Onboarding route */}
      <Route
        path="/onboarding"
        element={
          <AuthGuard allowedRoles={['admin']}>
            <Onboarding />
          </AuthGuard>
        }
      />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router {...routerConfig}>
      <AuthProvider>
        <ThemeProvider>
          <Toaster position="top-right" />
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App; 