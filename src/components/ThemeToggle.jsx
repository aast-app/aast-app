import React, { useState, useEffect } from 'react';
import '../styles/_ThemeToggle.scss';

function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check local storage or default to dark
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      setIsDark(true);
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="theme-toggle-wrapper">
      <label className="switch">
        <input 
          id="theme-input" 
          type="checkbox" 
          checked={isDark} 
          onChange={toggleTheme} 
        />
        <div className="slider round">
          <div className="sun-moon">
            <svg id="moon-dot-1" className="moon-dot" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="moon-dot-2" className="moon-dot" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="moon-dot-3" className="moon-dot" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="light-ray-1" className="light-ray" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="light-ray-2" className="light-ray" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="light-ray-3" className="light-ray" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="50"></circle>
            </svg>

            <svg id="cloud-1" className="cloud-dark" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="cloud-2" className="cloud-dark" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="cloud-3" className="cloud-dark" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="cloud-4" className="cloud-light" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="cloud-5" className="cloud-light" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg id="cloud-6" className="cloud-light" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="50"></circle>
            </svg>
          </div>
          <div className="stars">
            <svg id="star-1" className="star" viewBox="0 0 20 20">
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
            </svg>
            <svg id="star-2" className="star" viewBox="0 0 20 20">
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
            </svg>
            <svg id="star-3" className="star" viewBox="0 0 20 20">
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
            </svg>
            <svg id="star-4" className="star" viewBox="0 0 20 20">
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
            </svg>
          </div>
        </div>
      </label>
    </div>
  );
}

export default ThemeToggle;
