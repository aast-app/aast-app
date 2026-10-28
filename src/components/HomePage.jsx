import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/useAuth.js';
import CustomSelect from './CustomSelect';
import api from '../api';
import { Icon } from './WorkspaceUI';

function HomePage() {
  const { user } = useAuth();
  const [monthlyIdFiles, setMonthlyIdFiles] = useState(0);
  const [monthlyScoreFiles, setMonthlyScoreFiles] = useState(0);
  const [monthlyTables, setMonthlyTables] = useState(0);
  const [monthlyPdfs, setMonthlyPdfs] = useState(0);
  const [detailedStats, setDetailedStats] = useState([]);
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [botResults, setBotResults] = useState(null);
  const [botError, setBotError] = useState(null);
  const [showBotSetup, setShowBotSetup] = useState(false);
  const [botSingleNumber, setBotSingleNumber] = useState('');
  const [botBatchNumbers, setBotBatchNumbers] = useState(null);
  const fileInputRef = useRef(null);

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
        const res = (await api.post('/get-dashboard-stats', { targetMonth: statsMonth })).data;
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
        const res = (await api.post('/get-dashboard-filters')).data;
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
        const detailsRes = (await api.post('/get-dashboard-details', { filterMonth, filterDay, filterUser })).data;
        if (detailsRes.success) {
          setDetailedStats(detailsRes.details);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (user?.role === 'admin') fetchDetails();
  }, [user, filterMonth, filterDay, filterUser]);

  
  const handleBotFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      const numbers = [];
      for (let i = 0; i < data.length; i++) {
        if (data[i] && data[i][0]) {
          numbers.push(String(data[i][0]).trim());
        }
      }
      setBotBatchNumbers(numbers);
    };
    reader.readAsBinaryString(file);
  };

  const runPlaywrightTest = async (numbersToProcess) => {
    if (isBotRunning) return;
    setIsBotRunning(true);
    try {
      setShowBotSetup(false);
      const response = (await api.post('/test-automation', { numbers: numbersToProcess })).data;
        if (response.success) {
          setBotResults({ failed: response.failedNumbers || [], success: response.successfulNumbers || [] });
          setBotError(null);
        } else {
          setBotError(response.message);
          setBotResults({ failed: response.failedNumbers || [], success: response.successfulNumbers || [] });
        }
    } catch (err) {
      setBotError(err.response?.data?.message || err.message || 'Unable to start enrollment.');
    } finally {
      setIsBotRunning(false);
    }
  };

  return (
    <div className="home-page-wrapper">
      <section className="workspace-hero">
        <div><span className="eyebrow">YOUR DAY, IN FOCUS</span><h1>Welcome back,<br/><span>{user?.username || 'User'}.</span></h1><p>Everything you need for a smoother CEPT day.</p></div>
        <div className="hero-art" aria-hidden="true"><div className="hero-orbit"/><div className="hero-mini-card"><Icon name="document"/><span>CEPT</span><b>Ready. Set. Go.</b><i/><i/><i/></div><span className="hero-stamp">✓</span></div>
      </section>
      {/* Welcome Section */}
      <div className="home-welcome-section">
        <div className="home-welcome-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span className="eyebrow">WORKSPACE ACTIVITY</span>
          {user?.role === 'admin' && (
            <button 
              className={`playwright-test-btn ${isBotRunning ? 'running' : ''}`}
              onClick={() => setShowBotSetup(true)}
              disabled={isBotRunning}
            >
              {isBotRunning ? 'Automation running…' : 'Bot test'}
            </button>
          )}
        </div>

        
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
      {user?.role !== 'admin' && (
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

      
      {showBotSetup && (
        <div className="cept-modal-overlay" onClick={() => setShowBotSetup(false)}>
          <div className="cept-modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="flex justify-between items-center cept-modal-header">
              <h2 className="text-white page-hero-title cept-modal-title">
                Bot <span className="gradient-text">Configuration</span>
              </h2>
              <button className="cept-modal-close" onClick={() => setShowBotSetup(false)}>&times;</button>
            </div>
            
            {!botBatchNumbers ? (
              <div className="cept-modal-body">
                <p style={{ color: 'white', marginBottom: '1rem' }}>Enter a single registration number:</p>
                <input 
                  type="text" 
                  className="cept-input"
                  style={{ width: '100%', marginBottom: '1rem' }}
                  placeholder="e.g. 241010570"
                  value={botSingleNumber}
                  onChange={(e) => setBotSingleNumber(e.target.value)}
                />
                <button 
                  className="gradient-btn" 
                  style={{ width: '100%', marginBottom: '1.5rem' }}
                  onClick={() => runPlaywrightTest([botSingleNumber])}
                  disabled={!botSingleNumber}
                >
                  Run Single Student
                </button>
                
                <div style={{ textAlign: 'center', color: '#888', marginBottom: '1.5rem' }}>— OR —</div>
                
                <p style={{ color: 'white', marginBottom: '1rem' }}>Upload Excel Sheet (Column A):</p>
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handleBotFileUpload}
                />
                <button 
                  className="btn-glass" 
                  style={{ width: '100%', padding: '1rem' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  Browse Excel File
                </button>
              </div>
            ) : (
              <div className="cept-modal-body text-center">
                <h3 style={{ color: '#10b981', fontSize: '2rem', marginBottom: '1rem' }}>{botBatchNumbers.length}</h3>
                <p style={{ color: 'white', marginBottom: '2rem' }}>Students found in the uploaded file.</p>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    className="btn-glass" 
                    style={{ flex: 1 }}
                    onClick={() => setBotBatchNumbers(null)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="gradient-btn" 
                    style={{ flex: 1 }}
                    onClick={() => runPlaywrightTest(botBatchNumbers)}
                  >
                    Proceed
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(botResults !== null || botError !== null) && (
        <div className="cept-modal-overlay" onClick={() => { setBotResults(null); setBotError(null); }}>
          <div className="cept-modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="flex justify-between items-center cept-modal-header">
              <h2 className="text-white page-hero-title cept-modal-title">
                Automation <span className="gradient-text">Complete</span>
              </h2>
              <button className="cept-modal-close" onClick={() => { setBotResults(null); setBotError(null); }}>&times;</button>
            </div>
            <div className="cept-modal-body">
              <h3 style={{ color: 'white', marginBottom: '1rem' }}>Processing Report</h3>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1, padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 'bold' }}>{botResults ? botResults.success.length : 0}</div>
                  <div style={{ color: '#a7f3d0', fontSize: '0.85rem' }}>Successful</div>
                </div>
                <div style={{ flex: 1, padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 'bold' }}>{botResults ? botResults.failed.length : 0}</div>
                  <div style={{ color: '#fecaca', fontSize: '0.85rem' }}>Failed</div>
                </div>
              </div>

              {botError && (
                <div style={{ color: '#ef4444', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ fontWeight: 'bold' }}>Automation Error or Interrupted:</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{botError.includes('browser has been closed') ? 'You manually closed the browser before the task finished.' : botError}</p>
                </div>
              )}

              {botResults && (botResults.success.length > 0 || botResults.failed.length > 0) && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                    {botResults.success.map(num => (
                      <li key={'s-'+num} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: '#e5e7eb' }}>{num}</span>
                        <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>✓ SUCCESS</span>
                      </li>
                    ))}
                    {botResults.failed.map(num => (
                      <li key={'f-'+num} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: '#e5e7eb' }}>{num}</span>
                        <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold' }}>✕ FAILED (Not Found)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button className="gradient-btn" onClick={() => { setBotResults(null); setBotError(null); }} style={{ marginTop: '1.5rem', width: '100%' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default HomePage;
