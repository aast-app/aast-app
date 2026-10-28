import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/useAuth.js';
import Loader from './Loader';

function SSOHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    // Support both ?token= and #/sso?token=
    const params = new URLSearchParams(location.search);
    let token = params.get('token');
    
    if (!token && window.location.search.includes('token=')) {
        const standardParams = new URLSearchParams(window.location.search);
        token = standardParams.get('token');
    }

    if (token) {
      api.post('/auth-sso-login', { token })
        .then(res => {
          if (res.data.success) {
            login(res.data.user);
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
            navigate('/', { replace: true });
          } else {
            alert(res.data.message || 'SSO Login failed');
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
            navigate('/login', { replace: true }); 
          }
        })
        .catch(err => {
          console.error('SSO Error:', err);
          alert('SSO Error. Please try again.');
          window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
          navigate('/login', { replace: true });
        });
    } else {
      navigate('/login', { replace: true });
    }
  }, [location, login, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-default)', textAlign: 'center' }}>
      <Loader inline={true} />
      <h2 style={{ marginTop: '2rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Authenticating via SSO</h2>
      <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', opacity: 0.7 }}>Securely transferring your session...</p>
    </div>
  );
}

export default SSOHandler;
