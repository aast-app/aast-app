import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import CeptData from './components/CeptData';
import CeptCreate from './components/CeptCreate';
import ErrorPage from './components/ErrorPage';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import UserLogs from './components/UserLogs';
import { AuthProvider, useAuth } from './context/AuthContext';

// We extract the routing into an inner component so it can access useAuth
function AppContent() {
  const { user } = useAuth();

  // Route Protection: If not logged in, they CANNOT see the app
  if (!user) {
    return <LoginPage />;
  }

  // If logged in, they get the full router
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}> 
          <Route index element={<HomePage />} />
          <Route path="cept-data" element={<CeptData />} />
          <Route path="cept-create" element={<CeptCreate />} />
          <Route 
            path="admin" 
            element={user.role === 'admin' ? <AdminDashboard /> : <HomePage />} 
          />
          <Route 
            path="user-logs" 
            element={user.role === 'admin' ? <UserLogs /> : <HomePage />} 
          />
          <Route path="*" element={<ErrorPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;