/**
 * @fileoverview Minimal decorative waveform for the taster modal — fixed
 * CSS bars, no image asset, no animation (a static illustration of "an
 * excerpt", not a real audio visualization).
 */

// Fixed relative heights (%), quiet at the edges, one tall central accent —
// matches the approved mockup's shape without needing real audio data.
const BAR_HEIGHTS = [
  20, 32, 24, 44, 30, 52, 38, 64, 46, 78, 56, 100, 60, 82, 48, 68, 36, 54, 26, 40, 22,
];
const ACCENT_INDEX = 11;

export function AudioWaveform() {
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        width: '100%',
        maxWidth: '260px',
        height: '60px',
      }}
    >
      {BAR_HEIGHTS.map((h, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            height: `${h}%`,
            borderRadius: '2px',
            backgroundColor: i === ACCENT_INDEX ? '#6b1f1f' : 'rgba(72, 50, 40, 0.28)',
          }}
        />
      ))}
    </div>
  );
}
