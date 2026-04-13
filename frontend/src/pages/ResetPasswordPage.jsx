import React, { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://zenzeii-production.up.railway.app/api';

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f5efe0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: 'EB Garamond, Georgia, serif',
  },
  card: {
    background: '#fff9f0',
    border: '1px solid #c8b89a',
    borderRadius: '8px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 2px 16px rgba(61,43,31,0.08)',
  },
  logo: {
    fontSize: '36px',
    color: '#B5294E',
    marginBottom: '4px',
    textAlign: 'center',
  },
  title: {
    fontSize: '22px',
    color: '#3d2b1f',
    fontFamily: 'EB Garamond, Georgia, serif',
    textAlign: 'center',
    marginBottom: '8px',
    fontWeight: 400,
  },
  subtitle: {
    fontSize: '14px',
    color: '#7a5c44',
    textAlign: 'center',
    marginBottom: '32px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    color: '#7a5c44',
    marginBottom: '6px',
    letterSpacing: '0.03em',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #c8b89a',
    borderRadius: '4px',
    fontSize: '15px',
    fontFamily: 'EB Garamond, Georgia, serif',
    color: '#3d2b1f',
    background: '#fdf8f0',
    boxSizing: 'border-box',
    marginBottom: '16px',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '11px',
    background: '#B5294E',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '15px',
    fontFamily: 'EB Garamond, Georgia, serif',
    cursor: 'pointer',
    letterSpacing: '0.03em',
    marginTop: '4px',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  error: {
    fontSize: '13px',
    color: '#B5294E',
    marginBottom: '12px',
    textAlign: 'center',
  },
  success: {
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '40px',
    marginBottom: '16px',
  },
  successTitle: {
    fontSize: '20px',
    color: '#3d2b1f',
    marginBottom: '8px',
    fontWeight: 400,
  },
  successText: {
    fontSize: '14px',
    color: '#7a5c44',
    marginBottom: '24px',
    lineHeight: '1.6',
  },
  link: {
    color: '#B5294E',
    textDecoration: 'none',
    fontSize: '14px',
  },
  invalid: {
    textAlign: 'center',
    padding: '32px 0',
  },
  invalidIcon: {
    fontSize: '36px',
    marginBottom: '12px',
  },
  invalidText: {
    fontSize: '15px',
    color: '#7a5c44',
    marginBottom: '20px',
  },
};

export const ResetPasswordPage = () => {
  const token = new URLSearchParams(window.location.search).get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>読</div>
          <div style={styles.invalid}>
            <div style={styles.invalidIcon}>⚠️</div>
            <p style={styles.invalidText}>This reset link is invalid or has expired.</p>
            <a href="/auth" style={styles.link}>Return to login</a>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>読</div>
          <div style={styles.success}>
            <div style={styles.successIcon}>✓</div>
            <p style={styles.successTitle}>Password reset</p>
            <p style={styles.successText}>
              Your password has been updated successfully.<br />
              You can now sign in with your new password.
            </p>
            <a href="/auth" style={styles.link}>Go to login →</a>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. This link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>読</div>
        <h1 style={styles.title}>Reset your password</h1>
        <p style={styles.subtitle}>Enter a new password for your Zenzeii account.</p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>New password</label>
          <input
            type="password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength={6}
            style={styles.input}
          />
          <label style={styles.label}>Confirm password</label>
          <input
            type="password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            style={styles.input}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
          >
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
