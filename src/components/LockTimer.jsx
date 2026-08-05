import React, { useState, useEffect } from 'react';

function LockTimer({ onClose }) {
  const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 minutes in seconds

  useEffect(() => {
    if (timeLeft <= 0) {
      alert("Time expired! Your session lock on the Master Database has been released to allow others to work.");
      onClose();
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, onClose]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  // Style based on Tailwind-SCSS rules: No Tailwind for aesthetics like colors/backgrounds, 
  // but we can use an inline style or a class defined in _CeptData.scss.
  // We'll use a clean inline style here for simplicity, or add it to SCSS later if requested.
  // Using an aesthetic class 'lock-timer-pill' which we'll define in SCSS.
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  return (
    <div className="flex items-center justify-center w-full mb-4">
      <div className={`lock-timer-pill ${timeLeft <= 60 ? 'danger' : ''}`}>
        Lock Expires In: <strong>{timeString}</strong>
      </div>
    </div>
  );
}

export default LockTimer;
