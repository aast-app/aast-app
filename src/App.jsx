import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import ErrorPage from './components/ErrorPage';
import LoginPage from './components/LoginPage';
import SSOHandler from './components/SSOHandler';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth.js';
import { useEffect, lazy, Suspense } from 'react';
import { MotionConfig } from 'framer-motion';
import Loader from './components/Loader';
const CeptData = lazy(() => import('./components/CeptData'));
const CeptCreate = lazy(() => import('./components/CeptCreate'));
const MasterDatabase = lazy(() => import('./components/MasterDatabase'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const UserLogs = lazy(() => import('./components/UserLogs'));
import { ErrorBoundary } from './components/ErrorBoundary';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function TokenRedirector() {
  const location = useLocation();
  const search = window.location.search; // Hash router ignores real query params sometimes
  
  useEffect(() => {
    if (search.includes('token=') && location.pathname !== '/sso') {
      window.location.href = `/#/sso${search}`;
    }
  }, [search, location.pathname]);

  return null;
}

function AppContent() {
  const { user } = useAuth();

  return (
    <Router>
      <TokenRedirector />
      <Routes>
        {/* Public Routes */}
        <Route path="/sso" element={<SSOHandler />} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}> 
          <Route index element={<HomePage />} />
          <Route path="cept-data" element={<CeptData />} />
          <Route path="cept-create" element={<CeptCreate />} />
          <Route path="master-database" element={user?.role === 'admin' ? <MasterDatabase /> : <HomePage />} />
          <Route 
            path="admin" 
            element={user?.role === 'admin' ? <AdminDashboard /> : <HomePage />} 
          />
          <Route 
            path="user-logs" 
            element={user?.role === 'admin' ? <UserLogs /> : <HomePage />} 
          />
          <Route path="*" element={<ErrorPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MotionConfig reducedMotion="user"><Suspense fallback={<Loader />}><AppContent /></Suspense></MotionConfig>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
