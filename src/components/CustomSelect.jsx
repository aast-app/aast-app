import React, { useState, useRef, useEffect } from 'react';

const CustomSelect = ({ options, value, onChange, className = '', minWidth = '140px' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange({ target: { value: optionValue } }); 
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value) || { label: value, value };

  return (
    <div className={`custom-select-container ${className}`} ref={containerRef} style={{ minWidth }}>
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="custom-select-text">{selectedOption.label}</span>
        <svg 
          className={`custom-select-chevron ${isOpen ? 'open' : ''}`} 
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      <div className={`custom-select-dropdown ${isOpen ? 'open' : ''}`}>
        <ul className="custom-select-list">
          {options.map((opt) => (
            <li 
              key={opt.value}
              className={`custom-select-item ${opt.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CustomSelect;
