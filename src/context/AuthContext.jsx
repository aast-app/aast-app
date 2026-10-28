import { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './useAuth.js';

import Loader from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';

import api from '../api';


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  useEffect(() => {
    let active = true;
    const refresh = () => api.post('/auth-session').then(({ data }) => {
      if (active) setUser(data.user);
    }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setIsChecking(false); });
    const expire = () => setUser(null);
    const sync = event => { if (event.key === 'cept_auth_changed') refresh(); };
    refresh();
    window.addEventListener('storage', sync);
    window.addEventListener('cept-session-expired', expire);
    return () => { active = false; window.removeEventListener('storage', sync); window.removeEventListener('cept-session-expired', expire); };
  }, []);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Function to save the user data when they successfully log in
  const login = useCallback((userData) => {
    setUser(userData);
    localStorage.removeItem('cept_user');
    localStorage.setItem('cept_auth_changed', String(Date.now()));
  }, []);

  // Function to clear the memory when they log out
  const logout = async () => {
    // Silent auto-backup triggers for ALL users on logout now
    setIsLoggingOut(true);
    try {
      const { data } = await api.post('/auth-logout');
      if (!data.backupSaved) window.alert('You are signed out, but the automatic backup could not be saved. Please tell an administrator.');
    } catch (error) {
      if (error.response?.status !== 401) {
        setIsLoggingOut(false);
        window.alert('Sign out could not reach the server. Please try again.');
        return;
      }
    }
    setIsLoggingOut(false);
    setUser(null);
    localStorage.removeItem('cept_user');
    localStorage.setItem('cept_auth_changed', String(Date.now()));
  };

  if (isChecking) return <Loader />;

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

