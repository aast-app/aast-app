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
import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

// We extract the routing into an inner component so it can access useAuth
function AppContent({ versionInfo, openUpdateModal }) {
  const { user } = useAuth();

  // Route Protection: If not logged in, they CANNOT see the app
  if (!user) {
    return <LoginPage versionInfo={versionInfo} openUpdateModal={openUpdateModal} />;
  }

  // If logged in, they get the full router
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout versionInfo={versionInfo} openUpdateModal={openUpdateModal} />}> 
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
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await ipcRenderer.invoke('check-app-version');
        
        if (res.success) {
          setVersionInfo(res);
          if (res.isOutdated) {
            setShowVersionModal(true);
          }
        }
      } catch (err) {
        console.error("Failed to check app version on startup:", err);
      }
    };
    checkVersion();
  }, []);

  useEffect(() => {
    const handleProgress = (event, { percentage }) => {
      setDownloadProgress(percentage);
    };

    ipcRenderer.on('download-progress', handleProgress);

    return () => {
      ipcRenderer.removeListener('download-progress', handleProgress);
    };
  }, []);

  const openUpdateModal = () => {
    if (versionInfo && versionInfo.isOutdated) {
      setShowVersionModal(true);
    }
  };

  const handleDownload = async () => {
    if (!versionInfo?.downloadUrl) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      const result = await ipcRenderer.invoke('download-update', { url: versionInfo.downloadUrl });
      if (!result.success) {
        setIsDownloading(false);
        console.error("Update failed:", result.message);
        // Optionally show an error toast here
      }
    } catch (err) {
      setIsDownloading(false);
      console.error("Update error:", err);
    }
  };

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent versionInfo={versionInfo} openUpdateModal={openUpdateModal} />
        
        {/* Global Version Update Modal */}
        {showVersionModal && versionInfo && (
          <div className="version-modal-overlay">
            <div className="version-modal-content">
              <button 
                className="version-modal-close" 
                onClick={() => setShowVersionModal(false)}
                title="Dismiss"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              
              <div className="version-modal-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="version-icon">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <h2>Update Available</h2>
              </div>
              
              <div className="version-modal-body">
                <p>A new version of the application is available. Please update to continue using the latest features and improvements.</p>
                <div className="version-details">
                  <div className="version-row">
                    <span className="version-label">Current Version:</span>
                    <span className="version-value current">v{versionInfo.localVersion}</span>
                  </div>
                  <div className="version-row">
                    <span className="version-label">Latest Version:</span>
                    <span className="version-value latest">v{versionInfo.latestVersion}</span>
                  </div>
                </div>
              </div>

              <div className="version-modal-footer">
                {!isDownloading ? (
                  <button 
                    className="btn-download-update" 
                    onClick={handleDownload}
                  >
                    Download Latest Version
                  </button>
                ) : (
                  <div className="download-progress-container">
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${downloadProgress}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{downloadProgress}% Downloading...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;