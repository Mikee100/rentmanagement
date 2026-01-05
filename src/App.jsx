import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Apartments from './pages/Apartments';
import ApartmentDetail from './pages/ApartmentDetail';
import Tenants from './pages/Tenants';
import TenantDetail from './pages/TenantDetail';
import Payments from './pages/Payments';
import Maintenance from './pages/Maintenance';
import Expenses from './pages/Expenses';
import PaybillConfig from './pages/PaybillConfig';
import Users from './pages/Users';
import Reports from './pages/Reports';
import ActivityLogs from './pages/ActivityLogs';
import EquityBankTest from './pages/EquityBankTest';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, token } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        fontSize: '1rem',
        color: 'var(--text-secondary)'
      }}>
        Loading...
      </div>
    );
  }

  // Check both user state and token in localStorage as fallback
  const hasToken = token || localStorage.getItem('token');
  
  if (!user && !hasToken) {
    return <Navigate to="/login" replace />;
  }

  // If we have a token but no user yet, wait a bit more (user might be loading)
  if (!user && hasToken) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        fontSize: '1rem',
        color: 'var(--text-secondary)'
      }}>
        Verifying authentication...
      </div>
    );
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/apartments" element={<Apartments />} />
                        <Route path="/apartments/:id" element={<ApartmentDetail />} />
                        <Route path="/tenants" element={<Tenants />} />
                        <Route path="/tenants/:id" element={<TenantDetail />} />
                        <Route path="/payments" element={<Payments />} />
                        <Route path="/maintenance" element={<Maintenance />} />
                        <Route path="/expenses" element={<Expenses />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route 
                          path="/users" 
                          element={
                            <ProtectedRoute allowedRoles={['superadmin']}>
                              <Users />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/activity-logs" 
                          element={
                            <ProtectedRoute allowedRoles={['superadmin']}>
                              <ActivityLogs />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/paybill-config" 
                          element={
                            <ProtectedRoute allowedRoles={['superadmin']}>
                              <PaybillConfig />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/equity-bank-test" 
                          element={
                            <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                              <EquityBankTest />
                            </ProtectedRoute>
                          } 
                        />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;

