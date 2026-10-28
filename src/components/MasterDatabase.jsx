import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { validateHeaders } from '../utils/spreadsheetHeaders.js';
import api from '../api';
import Loader from './Loader';
import StudentDatabase from './StudentDatabase';

export default function MasterDatabase() {
  const uploadInput = useRef(null);
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [uploadModal, setUploadModal] = useState({ show: false, status: 'idle', message: '' });

  const handleUploadMasterData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadModal({ show: true, status: 'uploading', message: 'Reading file locally...' });
    
    try {
      const dataBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      validateHeaders(rawData[0] || [], 'master');
      const dataRows = rawData.slice(1);
      const totalRows = dataRows.length;
      
      if (totalRows === 0) {
        setUploadModal({ show: true, status: 'error', message: 'File is empty.' });
        return;
      }

      const chunkSize = 500;
      let preview;
      let uploadId;
      
      for (let i = 0; i < totalRows; i += chunkSize) {
        const chunk = dataRows.slice(i, i + chunkSize);
        const percent = Math.round((i / totalRows) * 100);
        
        setUploadModal({ 
          show: true, 
          status: 'uploading', 
          message: `Preparing preview... ${percent}% (${i}/${totalRows}). Nothing saved yet.` 
        });

        const isLastChunk = (i + chunkSize) >= totalRows;
        
        const response = await api.post('/upload-master-data-chunk', {
          uploadId,
          totalRows,
          chunkIndex: i / chunkSize,
          fileName: file.name,
          dataRows: chunk,
          isLastChunk
        });
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Chunk upload failed');
        }
        
        if (response.data.uploadId) uploadId = response.data.uploadId;
        if (isLastChunk) preview = response.data;
      }
      
      setUploadModal({ 
        show: true, 
        status: 'preview',
        draftId: preview.draftId,
        message: `${preview.summary.records} records: ${preview.summary.added} new, ${preview.summary.updated} existing records to update. Nothing has been saved yet.` 
      });

    } catch (error) {
      console.error('Upload Error:', error);
      setUploadModal({ show: true, status: 'error', message: error.message || 'An error occurred while uploading. Ensure the server is running.' });
    } finally {
      e.target.value = '';
    }
  };

  const saveMasterImport = async () => {
    const preview = uploadModal;
    setUploadModal({ ...preview, status: 'uploading', message: 'Saving the complete import...' });
    try {
      const { data } = await api.post('/commit-import', { draftId: preview.draftId });
      if (!data.success) throw new Error(data.message);
      setRecordsVersion(value => value + 1);
      setUploadModal({ show: true, status: 'success', message: `Saved all ${data.processedCount} records.` });
    } catch (error) {
      setUploadModal({ ...preview, status: 'preview', message: `${error.response?.data?.message || error.message} Retry to confirm the result; records will not be applied twice.` });
    }
  };


  return <div>
    <input ref={uploadInput} type="file" accept=".xlsx,.xls,.csv" aria-label="Upload master data" hidden onChange={handleUploadMasterData} disabled={uploadModal.show} />
    <StudentDatabase key={recordsVersion} headerAction={<button type="button" className="gradient-btn" disabled={uploadModal.show} onClick={() => uploadInput.current.click()}>Upload/Update Master Data</button>} />
      <AnimatePresence>
        {uploadModal.show && (
          <div className="cept-modal-overlay">
            <motion.div
              className="cept-modal-container upload-modal-container"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
            >
              {uploadModal.status === 'uploading' && (
                <div className="flex flex-col items-center upload-modal-content">
                  <Loader size="lg" />
                  <h3 className="upload-modal-title">{uploadModal.message}</h3>
                  <p className="upload-modal-text">Please wait while the database is updated. This may take a moment.</p>
                </div>
              )}
              
              {uploadModal.status === 'preview' && (
                <div className="upload-modal-content">
                  <h3>Review master import</h3>
                  <p>{uploadModal.message}</p>
                  <p>Saving updates scores and values. Existing family names are preserved; names for new students stay temporary until checked through an official ID file. The whole import succeeds together or nothing changes.</p>
                  <button className="gradient-btn" onClick={saveMasterImport}>SAVE ALL RECORDS</button>
                  <button className="gradient-btn secondary" onClick={() => { api.post('/discard-import', { draftId: uploadModal.draftId }).catch(() => {}); setUploadModal({ show: false, status: 'idle', message: '' }); }}>Discard preview</button>
                </div>
              )}

              {uploadModal.status === 'success' && (
                <div className="flex flex-col items-center upload-modal-content">
                  <div className="flex items-center justify-center upload-modal-icon-success">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3 className="upload-modal-title-success">Import Complete</h3>
                  <p className="upload-modal-text">{uploadModal.message}</p>
                  <button className="gradient-btn upload-modal-btn" onClick={() => setUploadModal({ show: false, status: 'idle', message: '' })}>
                    Continue
                  </button>
                </div>
              )}

              {uploadModal.status === 'error' && (
                <div className="flex flex-col items-center upload-modal-content">
                  <div className="flex items-center justify-center upload-modal-icon-error">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <h3 className="upload-modal-title-error">Upload Failed</h3>
                  <p className="upload-modal-text">{uploadModal.message}</p>
                  <button className="gradient-btn upload-modal-btn" onClick={() => setUploadModal({ show: false, status: 'idle', message: '' })}>
                    Dismiss
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

  </div>;
}
