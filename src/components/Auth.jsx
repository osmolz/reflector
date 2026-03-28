import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import './Auth.css';

export function Auth() {
  const { user, signUp, signIn, signOut, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');
    clearError();

    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setSuccessMessage('Sign up successful! Please check your email to confirm.');
        setEmail('');
        setPassword('');
      } else {
        await signIn(email, password);
        setSuccessMessage('Logged in successfully!');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut();
      setSuccessMessage('Logged out successfully!');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-success">
            <h2>Welcome</h2>
            <p>Logged in as: <strong>{user.email}</strong></p>
            <button
              className="auth-button logout-button"
              onClick={handleLogout}
              disabled={isLoading}
            >
              {isLoading ? 'Logging out...' : 'Log Out'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">
          {mode === 'login' ? 'Sign In' : 'Sign Up'}
        </h2>

        {error && <div className="auth-error">{error}</div>}
        {successMessage && <div className="auth-success-message">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-toggle">
          <p>
            {mode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <button
              type="button"
              className="toggle-link"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                clearError();
                setSuccessMessage('');
              }}
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
