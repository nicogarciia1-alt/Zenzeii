import React from 'react';

// A single 5-petal blossom, drawn as small overlapping circles around a center.
const Blossom = ({ cx, cy, r = 5, color }) => {
  const petals = [0, 72, 144, 216, 288];
  return (
    <g>
      {petals.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const px = cx + Math.cos(rad) * r;
        const py = cy + Math.sin(rad) * r;
        return <circle key={deg} cx={px} cy={py} r={r * 0.85} fill={color} />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.6} fill={color} />
    </g>
  );
};

// Decorative sakura branch: a couple of curved strokes plus scattered blossoms.
export const SakuraBranch = ({ color, opacity = 0.1, className = '', style = {} }) => (
  <svg
    viewBox="0 0 220 340"
    className={className}
    style={{ pointerEvents: 'none', ...style }}
    aria-hidden="true"
  >
    <g stroke={color} strokeWidth="1.5" fill="none" opacity={opacity}>
      <path d="M200 10 C160 60, 150 110, 120 150 C90 190, 60 230, 20 320" />
      <path d="M150 90 C125 80, 105 68, 85 48" />
      <path d="M120 150 C95 142, 72 138, 50 122" />
      <path d="M90 210 C68 202, 48 198, 28 186" />
    </g>
    <g fill={color} opacity={opacity}>
      <Blossom cx={150} cy={45} r={5} color={color} />
      <Blossom cx={185} cy={35} r={4} color={color} />
      <Blossom cx={85} cy={45} r={4.5} color={color} />
      <Blossom cx={95} cy={140} r={5} color={color} />
      <Blossom cx={50} cy={120} r={4} color={color} />
      <Blossom cx={60} cy={225} r={4.5} color={color} />
      <Blossom cx={25} cy={185} r={4} color={color} />
      <Blossom cx={30} cy={290} r={5} color={color} />
    </g>
  </svg>
);

// Thin vertical bamboo-segment accent, used as a low-contrast right-edge decoration.
export const BambooEdge = ({ color, className = '' }) => (
  <svg viewBox="0 0 40 848" className={className} preserveAspectRatio="none" aria-hidden="true">
    <g stroke={color} strokeWidth="1.5" fill="none">
      <line x1="14" y1="0" x2="14" y2="848" />
      <line x1="26" y1="0" x2="26" y2="848" />
      {[60, 160, 260, 360, 460, 560, 660, 760].map((y) => (
        <g key={y}>
          <line x1="6" y1={y} x2="22" y2={y} />
          <line x1="18" y1={y + 40} x2="34" y2={y + 40} />
        </g>
      ))}
    </g>
  </svg>
);
