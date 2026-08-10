import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CustomSelect from './CustomSelect';
const { ipcRenderer } = window.require('electron');

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [monthlyIdFiles, setMonthlyIdFiles] = useState(0);
  const [monthlyScoreFiles, setMonthlyScoreFiles] = useState(0);
  const [monthlyTables, setMonthlyTables] = useState(0);
  const [monthlyPdfs, setMonthlyPdfs] = useState(0);
  const [detailedStats, setDetailedStats] = useState([]);
  const [isBotRunning, setIsBotRunning] = useState(false);

  const [availableFilters, setAvailableFilters] = useState({ months: [], days: [], users: [] });
  const [filterMonth, setFilterMonth] = useState('All Months');
  const [filterDay, setFilterDay] = useState(''); // Use empty string for date picker
  const [filterUser, setFilterUser] = useState('All Users');
  
  const [statsMonth, setStatsMonth] = useState(''); // Empty string defaults to current month in backend

  const now = new Date();
  const currentMonthName = `${now.getFullYear()} ${now.toLocaleString('default', { month: 'long' })}`;

  const formatMonth = (monthStr) => {
    if (monthStr === 'All Months') return monthStr;
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return `${year} ${date.toLocaleString('default', { month: 'long' })}`;
  };

  const clearFilters = () => {
    setFilterMonth('All Months');
    setFilterDay('');
    setFilterUser('All Users');
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await ipcRenderer.invoke('get-dashboard-stats', statsMonth);
        if (res.success) {
          setMonthlyIdFiles(res.monthlyIdFiles);
          setMonthlyScoreFiles(res.monthlyScoreFiles);
          setMonthlyTables(res.monthlyTablesGenerated);
          setMonthlyPdfs(res.monthlyPdfsGenerated);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, [statsMonth]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await ipcRenderer.invoke('get-dashboard-filters');
        if (res.success) {
          setAvailableFilters({
            months: res.months,
            days: res.days,
            users: res.users
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (user?.role === 'admin') fetchFilters();
  }, [user]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const detailsRes = await ipcRenderer.invoke('get-dashboard-details', { filterMonth, filterDay, filterUser });
        if (detailsRes.success) {
          setDetailedStats(detailsRes.details);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (user?.role === 'admin') fetchDetails();
  }, [user, filterMonth, filterDay, filterUser]);

  const runPlaywrightTest = async () => {
    if (isBotRunning) return;
    setIsBotRunning(true);
    try {
      const response = await ipcRenderer.invoke('test-automation');
      if (!response.success) {
        console.error("Bot failed:", response.message);
      }
    } catch (err) {
      console.error("IPC Error:", err);
    } finally {
      setIsBotRunning(false);
    }
  };

  return (
    <div className="home-page-wrapper">
      {/* Welcome Section */}
      <div className="home-welcome-section">
        <div className="home-welcome-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1 className="home-welcome-title">
            Welcome back, <span className="highlight-username">{user?.username || 'User'}</span>
          </h1>
          {user?.role === 'admin' && (
            <button 
              className={`playwright-test-btn ${isBotRunning ? 'running' : ''}`}
              onClick={runPlaywrightTest}
              disabled={isBotRunning}
            >
              {isBotRunning ? 'Bot Running...' : 'Test Playwright Bot'}
            </button>
          )}
        </div>
        {user?.role === 'user' && (
          <>
            <p className="home-subtitle text-muted">Select an operation to get started.</p>
            
            <div className="home-actions">
              <button className="gradient-btn" onClick={() => navigate('/cept-data')}>
                Manage CEPT Data
              </button>
            </div>
          </>
        )}
        
        {user?.role === 'admin' && (
          <div className="admin-stats-wrapper">
            <div className="admin-stats-header">
              <h2 className="admin-stats-title">Monthly Stats</h2>
              <div className="admin-stats-current-month">
                <span className="showing-label">Showing</span>
                <CustomSelect 
                  className="inline-month-select"
                  value={statsMonth}
                  onChange={(e) => setStatsMonth(e.target.value)}
                  options={[
                    { 
                      label: <span className="highlighted-month">{currentMonthName}</span>, 
                      value: "" 
                    },
                    ...availableFilters.months.map(m => ({
                      label: <span className="highlighted-month">{formatMonth(m)}</span>,
                      value: m
                    }))
                  ]}
                />
              </div>
            </div>
            <div className="admin-magic-grid">
              {/* Card 1: IDs */}
              <div className="admin-magic-card">
                <div className="card-info">
                  <div className="card-content-wrapper">
                    <div className="card-text-side">
                      <p className="card-label">ID Files</p>
                      <p className="card-value">{monthlyIdFiles}</p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Card 2: Scores */}
              <div className="admin-magic-card">
                <div className="card-info">
                  <div className="card-content-wrapper">
                    <div className="card-text-side">
                      <p className="card-label">Scores</p>
                      <p className="card-value">{monthlyScoreFiles}</p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon">
                      <path d="M9 11l3 3L22 4"></path>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Card 3: Tables */}
              <div className="admin-magic-card">
                <div className="card-info">
                  <div className="card-content-wrapper">
                    <div className="card-text-side">
                      <p className="card-label">Tables</p>
                      <p className="card-value">{monthlyTables}</p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="3" y1="15" x2="21" y2="15"></line>
                      <line x1="9" y1="3" x2="9" y2="21"></line>
                      <line x1="15" y1="3" x2="15" y2="21"></line>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Card 4: PDFs */}
              <div className="admin-magic-card">
                <div className="card-info">
                  <div className="card-content-wrapper">
                    <div className="card-text-side">
                      <p className="card-label">Logins</p>
                      <p className="card-value">{monthlyPdfs}</p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <path d="M12 18v-6"></path>
                      <path d="M9 15l3 3 3-3"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {user?.role === 'admin' && (
        <div className="admin-breakdown-section">
          <div className="admin-breakdown-header">
            <h2 className="admin-stats-title">Daily Breakdown</h2>
            <div className="admin-filters-group">
              <input 
                type="date" 
                className="admin-date-picker" 
                value={filterDay} 
                onChange={(e) => setFilterDay(e.target.value)} 
                title="Select a specific day"
              />
              <CustomSelect 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)} 
                options={[
                  { label: "All Months", value: "All Months" },
                  ...availableFilters.months.map(m => ({ label: formatMonth(m), value: m }))
                ]} 
              />
              <CustomSelect 
                value={filterUser} 
                onChange={(e) => setFilterUser(e.target.value)} 
                options={[
                  { label: "All Users", value: "All Users" },
                  ...availableFilters.users.map(u => ({ label: u, value: u }))
                ]} 
              />
              {(filterMonth !== 'All Months' || filterDay !== '' || filterUser !== 'All Users') && (
                <button 
                  className="btn-clear-filters" 
                  onClick={clearFilters}
                  title="Clear Filters"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="admin-table-wrapper w-full overflow-x-auto">
            <table className="admin-detailed-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>ID Files</th>
                  <th>Scores</th>
                  <th>Tables</th>
                  <th>Logins</th>
                  <th>Contributors</th>
                </tr>
              </thead>
              <tbody>
                {detailedStats.map(stat => (
                  <tr key={stat.date}>
                    <td className="date-cell">{stat.date}</td>
                    <td>{stat.ids}</td>
                    <td>{stat.scores}</td>
                    <td>{stat.tables}</td>
                    <td>{stat.pdfs}</td>
                    <td>
                      {stat.contributors.length > 0 ? (
                        <div className="contributor-badges flex flex-wrap gap-2">
                          {stat.contributors.map(c => (
                            <span key={c} className="contributor-badge">{c}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="empty-state">None</span>
                      )}
                    </td>
                  </tr>
                ))}
                {detailedStats.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state-row">No daily data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats Cards Section (Users Only) */}
      {user?.role === 'user' && (
        <div className="home-stats-section">
        <h2 className="home-stats-title">System Overview</h2>
        
        <div className="steam-cards-grid">
          <div className="glass-card new-dash-card">
            <div className="card-header">
              <h3>Files Processed This Month</h3>
              <div className="status-dot online"></div>
            </div>
            <div className="card-stats-split">
               <div className="stat-group">
                 <div className="card-value">{monthlyIdFiles}</div>
                 <span className="stat-label">IDs</span>
               </div>
               <div className="stat-divider"></div>
               <div className="stat-group">
                 <div className="card-value">{monthlyScoreFiles}</div>
                 <span className="stat-label">Scores</span>
               </div>
            </div>
            <p className="card-trend text-muted">Data parsed and verified</p>
          </div>
          
          <div className="glass-card new-dash-card">
            <div className="card-header">
              <h3>Documents Generated This Month</h3>
              <div className="status-dot online"></div>
            </div>
            <div className="card-stats-split">
               <div className="stat-group">
                 <div className="card-value">{monthlyTables}</div>
                 <span className="stat-label">Tables</span>
               </div>
               <div className="stat-divider"></div>
               <div className="stat-group">
                 <div className="card-value">{monthlyPdfs}</div>
                 <span className="stat-label">PDFs</span>
               </div>
            </div>
            <p className="card-trend text-muted">Spreadsheets and login slips</p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default HomePage;
