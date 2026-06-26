import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Loader2 } from 'lucide-react';
import { getAudioBalance, purchaseAudioPack } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';

// ── Design tokens ──────────────────────────────────────────────
const LIGHT = {
  bg:          '#F5F0E8',
  cardBg:      '#EDE6D6',
  cardBorder:  '#C9BC9E',
  inkPrimary:  '#1C1410',
  inkSecondary:'#3D2B1F',
  muted:       '#6B5744',
  gold:        '#8B6914',
  btnBg:       '#1C1410',
  btnText:     '#F5F0E8',
  btnHover:    '#2C2018',
};
const DARK = {
  bg:          '#1C1410',
  cardBg:      '#2C2018',
  cardBorder:  '#C9BC9E',
  inkPrimary:  '#F5F0E8',
  inkSecondary:'#C9BC9E',
  muted:       '#8B7A6B',
  gold:        '#8B6914',
  btnBg:       '#F5F0E8',
  btnText:     '#1C1410',
  btnHover:    '#EDE6D6',
};

const PACKS = [
  {
    id: 'starter_10',
    kanji: '十分',
    name: 'Ten Minutes',
    minutes: 10,
    price: '€1.99',
    description: 'Enjoy ten minutes of native Japanese literary narration. Perfect for a single chapter.',
  },
  {
    id: 'standard_30',
    kanji: '三十分',
    name: 'Thirty Minutes',
    minutes: 30,
    price: '€4.99',
    description: 'A full evening of narrated reading. Enough for several chapters at your own pace.',
    featured: true,
  },
  {
    id: 'library_60',
    kanji: '一時間',
    name: 'One Hour',
    minutes: 60,
    price: '€7.99',
    description: 'An entire book, from first page to last. The complete narrated experience.',
  },
];

