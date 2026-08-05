import { createContext, useState, useContext } from 'react';

import Loader from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';

const { ipcRenderer } = window.require('electron');

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // We start with null, meaning nobody is logged in yet.
  const [user, setUser] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Function to save the user data when they successfully log in
  const login = (userData) => {
    setUser(userData);
  };

  // Function to clear the memory when they log out
  const logout = async () => {
    // Silent auto-backup triggers for ALL users on logout now
    setIsLoggingOut(true);
    try {
      await ipcRenderer.invoke('admin-export-db', { 
        adminUsername: user?.username || 'System', 
        mode: 'silent' 
      });
    } catch (err) {
      console.error("Silent backup failed during logout:", err);
    }
    setIsLoggingOut(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}
          >
            <Loader />
            <h2 style={{ marginTop: '2rem', fontWeight: 'bold' }}>Securing Database...</h2>
            <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>Running silent backup sequence.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}

// A custom hook so any component can easily grab the user info
export function useAuth() {
  return useContext(AuthContext);
}
