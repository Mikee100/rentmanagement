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
import Users from './pages/Users';
import Reports from './pages/Reports';
import ReportsHome from './pages/ReportsHome';
import ActivityLogs from './pages/ActivityLogs';
import AssignTenant from './pages/AssignTenant';
import UnitDetail from './pages/UnitDetail';
import { isFeatureEnabled } from './config/features';

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
                        <Route path="/assign-tenant/:houseId" element={<AssignTenant />} />
                        <Route path="/houses/:houseId" element={<UnitDetail />} />
                        <Route path="/tenants" element={<Tenants />} />
                        <Route path="/tenants/:id" element={<TenantDetail />} />
                        <Route path="/payments" element={<Payments />} />
                        <Route path="/reports" element={<ReportsHome />} />
                        <Route path="/reports/income-statement" element={<Reports forcedTab="income" standalone />} />
                        <Route path="/reports/outstanding-balances" element={<Reports forcedTab="outstanding" standalone />} />
                        <Route path="/reports/revenue-by-apartment" element={<Reports forcedTab="revenue" standalone />} />
                        <Route path="/reports/tenant-ledger" element={<Reports forcedTab="ledger" standalone />} />
                        <Route path="/reports/monthly-houses" element={<Reports forcedTab="apartment-units" standalone />} />
                        <Route path="/reports/monthly-apartments" element={<Reports forcedTab="apartments-monthly" standalone />} />
                        {!isFeatureEnabled('maintenance') && <Route path="/maintenance" element={<Navigate to="/dashboard" replace />} />}
                        {!isFeatureEnabled('expenses') && <Route path="/expenses" element={<Navigate to="/dashboard" replace />} />}
                        {!isFeatureEnabled('equityBank') && <Route path="/equity-bank-test" element={<Navigate to="/dashboard" replace />} />}
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
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
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

