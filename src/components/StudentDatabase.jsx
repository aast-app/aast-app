import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/useAuth.js';
import Loader from './Loader';
import api from '../api';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { downloadBlob } from '../utils/download.js';
import '../styles/_RegistrationExport.scss';
const baseNumber = number => String(number).trim().replace(/-R\d+$/i, '');

export default function StudentDatabase({ headerAction }) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  
  // Pagination & Search
  const [page, setPage] = useState(1);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [activeDate, setActiveDate] = useState('');

  const { data, error: queryError, loading: isLoading } = useApiQuery('/admin-get-students', {
    adminUsername: user.username, page, pageSize: 50, searchQuery: activeSearch, searchDate: activeDate,
  });
  const students = data?.students || [];
  const totalPages = data?.totalPages || 1;
  const totalStudents = data?.totalStudents || 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeSearch !== searchQuery || activeDate !== searchDate) {
        setPage(1);
        setActiveSearch(searchQuery);
        setActiveDate(searchDate);
      }
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery, activeSearch, searchDate, activeDate]);



    const visibleBases = [...new Set(students.map(student=>baseNumber(student.registrationNumber)))];
  const allVisibleSelected = visibleBases.length>0 && visibleBases.every(base=>selected.includes(base));
  function toggleStudent(base, checked) {
    setSelected(current=>checked?[...new Set([...current,base])]:current.filter(number=>number!==base));
  }
  function togglePage(checked) {
    const next=checked?[...new Set([...selected,...visibleBases])]:selected.filter(number=>!visibleBases.includes(number));
    if(next.length>500){setMessage('Error: Select at most 500 students per export.');return;}
    setSelected(next);
  }
  async function exportNumbers() {
    if(isExporting||!selected.length)return;
    setIsExporting(true);setMessage('');
    try{
      const {data}=await api.post('/admin-next-registration-numbers',{adminUsername:user.username,baseNumbers:selected});
      if(!data.success)throw new Error(data.message);
      const {default:ExcelJS}=await import('exceljs');
      const workbook=new ExcelJS.Workbook();
      const sheet=workbook.addWorksheet('Next registration numbers');
      sheet.getColumn(1).width=30;
      data.numbers.forEach(number=>{const cell=sheet.addRow([String(number)]).getCell(1);cell.numFmt='@';});
      const blob=new Blob([await workbook.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      downloadBlob(blob, 'Next-registration-numbers.xlsx');
      setMessage(`Exported ${data.numbers.length} next registration numbers.`);
    }catch(error){setMessage(`Error: ${error.response?.data?.message||error.message||'Export failed. Please try again.'}`);}
    finally{setIsExporting(false);}
  }

  return (
    <motion.div 
      className="admin-content-wrapper" 
      style={{ height: '100%' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="header-container" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-hero-title">
            Master <span className="gradient-text">database</span>
          </h1>
          <p className="text-muted" style={{ fontSize: '1rem', marginTop: '0.5rem' }}>
            Total Records: {totalStudents}
          </p>
        </div>
        {headerAction}
      </div>

      {(message || queryError) && (
        <div className={`admin-message-box ${(queryError || message.startsWith('Error')) ? 'error' : 'success'}`}>
          {message || queryError}
        </div>
      )}

      <section className="registration-export-bar" aria-label="Registration number export">
        <div><strong>{selected.length} students selected</strong><p>Selections stay across searches and pages. Export contains numbers only; it does not register or reserve a new attempt.</p></div>
        <div className="registration-export-actions"><button type="button" className="gradient-btn secondary" disabled={!selected.length||isExporting} onClick={()=>setSelected([])}>Clear selection</button><button type="button" className="gradient-btn" disabled={!selected.length||selected.length>500||isExporting} onClick={exportNumbers}>{isExporting?'Preparing Excel…':'Export next numbers'}</button></div>
      </section>
      <div className="admin-main-area">
        <div className="glass-card user-roster-card">
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div className="modern-input-container" style={{ marginBottom: 0, flex: 1, position: 'relative' }}>
              <input 
                type="text" 
                className="modern-input" 
                placeholder="Search by registration number or student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isLoading && (
                <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                  <Loader size="sm" />
                </div>
              )}
            </div>
            <div className="modern-input-container" style={{ marginBottom: 0, width: '200px' }}>
              <input 
                type="date" 
                className="modern-input"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-table-container">
            {isLoading && students.length === 0 ? (
              <div style={{ padding: '3rem' }}><Loader /></div>
            ) : (
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" aria-label="Select all students on this page" checked={allVisibleSelected} disabled={isLoading||isExporting||!visibleBases.length} onChange={e=>togglePage(e.target.checked)}/></th>
                    <th>Reg Number</th>
                    <th>Student Name</th>
                    <th>Name Status</th>
                    <th>Score</th>
                    <th>Value</th>
                    <th>Created At</th>
                    <th>Updated At</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id}>
                      <td><input type="checkbox" aria-label={`Select student ${student.registrationNumber}`} checked={selected.includes(baseNumber(student.registrationNumber))} disabled={isExporting||isLoading||(!selected.includes(baseNumber(student.registrationNumber))&&selected.length>=500)} onChange={e=>toggleStudent(baseNumber(student.registrationNumber),e.target.checked)}/></td>
                      <td style={{ fontFamily: 'monospace' }}>{student.registrationNumber}</td>
                      <td>{student.name || `${student.firstName} ${student.lastName}`.trim() || 'Name not provided'}</td>
                      <td><span title={student.nameVerified ? 'Confirmed by an official ID file and shared across all attempts.' : 'Temporary name awaiting an official ID-file check.'}>{student.nameVerified ? 'ID confirmed' : 'Needs ID check'}</span></td>
                      <td>{student.score !== null ? student.score : '-'}</td>
                      <td>{student.value || '-'}</td>
                      <td>{new Date(student.createdAt).toLocaleDateString()}</td>
                      <td>{new Date(student.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {students.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No student records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', padding: '1rem' }}>
              <button 
                className="gradient-btn secondary" 
                disabled={page <= 1 || isLoading}
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '0.5rem 1rem' }}
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button 
                className="gradient-btn secondary" 
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '0.5rem 1rem' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
