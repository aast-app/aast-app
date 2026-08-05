import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';
import CustomSelect from './CustomSelect';
const { ipcRenderer } = window.require('electron');

export default function UserLogs() {
  const { user } = useAuth();
  
  // Data State
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  // Filter Options State (from DB)
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableActions, setAvailableActions] = useState([]);

  // Active Filters State
  const [filterUser, setFilterUser] = useState('All Users');
  const [filterAction, setFilterAction] = useState('All Actions');
  const [filterType, setFilterType] = useState('All Logs');
  const [filterDate, setFilterDate] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filterUser, filterAction, filterType, filterDate, page, limit]);

  const fetchFilters = async () => {
    try {
      const response = await ipcRenderer.invoke('admin-get-log-filters', { adminUsername: user.username });
      if (response.success) {
        setAvailableUsers(response.users);
        setAvailableActions(response.actions);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await ipcRenderer.invoke('admin-get-logs', {
        adminUsername: user.username,
        filterUser,
        filterAction,
        filterType,
        filterDate,
        page,
        limit
      });
      if (response.success) {
        setLogs(response.logs);
        setTotalItems(response.total);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBadgeClass = (action) => {
    switch (action) {
      case 'ID Check': 
      case 'ID Export': 
        return 'log-badge-id';
      case 'Scores Check': 
      case 'Scores Export': 
        return 'log-badge-scores';
      case 'Skip Day':
      case 'Undo Skip':
        return 'log-badge-skip';
      case 'Edit Day':
        return 'log-badge-edit';
      case 'Error': return 'log-badge-error';
      case 'Login': return 'log-badge-login';
      case 'Create User': return 'log-badge-create';
      case 'Delete User': return 'log-badge-delete';
      default: return 'log-badge-default';
    }
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    const day = d.getDate();
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    const time = d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="log-time-block">
        <div>{`${day} ${month} ${year}`}</div>
        <div>{time}</div>
      </div>
    );
  };

  const renderMetadata = (log) => {
    const { action, metadata } = log;
    if (!metadata || Object.keys(metadata).length === 0) return <span className="text-muted italic text-sm">N/A</span>;

    switch (action) {
      case 'Check IDs':
        return (
          <div className="metadata-mapped">
            <span className="metadata-label">Processed {metadata.totalRecordsProcessed} records across {metadata.totalFilesProcessed} file(s):</span>
            <ul className="metadata-list">
              {metadata.files?.map((f, i) => (
                <li key={i}>• {f.name} ({f.records} records)</li>
              ))}
            </ul>
          </div>
        );
      case 'Data Export':
        return (
          <div className="metadata-mapped">
            <span className="metadata-label">Dest: </span>
            <span className="metadata-value" style={{ wordBreak: 'break-all' }}>{metadata.destinationFolder}</span>
            <br />
            <span className="metadata-label">Files: </span>
            <span className="metadata-value">{metadata.fileCount}</span>
          </div>
        );
      case 'Error':
        return (
          <div className="metadata-mapped error-text">
            {metadata.fileName && (
              <>
                <span className="metadata-label">File: </span> {metadata.fileName}<br/>
              </>
            )}
            <span className="metadata-label">Issue: </span> {metadata.error}
          </div>
        );
      default:
        return (
          <div className="metadata-mapped">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key}>
                <span className="metadata-label capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                <span className="metadata-value">{String(value)}</span>
              </div>
            ))}
          </div>
        );
    }
  };

  const totalPages = Math.ceil(totalItems / limit) || 1;

  const handleClearFilters = () => {
    setFilterUser('All Users');
    setFilterAction('All Actions');
    setFilterType('All Logs');
    setFilterDate('');
    setPage(1);
  };

  return (
    <>
      <div className="header-container flex flex-col gap-2 mb-6">
        <h1 className="page-hero-title">
          System <span className="gradient-text">Logs</span>
        </h1>
      </div>

      <div className="logs-content-wrapper flex flex-col w-full h-full">
        <div className="glass-card logs-table-card flex flex-col w-full flex-1 min-h-0">
          
          {/* Filter Bar */}
          <div className="log-filter-bar">
            <div className="log-filter-group">
              <CustomSelect 
                className="log-filter-select-override"
                options={[
                  { label: "All Users", value: "All Users" },
                  ...availableUsers.map(u => ({ label: u.username, value: u.username }))
                ]} 
                value={filterUser} 
                onChange={(e) => { setFilterUser(e.target.value); setPage(1); }} 
              />

              <CustomSelect 
                className="log-filter-select-override"
                options={[
                  { label: "All Actions", value: "All Actions" },
                  ...availableActions.filter(a => a !== 'Error').map(a => ({ label: a, value: a }))
                ]}
                value={filterAction} 
                onChange={(e) => { setFilterAction(e.target.value); setPage(1); }} 
              />

              <CustomSelect 
                className="log-filter-select-override"
                options={[
                  { label: "All Logs", value: "All Logs" },
                  { label: "Normal Only", value: "Normal Only" },
                  { label: "Errors Only", value: "Errors Only" }
                ]}
                value={filterType} 
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }} 
              />

              <input 
                type="date" 
                className="log-filter-select" 
                value={filterDate} 
                onChange={(e) => { setFilterDate(e.target.value); setPage(1); }} 
              />
            </div>

            {(filterUser !== 'All Users' || filterAction !== 'All Actions' || filterType !== 'All Logs' || filterDate !== '') && (
              <button className="clear-filters-btn" onClick={handleClearFilters}>
                Clear Filters
              </button>
            )}
          </div>
          <div className="logs-table-container flex-1 overflow-auto w-full rounded-md">
            {isLoading ? (
              <div className="flex w-full h-full items-center justify-center py-20">
                <Loader />
              </div>
            ) : (
              <table className="logs-table w-full text-left">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>Details</th>
                    <th>Meta Data</th>
                    <th style={{ textAlign: 'right' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-muted">No logs found matching filters.</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <motion.tr 
                        key={log._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <td>
                          <div className="log-user-info">
                            <span className="log-username font-semibold">{log.username}</span>
                            <span className={`log-role capitalize ${log.role === 'admin' ? 'log-role-admin' : ''}`}>{log.role || 'System'}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`log-badge ${getBadgeClass(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="log-details">{log.details}</td>
                        <td className="log-metadata">
                          {renderMetadata(log)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {formatDate(log.timestamp)}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="pagination-footer">
            <div className="pagination-total">
              {totalItems} items
            </div>
            
            <div className="pagination-group">
              <button 
                className="pagination-btn icon-btn"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              
              <div className="pagination-info flex flex-row items-center gap-2 mx-4">
                <span>Page</span>
                <span className="pagination-current">{page}</span>
                <span>of {totalPages}</span>
              </div>
              
              <button 
                className="pagination-btn icon-btn"
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>

            <div className="pagination-group">
              <span className="text-muted text-sm">Show</span>
              <CustomSelect 
                className="pagination-select-override"
                minWidth="80px"
                options={[
                  { label: "10", value: 10 },
                  { label: "25", value: 25 },
                  { label: "50", value: 50 },
                  { label: "100", value: 100 }
                ]}
                value={limit} 
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
