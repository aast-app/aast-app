import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';
export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await window.require('electron').ipcRenderer.invoke('auth-login', { username, password });
      
      if (response.success) {
        login(response.user);
      } else {
        setError(response.message || 'Login failed.');
      }
    } catch (err) {
      console.error(err);
      setError('An internal error occurred. Ensure your database is connected.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="steam-layout-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <motion.div 
        className="glass-card login-card"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="login-header">
          <h1 className="login-title">
            IEC A<span>A</span>ST
          </h1>
          <p className="login-subtitle text-muted">
            helper
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="login-error-message"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          
          <div className="modern-input-container">
            <label className="modern-label">Username</label>
            <input 
              type="text" 
              className="modern-input" 
              placeholder="e.g. admin" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="modern-input-container login-input-group-last">
            <label className="modern-label">Password</label>
            <input 
              type="password" 
              className="modern-input" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', padding: '0.5rem' }}>
              <Loader inline size="3em" />
            </div>
          ) : (
            <button 
              type="submit" 
              className="gradient-btn" 
              style={{ width: '100%', marginTop: '1rem' }}
            >
              LOGIN TO PORTAL
            </button>
          )}
          
        </form>
      </motion.div>
    </div>
  );
}
