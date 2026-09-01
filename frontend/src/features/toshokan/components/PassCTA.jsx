import React from 'react';

export function PassCTA({ onClick, loading = false }) {
  return (
    <button type="button" className="pass-cta" onClick={onClick} disabled={loading}>
      {loading ? 'Redirecting…' : 'Get your Pass'}
    </button>
  );
}

export default PassCTA;
