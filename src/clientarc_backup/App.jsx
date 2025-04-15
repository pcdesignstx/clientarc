import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Flows from './pages/Flows';
import FlowDetail from './pages/FlowDetail';
import EditFlow from './pages/EditFlow';
import CreateFlow from './pages/CreateFlow';
import Clients from './pages/Clients';
import AddClient from './pages/AddClient';
import Settings from './pages/Settings';
import WorkspaceSettings from './pages/WorkspaceSettings';
import Onboarding from './pages/Onboarding';
import Templates from './pages/Templates';
import ViewTemplate from './pages/ViewTemplate';
import TemplateEditRedirect from './pages/TemplateEditRedirect';
import { ProtectedRoute } from './components/ProtectedRoute';
import AuthGuard from './components/AuthGuard';
import EditClient from './pages/EditClient';
import ClientProgress from './pages/ClientProgress';
import ClientRedirectHandler from './pages/ClientRedirectHandler';

// Configure future flags
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

function App() {
  return (
    <Router {...routerConfig}>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/client-redirect" element={<ClientRedirectHandler />} />
            
            {/* Protected routes */}
            <Route
              path="/"
              element={
                <AuthGuard>
                  <Layout />
                </AuthGuard>
              }
            >
              <Route index element={<Dashboard />} />
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
              
              {/* Template routes */}
              <Route path="templates" element={<Templates />} />
              <Route path="templates/:templateId" element={<ViewTemplate />} />
              <Route path="templates/:templateId/edit" element={<TemplateEditRedirect />} />
            </Route>

            {/* Onboarding route */}
            <Route
              path="/onboarding"
              element={
                <AuthGuard>
                  <Onboarding />
                </AuthGuard>
              }
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App; 