import { useState, useMemo } from 'react';
import api from '../api';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from './Loader';
import { useAuth } from '../context/useAuth.js';
import IdsModal from './IdsModal';
import ScoresModal from './ScoresModal';


// Helper to get Friday of the current week
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  // We want Friday (5). If today is < 5 (Sun-Thu), we go back to previous Friday.
  // If today is 5 or 6 (Fri, Sat), we go back to Friday.
  const diff = day >= 5 ? day - 5 : day + 2;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = (date) => {
  const d = new Date(date);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

const formatDisplayDate = (date) => {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

const getDayName = (date) => {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(date);
};

function CeptData() {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current, negative = past, positive = future
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + index);
    return date;
  }), [currentWeekStart]);
  const { data: operations, error: operationsError, loading: isLoading, refresh: fetchOperations } = useApiQuery('/get-week-operations', { dates: weekDates.map(formatDate) });
  const opsMap = operations?.data || {};
  const [activeModal, setActiveModal] = useState(null);
  const [editModeDays, setEditModeDays] = useState({}); // Track rows in edit mode // { type: 'ids' | 'scores', date: 'YYYY-MM-DD', displayDate: '' }
  

  const handlePrevWeek = () => {
    if (weekOffset <= -4) return;
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
    setWeekOffset(prev => prev - 1);
  };

  const handleNextWeek = () => {
    if (weekOffset >= 2) return;
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
    setWeekOffset(prev => prev + 1);
  };

  const handleJumpToCurrent = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
    setWeekOffset(0);
  };

  const openModal = async (type, dateObj) => {
    setActiveModal({
      type,
      date: formatDate(dateObj),
      displayDate: formatDisplayDate(dateObj),
      dayName: getDayName(dateObj)
    });
  };

  const closeModalAndRefresh = async () => {
    setActiveModal(null);
    setEditModeDays({}); // Exit edit mode on close
    fetchOperations(weekDates.map(d => formatDate(d)));
  };

  const toggleEditMode = async (dateStr) => {
    const isActivatingEdit = !editModeDays[dateStr];
    setEditModeDays(prev => ({ ...prev, [dateStr]: isActivatingEdit }));

    if (isActivatingEdit) {
      try {
        await api.post('log-frontend-action', {
          username: user.username,
          action: 'Edit Day',
          details: `Unlocked edit mode for ${dateStr}`,
          metadata: { targetDate: dateStr }
        });
      } catch (error) {
        console.error("Failed to log edit action:", error);
      }
    }
  };

  const handleToggleSkip = async (type, dateObj, currentValue) => {
    try {
      const targetDate = formatDate(dateObj);
      
      // Background request
      await api.post('/toggle-not-needed', {
        targetDate,
        type,
        value: !currentValue,
        username: user.username
      }).then(({ data }) => {
        if (!data.success) throw new Error(data.message);
        fetchOperations();
      }).catch(error => {
        console.error(error);
        fetchOperations(weekDates.map(d => formatDate(d))); // Revert if fails
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      {operationsError && <p role="alert">{operationsError}</p>}
        <div className="flex justify-between items-center cept-header-container" style={{ width: '100%' }}>
          <h1 className="cept-page-title page-hero-title">
            CEPT <span className="gradient-text">Data</span>
          </h1>
          <div className="flex items-center gap-4">
            
          </div>
        </div>

      

      <div className="cept-calendar-wrapper">
        <div className="flex justify-between items-center cept-calendar-header">
          <button 
            className={`cept-nav-btn gradient-btn secondary ${weekOffset <= -4 ? 'disabled' : ''}`} 
            onClick={handlePrevWeek}
            disabled={weekOffset <= -4}
          >
            &larr; Previous
          </button>
          <div className="flex flex-col items-center">
            <div className={`cept-week-label ${weekOffset < 0 ? 'week-past' : weekOffset > 0 ? 'week-future' : 'week-current'}`}>
              {weekDates.length > 0 && `${formatDisplayDate(weekDates[0])} - ${formatDisplayDate(weekDates[6])}`}
            </div>
            {weekOffset !== 0 && (
              <button className="cept-jump-btn" onClick={handleJumpToCurrent}>
                Return to Current Week
              </button>
            )}
          </div>
          <button 
            className={`cept-nav-btn gradient-btn secondary ${weekOffset >= 2 ? 'disabled' : ''}`} 
            onClick={handleNextWeek}
            disabled={weekOffset >= 2}
          >
            Next &rarr;
          </button>
        </div>

        <div className="cept-calendar-grid">
          <div className="grid grid-cols-5 cept-grid-header text-muted">
            <div>Date</div>
            <div>Day</div>
            <div>Check IDs</div>
            <div>Check Scores</div>
            <div className="text-right">Actions</div>
          </div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center cept-grid-loader">
                <Loader />
              </motion.div>
            ) : (
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col cept-grid-body">
                {weekDates.map((dateObj, idx) => {
                  const dateStr = formatDate(dateObj);
                  const ops = opsMap[dateStr] || { idsUploaded: false, scoresUploaded: false };
                  const isToday = dateStr === formatDate(new Date());
                  const isEditing = editModeDays[dateStr];

                  return (
                    <div key={dateStr} className={`grid grid-cols-5 items-center cept-grid-row ${isToday && weekOffset === 0 ? 'cept-row-today' : ''}`} style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="cept-cell-date font-bold">
                        {formatDisplayDate(dateObj)}
                      </div>
                      <div className="cept-cell-day">
                        {getDayName(dateObj)}
                      </div>
                      <div>
                        {ops.idsUploaded && !isEditing ? (
                          <div className="cept-action-btn success w-full">✓ Completed</div>
                        ) : ops.idsNotNeeded ? (
                          <div className="cept-action-btn skipped text-center w-full">Not Needed</div>
                        ) : (
                          <button className={`cept-action-btn ${ops.idsUploaded && isEditing ? 'update' : 'pending'} w-full`} onClick={() => openModal('ids', dateObj)}>
                            {ops.idsUploaded && isEditing ? 'Update IDs' : 'Upload IDs'}
                          </button>
                        )}
                      </div>
                      <div>
                        {ops.scoresUploaded && !isEditing ? (
                          <div className="cept-action-btn success w-full">✓ Completed</div>
                        ) : ops.scoresNotNeeded ? (
                          <div className="cept-action-btn skipped text-center w-full">Not Needed</div>
                        ) : (
                          <button className={`cept-action-btn ${ops.scoresUploaded && isEditing ? 'update' : 'pending'} w-full`} onClick={() => openModal('scores', dateObj)}>
                            {ops.scoresUploaded && isEditing ? 'Update Scores' : 'Upload Scores'}
                          </button>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        {(ops.idsUploaded || ops.scoresUploaded) && (
                          <button className={`cept-skip-btn ${isEditing ? 'undo' : ''}`} onClick={() => toggleEditMode(dateStr)} title="Toggle Edit Mode">
                            {isEditing ? 'Cancel Edit' : 'Edit Day'}
                          </button>
                        )}
                        {(ops.idsNotNeeded || ops.scoresNotNeeded) ? (
                          <button className="cept-skip-btn undo" onClick={() => handleToggleSkip('both', dateObj, true)} title="Undo Skip Day">
                            &times; Undo Skip
                          </button>
                        ) : (!ops.idsUploaded && !ops.scoresUploaded) ? (
                          <button className="cept-skip-btn" onClick={() => handleToggleSkip('both', dateObj, false)} title="Skip Entire Day">
                            Skip Day
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {activeModal && activeModal.type === 'ids' && (
          <IdsModal modalData={activeModal} onClose={closeModalAndRefresh} />
        )}
        {activeModal && activeModal.type === 'scores' && (
          <ScoresModal modalData={activeModal} onClose={closeModalAndRefresh} />
        )}
      </AnimatePresence>
    </>
  );
}

export default CeptData;
 
