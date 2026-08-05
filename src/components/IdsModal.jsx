import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');
import { motion, AnimatePresence } from 'framer-motion';
import Loader from './Loader';
import { useAuth } from '../context/AuthContext';
import LockTimer from './LockTimer';

function IdsModal({ modalData, onClose }) {
  const { user } = useAuth();
  
  const [baseUploadMessage, setBaseUploadMessage] = useState('');
  const [isBaseLoaded, setIsBaseLoaded] = useState(false);
  
  const [newUploadMessage, setNewUploadMessage] = useState('');
  const [newDataPreview, setNewDataPreview] = useState(null);
  const [isNewLoaded, setIsNewLoaded] = useState(false);
  
  const [transformedData, setTransformedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  // Auto-sync base data on mount
  useEffect(() => {
    handleUploadBaseData();
  }, []);

  const handleUploadBaseData = async () => {
    setIsProcessing(true);
    try {
      const response = await ipcRenderer.invoke('upload-base-data', { username: user.username });
      if (response.success) {
        setIsBaseLoaded(true);
        setBaseUploadMessage('');
      } else {
        setIsBaseLoaded(false);
        setBaseUploadMessage(`Error: ${response.message}`);
      }
    } catch (error) {
      setBaseUploadMessage(`Error: ${error.message}`);
      setIsBaseLoaded(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadNewData = async () => {
    try {
      const response = await ipcRenderer.invoke('upload-new-data', { username: user.username });
      if (response.success) {
        setNewUploadMessage('');
        setNewDataPreview(response.count);
        setIsNewLoaded(true);
        // Auto-trigger check
        handleCheck();
      } else if (response.message !== 'Upload canceled by user.') {
        setNewUploadMessage(response.message);
        setIsNewLoaded(false);
      }
    } catch (error) {
      setNewUploadMessage(`Error: ${error.message}`);
      setIsNewLoaded(false);
    }
  };

  const handleCheck = async () => {
    setIsProcessing(true);
    try {
      const response = await ipcRenderer.invoke('check-registration-numbers', { username: user.username });
      if (response.success) {
        setTransformedData(response.finalData);
      } else {
        alert(response.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async (isCloud = false) => {
    setIsExporting(true);
    setExportMessage('');
    try {
      const response = await ipcRenderer.invoke('export-data', { 
        username: user.username, 
        data: transformedData,
        targetDate: modalData.date,
        isCloud
      });
      if (response.success) {
        // Successfully exported, close modal
        onClose();
      } else if (response.message !== 'Export canceled by user.') {
        setExportMessage(`Error: ${response.message}`);
      }
    } catch (error) {
      setExportMessage(`Error: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="cept-modal-overlay" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="cept-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center cept-modal-header">
          <h2 className="text-white page-hero-title cept-modal-title">
            Check IDs <span className="gradient-text">{modalData.dayName}</span>
          </h2>
          <button className="cept-modal-close" onClick={onClose}>&times;</button>
        </div>

        <LockTimer onClose={onClose} />

        <p className="text-muted cept-modal-subtitle">
          Extracting registrations for {modalData.displayDate}. <span className="cept-success-text">The Master File was synced automatically.</span>
        </p>

        {baseUploadMessage && (
          <div className="cept-pill pending w-full mb-4 text-center">
            {baseUploadMessage}
          </div>
        )}

        <div className="cept-modal-body">
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div key="loader" className="flex flex-col items-center justify-center cept-modal-loader-container">
                <Loader />
                <p className="text-accent cept-modal-loader-text">PROCESSING DATA...</p>
              </motion.div>
            ) : !transformedData ? (
              <motion.div key="upload" className="flex flex-col items-center cept-modal-upload-box">
                <div className="cept-modal-upload-icon">↑</div>
                <h3 className="cept-modal-upload-title">Upload Registration Excel</h3>
                <p className="text-muted cept-modal-upload-desc">
                  Select the raw Excel files containing today's registrations to generate pure IDs.
                </p>
                <button 
                  className="gradient-btn primary" 
                  onClick={handleUploadNewData}
                  disabled={!isBaseLoaded}
                >
                  Browse Files
                </button>
                {newUploadMessage && <p className="cept-modal-error-msg">{newUploadMessage}</p>}
              </motion.div>
            ) : (
              <motion.div key="preview" className="flex flex-col w-full">
                <div className="flex justify-between items-center cept-modal-preview-header">
                  <div>
                    <h3 className="cept-modal-preview-title">Verification Complete</h3>
                    <p className="text-muted cept-modal-preview-subtitle">
                      {transformedData.reduce((acc, curr) => acc + curr.data.length, 0)} records processed.
                    </p>
                  </div>
                  <div className="cept-modal-preview-actions">
                    {exportMessage && <p className="cept-modal-export-error">{exportMessage}</p>}
                    
                    <button 
                      className="gradient-btn primary" 
                      onClick={() => handleExport(true)} 
                      disabled={isExporting}
                    >
                      {isExporting ? 'UPLOADING...' : 'UPLOAD TO CLOUD'}
                    </button>

                    <button 
                      className="gradient-btn secondary" 
                      onClick={() => handleExport(false)} 
                      disabled={isExporting}
                    >
                      {isExporting ? 'EXPORTING...' : 'EXPORT & COMPLETE'}
                    </button>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="cept-modal-table-container">
                  {transformedData.map((dataset, idx) => (
                    <div key={idx}>
                      <h4 className="cept-modal-table-title">{dataset.fileName}</h4>
                      <table className="results-table w-full">
                        <thead>
                          <tr>
                            <th>RegNum</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Mobile</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataset.data.map((row, index) => (
                            <tr key={index}>
                              <td><span className={row.wasModified ? 'cell-modified' : ''}>{row.regNum}</span></td>
                              <td title={row.name}>{row.name}</td>
                              <td title={row.email}>{row.email}</td>
                              <td>{row.mobile}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default IdsModal;
