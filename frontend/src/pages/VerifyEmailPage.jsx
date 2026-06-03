import React, { useEffect, useState } from 'react';
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
    textAlign: 'center',
  },
  logo: {
    fontSize: '36px',
    color: '#B5294E',
    marginBottom: '24px',
  },
  icon: {
    fontSize: '40px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '22px',
    color: '#3d2b1f',
    fontWeight: 400,
    marginBottom: '8px',
  },
  text: {
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
  spinner: {
    fontSize: '14px',
    color: '#7a5c44',
  },
};

export const VerifyEmailPage = () => {
  const token = new URLSearchParams(window.location.search).get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token found in this link.');
      return;
    }
    axios
      .get(`${API}/auth/verify-email`, { params: { token } })
      .then(() => setStatus('success'))
      .catch(err => {
        setStatus('error');
        setErrorMsg(err.response?.data?.detail || 'Verification failed. This link may have expired.');
      });
  }, [token]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>読</div>

        {status === 'loading' && (
          <p style={styles.spinner}>Verifying your email…</p>
        )}

        {status === 'success' && (
          <>
            <div style={styles.icon}>✓</div>
            <p style={styles.title}>Email verified</p>
            <p style={styles.text}>
              Your email has been confirmed.<br />
              You can now sign in to Zenzeii.
            </p>
            <a href="/auth" style={styles.link}>Go to login →</a>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={styles.icon}>⚠️</div>
            <p style={styles.title}>Verification failed</p>
            <p style={styles.text}>{errorMsg}</p>
            <a href="/auth" style={styles.link}>Return to login</a>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
