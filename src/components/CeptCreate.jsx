import { batchMasterFiles } from '../features/batches/masterTable.js';
import QuickLogins from './QuickLogins';
import BatchesModal from './BatchesModal';
import { readTokenFile, buildRosterArchive, buildLoginArchive } from '../features/documents/generate.js';
import { createDownloadTarget } from '../utils/download.js';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/useAuth.js';
import Loader from './Loader';
import api from '../api';
import { generateLoginPdfHtml } from '../features/documents/templates.js';

function CeptCreate() {
  const { user } = useAuth();
  const [loginMode, setLoginMode] = useState('tables');
  const [showBatches, setShowBatches] = useState(false);
  const [selectingBatch, setSelectingBatch] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  
  // Left Column State (Create Table - Wizard)
  const [wizardStep, setWizardStep] = useState(1);
  const [mappedFiles, setMappedFiles] = useState([]); // [{ file, fileName, count, locationName, data }]
  const [tokenFileData, setTokenFileData] = useState(null); // { file, fileName, data }
  const [openDropdownIdx, setOpenDropdownIdx] = useState(null);
  const [customLocationIdx, setCustomLocationIdx] = useState(null);
  const predefinedLocations = ['CS_lab 404', 'Maritime_lab 232'];
  
  const [isProcessingTable, setIsProcessingTable] = useState(false);
  const [isSuccessTable, setIsSuccessTable] = useState(false);
  const [unmatchedAlert, setUnmatchedAlert] = useState(null);
  const [tableError, setTableError] = useState('');

  // Right Column State (Generate PDF)
  const [ceptTableFiles, setCeptTableFiles] = useState([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [isSuccessPdf, setIsSuccessPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // Hidden inputs refs
  const tokensInputRef = useRef(null);
  const pdfTableInputRef = useRef(null);


  const handlePreviewLayout = () => {
    // Generate sample preview in frontend
    const sampleStudent = [{
        Username: '123456789',
        Password: 'passwordABC',
        Name: 'John Doe',
        Time: '10:00 AM',
        Location: 'CS_lab 404'
    }];
    setPreviewHtml(generateLoginPdfHtml(sampleStudent));
    setShowPreview(prev => !prev);
  };

  // --- Handlers for Left Column ---
  const chooseBatch = batch => {
    try {
      const files = batchMasterFiles(batch);
      setMappedFiles(files); setSelectedBatch({ id: batch.id, name: batch.name });
      setTokenFileData(null); setOpenDropdownIdx(null); setCustomLocationIdx(null);
      setTableError(''); setUnmatchedAlert(null); setIsSuccessTable(false);
      setWizardStep(2); setSelectingBatch(false);
    } catch (error) { setTableError(error.message); setSelectingBatch(false); }
  };

  const handleFileSelectTokens = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try { setTokenFileData(await readTokenFile(file)); setTableError(''); }
    catch (error) { setTokenFileData(null); setTableError(error.message); }
  };

  const handleCreateTable = async () => {
    setTableError('');
    setUnmatchedAlert(null);

    const unmappedCount = mappedFiles.filter(f => !f.locationName.trim()).length;
    if (unmappedCount > 0) {
      setTableError('Please select a location for all files before exporting.');
      return;
    }
    if (!tokenFileData) {
      setTableError('Please upload the Login Tokens file (.csv).');
      return;
    }

    setIsProcessingTable(true);

    try {
      const fileHandle = await createDownloadTarget({ suggestedName: 'CEPT_Tables.zip', types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }] });
      const { blob: zipBlob, unmatched, totalProcessed, locationsCount } = await buildRosterArchive(mappedFiles, tokenFileData.data);
      const writable = await fileHandle.createWritable();
      await writable.write(zipBlob);
      await writable.close();

      // Log success remotely
      await api.post('/log-cept-table', {
        username: user.username,
        locationsCount,
        totalProcessed,
        unmatchedCount: unmatched.length,
        unmatchedRegNums: unmatched
      });

      if (unmatched.length > 0) {
        const missingList = unmatched.length > 10 ? unmatched.slice(0, 10).join(', ') + `... (and ${unmatched.length - 10} more)` : unmatched.join(', ');
        setUnmatchedAlert(`Table Created! However, ${unmatched.length} student(s) had no matching token. Passwords were left blank for: ${missingList}`);
      } else {
        setIsSuccessTable(true);
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        setTableError(`System Error: ${error.message}`);
      }
    } finally {
      setIsProcessingTable(false);
    }
  };

  const resetTableFlow = () => {
    setSelectedBatch(null);
    setWizardStep(1);
    setMappedFiles([]);
    setTokenFileData(null);
    setOpenDropdownIdx(null);
    setCustomLocationIdx(null);
    setIsSuccessTable(false);
    setUnmatchedAlert(null);
    setTableError('');
  };

  // --- Handlers for Right Column ---
  const handleFileSelectPdf = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setCeptTableFiles(Array.from(files));
    }
  };

  const handleGeneratePdf = async () => {
    setPdfError('');
    if (ceptTableFiles.length === 0) {
      setPdfError('Please upload at least one CEPT Table Excel file first.');
      return;
    }

    try {
      const fileHandle = await createDownloadTarget({
        suggestedName: 'Login_PDFs.zip',
        types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }]
      });

      setIsProcessingPdf(true);

      const { blob: zipBlob, successCount, totalStudents } = await buildLoginArchive(ceptTableFiles);
      const writable = await fileHandle.createWritable();
      await writable.write(zipBlob);
      await writable.close();

      await api.post('/log-login-pdfs', {
        username: user.username,
        successCount,
        totalStudents
      });

      setIsSuccessPdf(true);

    } catch (error) {
      if (error.name !== 'AbortError') {
        setPdfError(`System Error: ${error.message}`);
      }
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const resetPdfFlow = () => {
    setCeptTableFiles([]);
    setIsSuccessPdf(false);
  };


  return (
    <div className="cept-create-container">
      <input type="file" accept=".csv" aria-label="Upload login tokens" ref={tokensInputRef} style={{ display: 'none' }} onChange={handleFileSelectTokens} />
      <input type="file" multiple accept=".xlsx, .xls" ref={pdfTableInputRef} style={{ display: 'none' }} onChange={handleFileSelectPdf} />
      <div  style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}></div>
      {selectingBatch && <BatchesModal onClose={() => setSelectingBatch(false)} onChoose={chooseBatch} />}
      {showBatches && <BatchesModal onClose={() => setShowBatches(false)} />}
      <div className="page-hero batch-page-heading">
        <h1 className="page-hero-title">
          CEPT <span className="gradient-text">Create</span>
        </h1>
        <button className="gradient-btn secondary" onClick={() => setShowBatches(true)}>Batches</button>
      </div>

      <div className="cept-split-layout">
        
        {/* ================= LEFT COLUMN: TABLE GENERATOR ================= */}
        <div className="cept-split-card-left">
          <div className="cept-split-card-header">
            <h3>Build your master table</h3>
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
                  <p className="cept-success-desc">Your CEPT tables have been generated and saved.</p>
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
                        <p className="cept-upload-desc">Choose a saved batch, assign locations, then add your login tokens.</p>
                        <button 
                          className="gradient-btn secondary w-full"
                          onClick={() => setSelectingBatch(true)}
                        >
                          Build master data table
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
                        <div className="cept-selected-batch"><div><span>Selected batch</span><strong>{selectedBatch?.name}</strong></div><button className="batch-back" onClick={() => setSelectingBatch(true)}>Change batch</button></div>
                        <h4 className="cept-mapping-title">Choose a location for each file</h4>
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
                                    aria-label={`Custom location for ${file.fileName}`}
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
                                  <button type="button" aria-label={`Location for ${file.fileName}`} aria-expanded={openDropdownIdx === idx}
                                    className={`modern-input cept-dropdown-trigger ${openDropdownIdx === idx ? 'open' : ''}`}
                                    onClick={() => setOpenDropdownIdx(openDropdownIdx === idx ? null : idx)}
                                  >
                                    <span className={file.locationName ? "text-primary truncate" : "text-muted truncate"}>
                                      {file.locationName || "Select location..."}
                                    </span>
                                    <span className="dropdown-arrow text-muted">▾</span>
                                  </button>
                                  
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
                        {mappedFiles.length > 0 && mappedFiles.every(f => f.locationName.trim() !== '') && (
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
                                className={`gradient-btn ${tokenFileData ? 'success' : 'secondary'} w-full`}
                                onClick={() => tokensInputRef.current.click()}
                              >
                                {tokenFileData ? `✓ ${tokenFileData.fileName}` : 'Upload tokens file (.csv)'}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                  {tableError && <p className="text-accent cept-modal-error-msg">{tableError}</p>}

                  {wizardStep >= 2 && tokenFileData && mappedFiles.length > 0 && mappedFiles.every(f => f.locationName.trim() !== '') && (
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
            <h3>Create candidate logins</h3>
          </div>
          
          <div className="cept-split-card-body">
            <div className="quick-login-modes" aria-label="Login creation method"><button type="button" aria-pressed={loginMode === 'tables'} disabled={isProcessingPdf} onClick={() => setLoginMode('tables')}>From master tables</button><button type="button" aria-pressed={loginMode === 'quick'} disabled={isProcessingPdf} onClick={() => setLoginMode('quick')}>Quick logins</button></div>
            {loginMode === 'quick' ? <QuickLogins /> : <>

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
                    <span className="font-mono text-xs opacity-75">Downloaded to your computer</span>
                  </p>
                  <button className="gradient-btn" onClick={resetPdfFlow}>GENERATE ANOTHER</button>
                </motion.div>
              ) : (
                <motion.div key="form" className="flex flex-col w-full cept-form-container h-full">
                  <div className="cept-pdf-info-text text-center">
                    <p className="text-sm opacity-80" style={{color: 'var(--text-muted)'}}>
                      Upload your CEPT tables to create a PDF with individual candidate login slips.
                    </p>
                  </div>

                  <div className="flex justify-center w-full cept-pdf-upload-wrapper">
                    <div className="cept-upload-card w-full">
                      <h4 className="cept-upload-title">CEPT Excel Table(s)</h4>
                      <p className="cept-upload-desc">Select the final styled Excel file(s)</p>
                      <button 
                        className={`gradient-btn ${ceptTableFiles.length > 0 ? 'success' : 'secondary'} w-full`}
                        onClick={() => pdfTableInputRef.current.click()}
                      >
                        {ceptTableFiles.length > 0 ? `${ceptTableFiles.length} FILE(S) SELECTED Γ£ô` : 'UPLOAD TABLE(S)'}
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
            </>}
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
