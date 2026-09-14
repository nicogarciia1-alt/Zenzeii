/**
 * Post-payment Toshokan Pass arrival screen.
 *
 * Reached via Stripe's success_url (/payment-success?session_id=...). session_id
 * is never trusted as proof of membership here — it's forwarded to the backend
 * only so /api/membership/arrival can tell a non-membership checkout (e.g. an
 * audio pack, which also returns to this URL) apart from a Pass purchase whose
 * webhook simply hasn't landed yet. Membership truth is always the backend's.
 *
 * Three states:
 *  - verifying: bounded polling window while the checkout.session.completed
 *    webhook may still be in flight.
 *  - ready: the ceremonial arrival screen (the approved mockup).
 *  - recovery: polling window expired without confirmation — calm fallback,
 *    never claims success the backend hasn't confirmed.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMembershipArrival, acknowledgeMembershipArrival } from '@/lib/api';
import { ToshokanPassCard } from '@/features/toshokan/components/ToshokanPassCard';
import './membership-arrival.css';

const POLL_INTERVAL_MS = 900;
const POLL_TIMEOUT_MS = 11000;
const LIBRARY_ROUTE = '/library';

export default function MembershipArrivalPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [phase, setPhase] = useState('verifying'); // 'verifying' | 'ready' | 'recovery'
  const [member, setMember] = useState(null);
  const acknowledgedRef = useRef(false);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer;

    const poll = async () => {
      let status = 'pending';
      let memberData = null;
      try {
        const res = await getMembershipArrival(sessionId);
        status = res.data.status;
        memberData = res.data.member || null;
      } catch {
        // Treat a transient failure as still-pending; the bounded timeout below
        // still applies so a persistent error can't poll forever.
      }
      if (cancelled) return;

      if (status === 'ready') {
        setMember(memberData);
        setPhase('ready');
        return;
      }
      if (status === 'already_seen' || status === 'not_applicable') {
        navigate(LIBRARY_ROUTE, { replace: true });
        return;
      }
      if (Date.now() - startedAtRef.current >= POLL_TIMEOUT_MS) {
        setPhase('recovery');
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, navigate]);

  useEffect(() => {
    if (phase !== 'ready' || acknowledgedRef.current) return;
    acknowledgedRef.current = true;
    acknowledgeMembershipArrival().catch(() => {});
    refreshUser();
  }, [phase, refreshUser]);

  const handleEnter = () => navigate(LIBRARY_ROUTE);

  return (
    <div className="membership-arrival">
      <div className="membership-arrival__glow" aria-hidden="true" />
      <p className="membership-arrival__brand">ZENZEII</p>

      {phase === 'ready' && member && (
        <>
          <h1 className="membership-arrival__welcome-jp membership-arrival--enter">
            あなたの図書館へようこそ。
          </h1>
          <p className="membership-arrival__welcome-en membership-arrival--enter">
            Welcome to Zenzeii Toshokan.
          </p>
          <div className="membership-arrival__hairline membership-arrival--enter" aria-hidden="true" />

          <div className="membership-arrival__card membership-arrival--enter">
            <ToshokanPassCard size="arrival" member={member} />
          </div>

          <button
            type="button"
            className="membership-arrival__cta membership-arrival--enter"
            onClick={handleEnter}
          >
            Enter the Library
          </button>
        </>
      )}

      {phase === 'verifying' && (
        <div className="membership-arrival__verifying" role="status">
          <p className="membership-arrival__welcome-en">Preparing your library&hellip;</p>
          <div className="membership-arrival__spinner" aria-hidden="true" />
        </div>
      )}

      {phase === 'recovery' && (
        <div className="membership-arrival__recovery">
          <h1 className="membership-arrival__welcome-jp" style={{ fontSize: '28px' }}>
            Your membership is being prepared.
          </h1>
          <button type="button" className="membership-arrival__cta" onClick={handleEnter}>
            Enter Zenzeii
          </button>
        </div>
      )}
    </div>
  );
}