export default function AudioPacksPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const t = theme === 'dark' ? DARK : LIGHT;

  const params = new URLSearchParams(location.search);
  const justPurchased = params.get('payment') === 'success';
  const fromBookId = params.get('from');

  const [loadingPack, setLoadingPack] = useState(null);
  const [hoveredPack, setHoveredPack] = useState(null);
  const [balanceData, setBalanceData] = useState(null);

  useEffect(() => {
    getAudioBalance()
      .then(r => setBalanceData(r.data))
      .catch(() => {});
  }, []);

  const handleBuy = async (packId) => {
    setLoadingPack(packId);
    try {
      const res = await purchaseAudioPack(packId);
      window.location.href = res.data.checkout_url;
    } catch {
      setLoadingPack(null);
    }
  };

  // ── Post-purchase confirmation ────────────────────────────────
  if (justPurchased) {
    const mins = balanceData ? balanceData.total_minutes_available : null;
    return (
      <Layout>
        <div style={{ backgroundColor: t.bg, minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '60px 24px' }}>
          <div style={{ position: 'absolute', fontSize: '260px', opacity: 0.05, pointerEvents: 'none', userSelect: 'none', color: t.inkPrimary, lineHeight: 1, fontFamily: '"Cormorant Garamond", Georgia, serif', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', zIndex: 0 }}>
            声
          </div>
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '500px' }}>
            <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '72px', opacity: 0.12, color: t.inkPrimary, lineHeight: 1, marginBottom: '28px', userSelect: 'none' }}>
              声
            </div>
            <h1 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '40px', color: t.inkPrimary, marginBottom: '16px', fontWeight: 400, lineHeight: 1.2 }}>
              Your voice has been added.
            </h1>
            {mins !== null && (
              <p style={{ fontFamily: '"Crimson Text", Georgia, serif', fontSize: '18px', color: t.muted, fontStyle: 'italic', marginBottom: '36px', lineHeight: 1.65 }}>
                {mins.toFixed(1)} minutes of Japanese narration<br />is now available in your account.
              </p>
            )}
            {fromBookId ? (
              <button
                onClick={() => navigate(`/read/${fromBookId}`)}
                style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '16px', padding: '12px 36px', backgroundColor: t.btnBg, color: t.btnText, border: 'none', borderRadius: '4px', cursor: 'pointer', letterSpacing: '0.03em' }}
              >
                Return to reading
              </button>
            ) : (
              <Link
                to="/"
                style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '16px', padding: '12px 36px', backgroundColor: t.btnBg, color: t.btnText, borderRadius: '4px', textDecoration: 'none', letterSpacing: '0.03em', display: 'inline-block' }}
              >
                Return to library
              </Link>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // ── Main page ─────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ backgroundColor: t.bg, minHeight: '100vh', paddingBottom: '80px' }}>

        {/* Hero */}
        <div style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', padding: '80px 24px 56px' }}>
          <div
            aria-hidden
            style={{ position: 'absolute', fontSize: '300px', opacity: 0.06, pointerEvents: 'none', userSelect: 'none', color: t.inkPrimary, lineHeight: 1, fontFamily: '"Cormorant Garamond", Georgia, serif', top: '50%', left: '50%', transform: 'translate(-50%, -55%)', zIndex: 0 }}
          >
            声
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(36px, 5vw, 54px)', color: t.inkPrimary, fontWeight: 400, lineHeight: 1.18, marginBottom: '20px', letterSpacing: '-0.01em' }}>
              Listen to Japan's greatest stories<br />told in their native voice.
            </h1>
            <p style={{ fontFamily: '"Crimson Text", Georgia, serif', fontSize: '18px', fontStyle: 'italic', color: t.muted, maxWidth: '460px', margin: '0 auto', lineHeight: 1.65 }}>
              High-quality narration by native Japanese voices.<br />Minutes never expire — your library, your pace.
            </p>
          </div>
        </div>

        {/* Balance indicator */}
        {balanceData !== null && (
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <span style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '15px', color: t.muted, letterSpacing: '0.02em' }}>
              {balanceData.total_minutes_available > 0
                ? <>声&nbsp;&nbsp;{balanceData.total_minutes_available.toFixed(1)} min available</>
                : 'No audio minutes in your account yet.'}
            </span>
          </div>
        )}

        {/* Pack cards */}
        <div style={{ maxWidth: '920px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          {PACKS.map(pack => (
            <div
              key={pack.id}
              style={{
                backgroundColor: t.cardBg,
                border: pack.featured ? `2px solid ${t.gold}` : `1px solid ${t.cardBorder}`,
                borderRadius: '8px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Japanese numeral — decorative chapter number */}
              <div
                aria-hidden
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '64px', opacity: 0.15, color: t.inkPrimary, lineHeight: 1, marginBottom: '6px', userSelect: 'none' }}
              >
                {pack.kanji}
              </div>

              {/* Pack name */}
              <div style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '16px', color: t.inkSecondary, marginBottom: '18px' }}>
                {pack.name}
              </div>

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: t.cardBorder, marginBottom: '20px' }} />

              {/* Price */}
              <div style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '32px', color: t.gold, lineHeight: 1, marginBottom: '14px' }}>
                {pack.price}
              </div>

              {/* Description */}
              <p style={{ fontFamily: '"Crimson Text", Georgia, serif', fontSize: '15px', fontStyle: 'italic', color: t.muted, lineHeight: 1.65, marginBottom: '28px', flex: 1 }}>
                {pack.description}
              </p>

              {/* CTA button */}
              <button
                onClick={() => handleBuy(pack.id)}
                onMouseEnter={() => setHoveredPack(pack.id)}
                onMouseLeave={() => setHoveredPack(null)}
                disabled={loadingPack !== null}
                style={{
                  width: '100%',
                  padding: '13px',
                  backgroundColor: hoveredPack === pack.id && loadingPack === null ? t.btnHover : t.btnBg,
                  color: t.btnText,
                  border: 'none',
                  borderRadius: '4px',
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontSize: '16px',
                  letterSpacing: '0.03em',
                  cursor: loadingPack !== null ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.15s',
                  opacity: loadingPack !== null && loadingPack !== pack.id ? 0.5 : 1,
                }}
              >
                {loadingPack === pack.id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : 'Add to your library'}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: '44px', fontFamily: '"Crimson Text", Georgia, serif', fontSize: '13px', color: t.muted, fontStyle: 'italic' }}>
          Minutes never expire and stack with any monthly allowance. Speed control is always free.
        </p>
      </div>
    </Layout>
  );
}
