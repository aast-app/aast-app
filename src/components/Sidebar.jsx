import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import VersionBadge from './VersionBadge';

function Sidebar({ versionInfo, openUpdateModal }) {
  const { user, logout } = useAuth();
  const username = user?.username || 'Guest User';
  const role = user?.role || 'user';

  return (
    <div className="steam-sidebar">
      <div className="sidebar-logo" style={{ justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          IEC AAST App
        </div>
        <ThemeToggle />
      </div>

      <nav className="nav-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Home
        </NavLink>
        <NavLink to="/cept-data" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          CEPT Data
        </NavLink>
        <NavLink to="/cept-create" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          CEPT Create
        </NavLink>
        {role === 'admin' && (
          <>
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Admin Dashboard
            </NavLink>
            <NavLink to="/user-logs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              User Logs
            </NavLink>
          </>
        )}
        
        <div style={{ marginTop: 'auto', paddingLeft: '0.25rem' }}>
          <VersionBadge versionInfo={versionInfo} openUpdateModal={openUpdateModal} className="sidebar-version-badge" />
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {username.charAt(0).toUpperCase()}
          </div>
          <span>{username}</span>
        </div>
        <button 
          onClick={logout} 
          title="Logout"
          className="logout-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
