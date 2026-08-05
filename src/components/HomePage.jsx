import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
const { ipcRenderer } = window.require('electron');

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filesProcessed, setFilesProcessed] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await ipcRenderer.invoke('get-dashboard-stats');
        if (res.success) {
          setFilesProcessed(res.filesProcessed);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="home-page-wrapper">
      {/* Welcome Section */}
      <div className="home-welcome-section">
        <h1 className="home-welcome-title">
          Welcome back, <span className="highlight-username">{user?.username || 'User'}</span>
        </h1>
        <p className="home-subtitle text-muted">Select an operation to get started.</p>
        
        <div className="home-actions">
          <button className="gradient-btn" onClick={() => navigate('/cept-data')}>
            Manage CEPT Data
          </button>
          {user?.role === 'admin' && (
            <button className="gradient-btn secondary" onClick={() => navigate('/admin')}>
              Admin Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="home-stats-section">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: '#ffffff' }}>System Overview</h2>
        
        <div className="steam-cards-grid">
          <div className="glass-card new-dash-card">
            <div className="card-header">
              <h3>Files Processed This Month</h3>
              <div className="status-dot online"></div>
            </div>
            <div className="card-value">{filesProcessed}</div>
            <p className="card-trend text-muted">Data parsed and verified</p>
          </div>
          
          <div className="glass-card new-dash-card">
            <div className="card-header">
              <h3>Systems Operational</h3>
              <div className="status-dot online"></div>
            </div>
            <div className="card-value text-success">Optimal</div>
            <p className="card-trend text-muted">All services functional</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
