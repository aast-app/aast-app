import { useNavigate } from 'react-router-dom';

function ErrorPage() {
  const navigate = useNavigate();

  return (
    <div className="steam-layout-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', maxWidth: '500px' }}>
        <h1 className="steam-hero-title" style={{ fontSize: '5rem', color: '#df040a' }}>404</h1>
        <h2 className="glass-card-title" style={{ fontSize: '2rem', marginBottom: '1rem' }}>Page Not Found</h2>
        <p className="text-muted" style={{ marginBottom: '2.5rem' }}>
          Oops! We couldn't find the page you're looking for. It might have been moved or deleted.
        </p>
        
        <button 
          onClick={() => navigate('/')}
          className="gradient-btn"
        >
          Go Back Home
        </button>
      </div>
    </div>
  );
}

export default ErrorPage;
