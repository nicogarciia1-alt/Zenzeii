/**
 * @fileoverview Global Toshokan Pass gate provider.
 *
 * Deliberately thin: it only tracks which gate is open and renders the one
 * shared ToshokanGateModal. It does not know anything about libraries,
 * shelves, or AI usage — call sites resolve their own backend response
 * into a TOSHOKAN_GATE type + a small context object before calling
 * openGate(). See toshokanGates.js for the type/copy mapping.
 *
 * `gate` (the last-opened {type, context}) is kept separate from `open`
 * and is NOT cleared on close — only `open` flips to false. This keeps
 * the modal's content intact while Radix's exit animation plays, instead
 * of the headline/body vanishing a frame before the shell fades out.
 *
 * Mounted inside BrowserRouter (see App.js) because the CTA needs
 * useNavigate to reach the existing /pricing route — no second checkout
 * flow.
 */
import { createContext, useCallback, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToshokanGateModal } from '../components/gates/ToshokanGateModal';

const ToshokanGateContext = createContext(null);

export function ToshokanGateProvider({ children }) {
  const [gate, setGate] = useState(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const openGate = useCallback((type, context = {}) => {
    setGate({ type, context });
    setOpen(true);
  }, []);

  const closeGate = useCallback(() => {
    setOpen(false);
  }, []);

  const handleUpgrade = useCallback(() => {
    setOpen(false);
    navigate('/pricing');
  }, [navigate]);

  return (
    <ToshokanGateContext.Provider value={{ openGate, closeGate }}>
      {children}
      <ToshokanGateModal open={open} gate={gate} onClose={closeGate} onUpgrade={handleUpgrade} />
    </ToshokanGateContext.Provider>
  );
}

export function useToshokanGate() {
  const ctx = useContext(ToshokanGateContext);
  if (!ctx) {
    throw new Error('useToshokanGate must be used within a ToshokanGateProvider');
  }
  return ctx;
}
