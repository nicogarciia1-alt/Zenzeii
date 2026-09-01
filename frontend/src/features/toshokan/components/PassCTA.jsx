import React from 'react';

export function PassCTA({ onClick }) {
  return (
    <button type="button" className="pass-cta" onClick={onClick}>
      Get your Pass
    </button>
  );
}

export default PassCTA;
