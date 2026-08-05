import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

const { ipcRenderer } = window.require('electron');

function CeptCreate() {
  const { user } = useAuth();
  
  // Left Column State (Create Table - Wizard)
  const [wizardStep, setWizardStep] = useState(1); // 1: upload data, 2: map files, 3: upload tokens
  const [mappedFiles, setMappedFiles] = useState([]); // [{ filePath, fileName, count, locationName }]
  const [tokenFilePath, setTokenFilePath] = useState(null);
  const [openDropdownIdx, setOpenDropdownIdx] = useState(null);
  const [customLocationIdx, setCustomLocationIdx] = useState(null);
  const predefinedLocations = ['CS_lab 404', 'Maritime_lab 232'];
  
  const [isProcessingTable, setIsProcessingTable] = useState(false);
  const [isSuccessTable, setIsSuccessTable] = useState(false);
  const [unmatchedAlert, setUnmatchedAlert] = useState(null);
  const [tableError, setTableError] = useState('');

  // Right Column State (Generate PDF)
  const [ceptTablePaths, setCeptTablePaths] = useState([]);
  
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [isSuccessPdf, setIsSuccessPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [successPdfPath, setSuccessPdfPath] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // --- Handlers for Left Column ---
  const handleFileSelectData = async () => {
    try {
      const response = await ipcRenderer.invoke('select-file', {
        title: 'Select Student Data Files',
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
      });
      if (response.success && response.filePaths && response.filePaths.length > 0) {
        setIsProcessingTable(true);
        const analysis = await ipcRenderer.invoke('analyze-student-files', { filePaths: response.filePaths });
        setIsProcessingTable(false);
        if (analysis.success) {
          const sortedFiles = analysis.files.sort((a, b) => a.count - b.count);
          setMappedFiles(sortedFiles);
          setWizardStep(2); // Move to mapping step
        } else {
          setTableError(analysis.message);
        }
      }
    } catch (err) {
      setIsProcessingTable(false);
      setTableError(err.message);
    }
  };

  const handleFileSelectTokens = async () => {
    try {
      const response = await ipcRenderer.invoke('select-file', {
        title: 'Select Login Tokens',
        properties: ['openFile'],
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
      });
      if (response.success && response.filePaths && response.filePaths.length > 0) {
        setTokenFilePath(response.filePaths[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTable = async () => {
    setTableError('');
    setUnmatchedAlert(null);

    const unmappedCount = mappedFiles.filter(f => !f.locationName.trim()).length;
    if (unmappedCount > 0) {
      setTableError('Please select a location for all files before exporting.');
      return;
    }
    if (!tokenFilePath) {
      setTableError('Please upload the Login Tokens file (.csv).');
      return;
    }

    setIsProcessingTable(true);

    try {
      const response = await ipcRenderer.invoke('generate-cept-table', {
        username: user.username,
        mappedFiles,
        tokenFilePath
      });

      if (response.success) {
        if (response.unmatched && response.unmatched.length > 0) {
          setUnmatchedAlert(`Table Created! However, ${response.unmatched.length} students had no matching token in the CSV. Their passwords were left blank.`);
        } else {
          setIsSuccessTable(true);
        }
      } else {
        if (response.message !== 'Export canceled by user.') {
          setTableError(`Error: ${response.message}`);
        }
      }
    } catch (error) {
      setTableError(`System Error: ${error.message}`);
    } finally {
      setIsProcessingTable(false);
    }
  };

  const resetTableFlow = () => {
    setWizardStep(1);
    setMappedFiles([]);
    setTokenFilePath(null);
    setOpenDropdownIdx(null);
    setCustomLocationIdx(null);
    setIsSuccessTable(false);
    setUnmatchedAlert(null);
    setTableError('');
  };

  // --- Handlers for Right Column ---
  const handleFileSelectPdf = async () => {
    try {
      const response = await ipcRenderer.invoke('select-file', {
        title: 'Select Generated CEPT Table(s)',
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
      });
      if (response.success && response.filePaths && response.filePaths.length > 0) {
        setCeptTablePaths(response.filePaths);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGeneratePdf = async () => {
    setPdfError('');

    if (!ceptTablePaths || ceptTablePaths.length === 0) {
      setPdfError('Please upload at least one CEPT Table Excel file first.');
      return;
    }

    setIsProcessingPdf(true);

    try {
      const response = await ipcRenderer.invoke('generate-documents', {
        username: user.username,
        ceptTablePaths
      });

      if (response.success) {
        setSuccessPdfPath(response.pdfPath);
        setIsSuccessPdf(true);
      } else {
        if (response.message !== 'Export canceled by user.') {
          setPdfError(`Error: ${response.message}`);
        }
      }
    } catch (error) {
      setPdfError(`System Error: ${error.message}`);
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const resetPdfFlow = () => {
    setCeptTablePaths([]);
    setIsSuccessPdf(false);
    setSuccessPdfPath('');
  };

  const handlePreviewLayout = async () => {
    try {
      const res = await ipcRenderer.invoke('preview-pdf-layout');
      if (res.success) {
        setPreviewHtml(res.html);
        setShowPreview(prev => !prev); // Toggle the view below the cards
      } else {
        setPdfError('Failed to load preview layout.');
      }
    } catch (e) {
      setPdfError('System Error: ' + e.message);
    }
  };

  return (
    <div className="cept-create-container">
      <div className="page-hero">
        <h1 className="page-hero-title">
          CEPT <span className="gradient-text">Create</span>
        </h1>
      </div>

      <div className="cept-split-layout">
        
        {/* ================= LEFT COLUMN: TABLE GENERATOR ================= */}
        <div className="cept-split-card-left">
          <div className="cept-split-card-header">
            <h3>Step 1: Generate Master Table</h3>
          </div>
          
          <div className="cept-split-card-body">
            <AnimatePresence mode="wait">
              {isProcessingTable ? (
                <motion.div key="loader" className="flex flex-col items-center justify-center cept-split-view-state">
                  <Loader />
                  <p className="cept-modal-loader-text text-center">
                    MERGING & STYLING DATA...
                  </p>
                </motion.div>
              ) : isSuccessTable ? (
                <motion.div key="success" className="flex flex-col items-center justify-center cept-split-view-state"
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: "spring", bounce: 0.5 } }}>
                  <div className="cept-success-icon-wrapper">
                    <svg className="cept-premium-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <h3 className="cept-success-title gradient-text">Table Generated</h3>
                  <p className="cept-success-desc">The CEPT tables have been flawlessly styled and saved.</p>
                  <button className="gradient-btn" onClick={resetTableFlow}>GENERATE ANOTHER</button>
                </motion.div>
              ) : unmatchedAlert ? (
                <motion.div key="alert" className="flex flex-col items-center justify-center cept-split-view-state"
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <div className="cept-warning-icon">⚠️</div>
                  <h3 className="cept-warning-title">Attention Needed</h3>
                  <p className="cept-warning-desc">{unmatchedAlert}</p>
                  <button className="gradient-btn primary" onClick={resetTableFlow}>ACKNOWLEDGE & CONTINUE</button>
                </motion.div>
              ) : (
                <motion.div key="form" className="flex flex-col w-full cept-form-container">
                  {wizardStep === 1 && (
                    <div className="cept-upload-container" style={{ gridTemplateColumns: '1fr' }}>
                      <div className="cept-upload-card">
                        <h4 className="cept-upload-title">Student Data</h4>
                        <p className="cept-upload-desc">Select 1 or more Excel files to begin.</p>
                        <button 
                          className="gradient-btn secondary w-full"
                          onClick={handleFileSelectData}
                        >
                          UPLOAD .XLSX FILES
                        </button>
                      </div>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {wizardStep >= 2 && (
                      <motion.div 
                        className="cept-wizard-step-2"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      >
                        <h4 className="cept-mapping-title">Map File Locations</h4>
                      <div className="cept-file-mapping-list">
                        {mappedFiles.map((file, idx) => (
                          <motion.div 
                            key={idx} 
                            className="cept-mapping-row"
                            style={{ 
                              zIndex: openDropdownIdx === idx ? 9999 : (mappedFiles.length - idx), 
                              position: 'relative' 
                            }}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: idx * 0.15, ease: "easeOut" }}
                          >
                            <div className="cept-mapping-info">
                              <p className="cept-mapping-filename">{file.fileName}</p>
                              <p className="cept-mapping-count">{file.count} Students</p>
                            </div>
                            
                            <div className="cept-location-group cept-mapping-dropdown">
                              {customLocationIdx === idx ? (
                                <div className="flex w-full gap-2">
                                  <input 
                                    type="text" 
                                    className="modern-input w-full" 
                                    placeholder="Custom location..." 
                                    value={file.locationName}
                                    onChange={(e) => {
                                      const newMapped = [...mappedFiles];
                                      newMapped[idx].locationName = e.target.value;
                                      setMappedFiles(newMapped);
                                    }}
                                    autoFocus
                                  />
                                  <button 
                                    className="gradient-btn secondary cept-cancel-custom-btn"
                                    onClick={() => {
                                      setCustomLocationIdx(null);
                                      const newMapped = [...mappedFiles];
                                      newMapped[idx].locationName = '';
                                      setMappedFiles(newMapped);
                                    }}
                                  >
                                    X
                                  </button>
                                </div>
                              ) : (
                                <div className="cept-custom-dropdown-wrapper">
                                  <div 
                                    className={`modern-input cept-dropdown-trigger ${openDropdownIdx === idx ? 'open' : ''}`}
                                    onClick={() => setOpenDropdownIdx(openDropdownIdx === idx ? null : idx)}
                                  >
                                    <span className={file.locationName ? "text-primary truncate" : "text-muted truncate"}>
                                      {file.locationName || "Select location..."}
                                    </span>
                                    <span className="dropdown-arrow text-muted">▼</span>
                                  </div>
                                  
                                  <AnimatePresence>
                                    {openDropdownIdx === idx && (
                                      <motion.div 
                                        className={`cept-dropdown-menu ${idx >= mappedFiles.length - 2 ? 'drop-up' : ''}`}
                                        initial={{ opacity: 0, y: idx >= mappedFiles.length - 2 ? 10 : -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: idx >= mappedFiles.length - 2 ? 10 : -10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                      >
                                        {predefinedLocations.map((loc) => (
                                          <div 
                                            key={loc}
                                            className="cept-dropdown-item"
                                            onClick={() => {
                                              const newMapped = [...mappedFiles];
                                              newMapped[idx].locationName = loc;
                                              setMappedFiles(newMapped);
                                              setOpenDropdownIdx(null);
                                            }}
                                          >
                                            {loc}
                                          </div>
                                        ))}
                                        <div className="cept-dropdown-divider"></div>
                                        <div 
                                          className="cept-dropdown-item custom-add-item"
                                          onClick={() => {
                                            setCustomLocationIdx(idx);
                                            setOpenDropdownIdx(null);
                                            const newMapped = [...mappedFiles];
                                            newMapped[idx].locationName = '';
                                            setMappedFiles(newMapped);
                                          }}
                                        >
                                          + Add Custom
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <AnimatePresence>
                        {mappedFiles.every(f => f.locationName.trim() !== '') && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="cept-upload-container mt-6" 
                            style={{ gridTemplateColumns: '1fr' }}
                          >
                            <div className="cept-upload-card">
                              <h4 className="cept-upload-title">Login Tokens</h4>
                              <p className="cept-upload-desc">CSV file with Logins</p>
                              <button 
                                className={`gradient-btn ${tokenFilePath ? 'success' : 'secondary'} w-full`}
                                onClick={handleFileSelectTokens}
                              >
                                {tokenFilePath ? 'SELECTED ✓' : 'UPLOAD .CSV'}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                  {tableError && <p className="text-accent cept-modal-error-msg">{tableError}</p>}

                  {wizardStep >= 2 && tokenFilePath && mappedFiles.every(f => f.locationName.trim() !== '') && (
                    <div className="flex justify-end cept-form-actions mt-6">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="gradient-btn primary w-full"
                        onClick={handleCreateTable}
                      >
                        EXPORT EXCEL & PDF
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: PDF GENERATOR ================= */}
        <div className="cept-split-card-right">
          <div className="cept-split-card-header">
            <h3>Step 2: Generate PDF Logins</h3>
          </div>
          
          <div className="cept-split-card-body">
            <AnimatePresence mode="wait">
              {isProcessingPdf ? (
                <motion.div key="loader" className="flex flex-col items-center justify-center cept-split-view-state">
                  <Loader />
                  <p className="cept-modal-loader-text mt-4 text-center">
                    EXTRACTING DATA & RENDERING PDF...<br/>
                    <span className="text-sm opacity-70">This might take a moment.</span>
                  </p>
                </motion.div>
              ) : isSuccessPdf ? (
                <motion.div key="success" className="flex flex-col items-center justify-center cept-split-view-state"
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: "spring", bounce: 0.5 } }}>
                  <div className="cept-success-icon-wrapper">
                    <svg className="cept-premium-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <h3 className="cept-success-title gradient-text">PDF Generated</h3>
                  <p className="cept-success-desc">
                    The Candidate Login Information PDF has been rendered successfully.<br/><br/>
                    <span className="font-mono text-xs opacity-75">{successPdfPath}</span>
                  </p>
                  <button className="gradient-btn" onClick={resetPdfFlow}>GENERATE ANOTHER</button>
                </motion.div>
              ) : (
                <motion.div key="form" className="flex flex-col w-full cept-form-container h-full">
                  <div className="cept-pdf-info-text text-center">
                    <p className="text-sm opacity-80" style={{color: 'var(--text-muted)'}}>
                      Upload the generated CEPT Table to automatically extract every student and compile a massive, perfectly styled PDF containing their individual Login Information pages.
                    </p>
                  </div>

                  <div className="flex justify-center w-full cept-pdf-upload-wrapper">
                    <div className="cept-upload-card w-full">
                      <h4 className="cept-upload-title">CEPT Excel Table(s)</h4>
                      <p className="cept-upload-desc">Select the final styled Excel file(s)</p>
                      <button 
                        className={`gradient-btn ${ceptTablePaths.length > 0 ? 'success' : 'secondary'} w-full`}
                        onClick={handleFileSelectPdf}
                      >
                        {ceptTablePaths.length > 0 ? `${ceptTablePaths.length} FILE(S) SELECTED ✓` : 'UPLOAD TABLE(S)'}
                      </button>
                    </div>
                  </div>

                  {pdfError && <p className="text-accent cept-modal-error-msg text-center">{pdfError}</p>}

                  <div className="cept-form-actions-split">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="gradient-btn primary"
                      onClick={handleGeneratePdf}
                    >
                      GENERATE LOGIN PDF
                    </motion.button>

                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="gradient-btn secondary"
                      onClick={handlePreviewLayout}
                    >
                      {showPreview ? 'HIDE PREVIEW' : 'PREVIEW LAYOUT'}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
      </div>

      {/* Inline Preview Section (Bottom of Page) */}
      <AnimatePresence>
        {showPreview && (
          <motion.div 
            className="w-full cept-inline-preview-container"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="cept-inline-preview-header">
              <h3>Live Layout Preview</h3>
            </div>
            <div className="cept-inline-preview-body">
              <iframe 
                title="PDF Preview" 
                srcDoc={previewHtml} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default CeptCreate;
