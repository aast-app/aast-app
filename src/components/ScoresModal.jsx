import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');
import { motion, AnimatePresence } from 'framer-motion';
import Loader from './Loader';
import { useAuth } from '../context/AuthContext';
import LockTimer from './LockTimer';

function ScoresModal({ modalData, onClose }) {
  const { user } = useAuth();
  
  const [baseUploadMessage, setBaseUploadMessage] = useState('');
  const [isBaseLoaded, setIsBaseLoaded] = useState(false);
  
  const [scoresUploadMessage, setScoresUploadMessage] = useState('');
  const [scoresDataPreview, setScoresDataPreview] = useState(null);
  const [isScoresLoaded, setIsScoresLoaded] = useState(false);
  
  const [processedScores, setProcessedScores] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

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

  const handleUploadScoresData = async () => {
    try {
      const response = await ipcRenderer.invoke('upload-scores-data', { username: user.username });
      if (response.success) {
        setScoresUploadMessage('');
        setScoresDataPreview(response.count);
        setIsScoresLoaded(true);
        // Auto-trigger process
        handleProcessScores();
      } else if (response.message !== 'Upload canceled by user.') {
        setScoresUploadMessage(response.message);
        setIsScoresLoaded(false);
      }
    } catch (error) {
      setScoresUploadMessage(`Error: ${error.message}`);
      setIsScoresLoaded(false);
    }
  };

  const handleProcessScores = async () => {
    setIsProcessing(true);
    try {
      const response = await ipcRenderer.invoke('process-scores', { username: user.username });
      if (response.success) {
        setProcessedScores(response);
      } else {
        alert(response.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportMessage('');
    try {
      const response = await ipcRenderer.invoke('export-scores', { 
        username: user.username,
        targetDate: modalData.date
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
            Check Scores <span className="gradient-text">{modalData.dayName}</span>
          </h2>
          <button className="cept-modal-close" onClick={onClose}>&times;</button>
        </div>

        <LockTimer onClose={onClose} />

        <p className="text-muted cept-modal-subtitle">
          Injecting Cambridge scores for {modalData.displayDate}. <span className="cept-success-text">The Master File was synced automatically.</span>
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
                <p className="text-accent cept-modal-loader-text">PROCESSING SCORES...</p>
              </motion.div>
            ) : !processedScores ? (
              <motion.div key="upload" className="flex flex-col items-center cept-modal-upload-box">
                <div className="cept-modal-upload-icon">↑</div>
                <h3 className="cept-modal-upload-title">Upload Cambridge CSV</h3>
                <p className="text-muted cept-modal-upload-desc">
                  Select the raw Cambridge CSV file to inject grades into your master database.
                </p>
                <button 
                  className="gradient-btn primary" 
                  onClick={handleUploadScoresData}
                  disabled={!isBaseLoaded}
                >
                  Browse Files
                </button>
                {scoresUploadMessage && <p className="cept-modal-error-msg">{scoresUploadMessage}</p>}
              </motion.div>
            ) : (
              <motion.div key="preview" className="flex flex-col w-full">
                <div className="flex justify-between items-center cept-modal-preview-header">
                  <div>
                    <h3 className="cept-modal-preview-title">Processing Complete</h3>
                    <p className="text-muted cept-modal-preview-subtitle">
                      <strong className="text-accent">{processedScores.matchedCount}</strong> injected into Master Data.
                    </p>
                    {(processedScores.unmatchedList.length > 0 || processedScores.fullyScoredList.length > 0) && (
                      <div className="cept-modal-errors" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        {processedScores.unmatchedList.length > 0 && (
                          <p style={{ color: '#ef4444', marginBottom: '0.5rem' }}>
                            <strong>Missing IDs:</strong> {processedScores.unmatchedList.length} not found in Master.
                          </p>
                        )}
                        {processedScores.fullyScoredList.length > 0 && (
                          <p style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem', borderRadius: '4px', color: '#ef4444' }}>
                            <strong>Fully Scored:</strong> {processedScores.fullyScoredList.length} already maxed out all Retake slots.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="cept-modal-preview-actions">
                    {exportMessage && <p className="cept-modal-export-error">{exportMessage}</p>}
                    <button className="gradient-btn secondary" onClick={handleExport} disabled={isExporting}>
                      {isExporting ? 'EXPORTING...' : 'EXPORT AAST XLSX & COMPLETE'}
                    </button>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="cept-modal-table-container">
                  <h4 className="cept-modal-table-title">AAST Ready Export Preview</h4>
                  <table className="results-table w-full">
                    <thead>
                      <tr>
                        <th>Original ID</th>
                        <th>Changed ID</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedScores.cleanData.map((row, index) => {
                        const isMissing = processedScores.unmatchedList.includes(row.rawRegNum);
                        const isFullyScored = processedScores.fullyScoredList.includes(row.rawRegNum);
                        
                        return (
                          <tr key={index}>
                            <td className="opacity-50" title={row.rawRegNum}>
                              {isMissing ? (
                                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{row.rawRegNum}</span>
                              ) : isFullyScored ? (
                                <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.4)', fontWeight: 'bold' }}>
                                  {row.rawRegNum}
                                </span>
                              ) : (
                                row.rawRegNum
                              )}
                            </td>
                            <td><span className={row.strippedRegNum !== row.rawRegNum ? 'cell-modified' : ''}>{row.strippedRegNum}</span></td>
                            <td>
                              {row.isMatched ? <span className="text-accent">Updated</span> : <span className="opacity-50">Ignored / Error</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default ScoresModal;
