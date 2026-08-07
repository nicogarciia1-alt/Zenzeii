/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans JP', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif JP', 'Merriweather', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
        playfair: ['Playfair Display', 'Georgia', 'serif'],
        garamond: ['EB Garamond', 'Georgia', 'serif'],
        cormorant: ['Cormorant Garamond', 'Georgia', 'serif'],
        crimson: ['Crimson Text', 'Georgia', 'serif'],
      },
      // UI Refinement Brief — Library design system tokens.
      // 8px spacing grid. Keys are 'spacing-N' rather than bare numbers so
      // they can't collide with (or be confused with) Tailwind's own default
      // spacing scale, where e.g. p-4 already means 1rem/16px — a different
      // value than an 8px-grid "step 4" would imply.
      spacing: {
        'spacing-1': '8px',
        'spacing-2': '16px',
        'spacing-3': '24px',
        'spacing-4': '32px',
        'spacing-6': '48px',
        'spacing-8': '64px',
        'spacing-12': '96px',
        'spacing-16': '128px',
      },
      fontSize: {
        display: ['56px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['48px', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        h2: ['32px', { lineHeight: '1.2', letterSpacing: '-0.005em', fontWeight: '600' }],
        h3: ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.7', fontWeight: '400' }],
        body: ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        // Zenzeii Library feature — scoped token set (frontend/src/features/library).
        // Does not replace or alias the app-wide tokens above; the Library page
        // opts into this palette explicitly via the `library-*` utility classes.
        //
        // WCAG AA contrast ratios (Phase 11 audit — text pairings actually used
        // in the Library UI; formula: relative luminance per WCAG 2.x, computed
        // against every background token each color realistically appears on):
        //   text-primary   (#1A1814) on bg-primary (#FAFAF8): 16.96:1 — passes (needs 4.5:1)
        //   text-secondary (#6B6560) on bg-primary (#FAFAF8):  5.50:1 — passes
        //   text-muted     (#716D68) on bg-primary (#FAFAF8):  4.91:1 — passes
        //   text-muted     (#716D68) on bg-card    (#FFFFFF):  5.14:1 — passes
        //   text-muted     (#716D68) on bg-shelf   (#F5F3EF):  4.63:1 — passes
        //   white          (#FFFFFF) on red        (#C0392B):  5.44:1 — passes
        // text-muted was originally #9B958F — measured at 2.96:1 on white, well
        // under AA. Darkened to #716D68, which passes on every background token
        // it's actually rendered against while staying visibly lighter (higher
        // luminance) than text-secondary, preserving the primary/secondary/muted
        // visual hierarchy the three tokens are meant to express.
        library: {
          'bg-primary': '#FAFAF8',
          'bg-card': '#FFFFFF',
          'bg-hero-dark': '#1C1A17',
          'bg-shelf': '#F5F3EF',
          'text-primary': '#1A1814',
          'text-secondary': '#6B6560',
          'text-muted': '#716D68',
          'text-hero': '#FFFFFF',
          red: '#C0392B',
          'red-hover': '#A93226',
          border: '#E8E4DF',
          'filter-active': '#F8F4F0',
          star: '#D4A017',
          'shelf-overlay-from': 'rgba(0,0,0,0)',
          'shelf-overlay-to': 'rgba(0,0,0,0.7)',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // UI Refinement Brief's radius scale. Flat, dash-joined keys
        // (library-xs, not a nested `library: { xs }` object) — verified
        // directly against the Tailwind CLI that borderRadius/boxShadow do
        // NOT flatten nested objects into dashed utility names the way
        // `colors` does (colors gets that behavior from a dedicated
        // flattenColorPalette step other core plugins don't share; a nested
        // object here silently produces no rounded-library-* class at all).
        // Kept as library-prefixed regardless, to avoid colliding with the
        // shadcn/ui radius tokens directly above (sm/md/lg, tied to the
        // --radius CSS var), which 24 files in components/ui/ depend on
        // app-wide.
        'library-xs': '4px',
        'library-sm': '8px',
        'library-md': '12px',
        'library-lg': '16px',
        'library-xl': '24px',
        'library-2xl': '32px',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'float': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        // UI Refinement Brief's shadow scale — same flat-key reasoning as
        // borderRadius above. 'card' already exists above (used by
        // AuthPage.jsx) with a different value than this brief specifies.
        // "Apple Books / Linear / Notion" — large blur, low opacity, no
        // material-design elevation.
        'library-card-sm': '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'library-card': '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'library-card-lg': '0 8px 32px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)',
        'library-card-hover': '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
