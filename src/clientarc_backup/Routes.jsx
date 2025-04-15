import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Onboarding from './components/onboarding/Onboarding';
import Clients from './pages/Clients';
import Flows from './pages/Flows';
import WorkspaceSettings from './pages/WorkspaceSettings';
import NotFound from './pages/NotFound';

export function AppRoutes() {
  return (
    <RouterRoutes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <Layout>
              <Clients />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/flows"
        element={
          <ProtectedRoute>
            <Layout>
              <Flows />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <WorkspaceSettings />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
} 