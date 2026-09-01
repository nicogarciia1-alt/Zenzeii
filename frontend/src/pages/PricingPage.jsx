import React from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import {
  Infinity as InfinityIcon,
  BookOpen,
  MessageCircle,
  Bookmark,
  Users,
  Landmark,
  Smartphone,
  Download,
  Lock,
  ChevronLeft,
  Bookmark as BookmarkIcon,
  Search,
  Heart,
} from 'lucide-react';
import { toast } from 'sonner';

const CREAM = '#F5EFE0';
const INK = '#3d2b1f';
const GOLD = '#D4AF37';
const SEAL_RED = '#9B2020';
const CARD_LABEL_RED = '#c23b2e';
const CARD_DARK = '#1c1a17';

const LEFT_FEATURES = [
  {
    icon: <InfinityIcon className="h-5 w-5" style={{ color: SEAL_RED }} />,
    title: 'Read without limits.',
    body: 'Every word explained as you read — tap any word for an instant AI explanation, no daily cap.',
  },
  {
    icon: <span className="text-sm font-medium" style={{ color: SEAL_RED }}>あA</span>,
    title: 'Read in any script.',
    body: 'Switch between Kanji, Hiragana, Katakana, Romaji, and English mid-sentence. Add furigana or an English gloss underneath, independently.',
  },
  {
    icon: <BookOpen className="h-5 w-5" style={{ color: SEAL_RED }} />,
    title: 'Your vocabulary lights up the page.',
    body: "Words you've saved glow amber in the text as you read, saved kanji in blue. The more you learn, the more the page reflects it back.",
  },
  {
    icon: <MessageCircle className="h-5 w-5" style={{ color: SEAL_RED }} />,
    title: 'Your literary companion.',
    body: "An AI that knows the book you're reading. Ask about the characters, the period, the author's intent. Always available.",
  },
];

const RIGHT_FEATURES = [
  {
    icon: <Bookmark className="h-5 w-5" style={{ color: SEAL_RED }} />,
    title: 'Save words as you go.',
    body: 'Every word and kanji you tap gets saved. Review with flashcards, build your vocabulary one book at a time.',
  },
  {
    icon: <Users className="h-5 w-5" style={{ color: SEAL_RED }} />,
    title: 'Bookshelves and community.',
    body: 'Curate your own shelves, share them, and explore what the readers you follow are discovering.',
  },
  {
    icon: <Landmark className="h-5 w-5" style={{ color: SEAL_RED }} />,
    title: 'A library worth supporting.',
    body: 'Your membership sustains the curation — new books added, rare works surfaced, the reading room growing.',
  },
];

const FeatureRow = ({ icon, title, body }) => (
  <div className="flex gap-3 py-4 border-b" style={{ borderColor: 'rgba(61,43,31,0.08)' }}>
    <div className="w-5 flex-shrink-0 pt-0.5">{icon}</div>
    <div>
      <p className="text-sm font-semibold" style={{ color: INK }}>{title}</p>
      <p className="text-sm mt-1 leading-relaxed" style={{ color: '#6b5d4f' }}>{body}</p>
    </div>
  </div>
);

// A single 5-petal blossom, drawn as small overlapping circles around a center.
const Blossom = ({ cx, cy, r = 5, color, opacity = 1 }) => {
  const petals = [0, 72, 144, 216, 288];
  return (
    <g opacity={opacity}>
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
const SakuraBranch = ({ color = GOLD, opacity = 0.08, className = '', style = {} }) => (
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

// Faint right-edge watermark for the cream page background: bamboo stalks + a sakura branch.
const BotanicalWatermark = () => (
  <div
    className="hidden lg:block absolute right-0 top-0 bottom-0 w-[420px] pointer-events-none overflow-hidden"
    aria-hidden="true"
  >
    <svg viewBox="0 0 420 900" width="100%" height="100%" preserveAspectRatio="xMaxYMid slice">
      <g stroke={INK} strokeWidth="2" opacity="0.05" fill="none">
        <line x1="360" y1="0" x2="360" y2="900" />
        <line x1="390" y1="0" x2="390" y2="900" />
        {[80, 200, 320, 440, 560, 680, 800].map((y) => (
          <g key={y}>
            <line x1="352" y1={y} x2="368" y2={y} />
            <line x1="382" y1={y + 40} x2="398" y2={y + 40} />
          </g>
        ))}
      </g>
      <g transform="translate(150 260) scale(1.3)">
        <SakuraBranch color={INK} opacity={0.05} />
      </g>
      <g transform="translate(60 560) scale(1.1) rotate(15)">
        <SakuraBranch color={INK} opacity={0.04} />
      </g>
    </svg>
  </div>
);

const PhoneMockup = () => (
  <div
    className="w-44 h-[300px] rounded-[24px] overflow-hidden border relative flex-shrink-0"
    style={{ background: CARD_DARK, borderColor: '#00000022' }}
  >
    {/* status bar */}
    <div className="flex items-center justify-between px-3 pt-2 text-[9px]" style={{ color: '#e5dfd5' }}>
      <span>9:41</span>
      <span>••• 📶 🔋</span>
    </div>
    {/* top bar */}
    <div className="flex items-center justify-between px-3 mt-1">
      <div className="flex items-center gap-1" style={{ color: '#e5dfd5' }}>
        <ChevronLeft className="h-3 w-3" />
        <span className="text-[10px]">Zenzeii</span>
      </div>
      <BookmarkIcon className="h-3 w-3" style={{ color: '#e5dfd5' }} />
    </div>

    {/* now reading card */}
    <div className="mx-3 mt-2 flex items-center gap-2 rounded-md px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="w-5 h-7 rounded-sm flex-shrink-0" style={{ background: SEAL_RED }} />
      <div>
        <p className="text-[9px] leading-tight" style={{ color: GOLD }}>こころ</p>
        <p className="text-[7px] leading-tight" style={{ color: '#9c8f7d' }}>Natsume Sōseki</p>
      </div>
    </div>

    {/* reading text with one highlighted word + dictionary popup */}
    <div className="relative mt-3 px-3">
      <p className="text-[10px] leading-relaxed" style={{ color: '#e5dfd5' }}>
        先生と私とは時々会って、一緒に散歩したり、語ったりした。
        <span className="rounded-sm px-0.5" style={{ background: '#D4AF37', color: '#1c1a17' }}>信じる</span>
        。
      </p>
      <div
        className="absolute left-1 top-[52px] w-[136px] rounded-md p-2 shadow-lg"
        style={{ background: '#FEFCF6', border: '1px solid #E5DBC5' }}
      >
        <p className="text-[9px] font-medium" style={{ color: INK }}>
          信じる <span className="font-normal" style={{ color: '#8c7d6b' }}>(しんじる)</span>
        </p>
        <p className="text-[8px] mt-0.5" style={{ color: '#6b5d4f' }}>to believe; to trust</p>
      </div>
    </div>

    {/* bottom icon row */}
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <Heart className="h-3 w-3" style={{ color: '#9c8f7d' }} />
      <BookmarkIcon className="h-3 w-3" style={{ color: '#9c8f7d' }} />
      <Search className="h-3 w-3" style={{ color: '#9c8f7d' }} />
    </div>
  </div>
);

export default function PricingPage() {
  const handleGetPass = () => {
    // TODO: wire to checkout/payments backend
    toast('Checkout coming soon.');
  };

  return (
    <Layout>
      <div className="flex min-h-[calc(100vh-4rem)] relative" style={{ background: CREAM }}>
        {/* Sidebar */}
        <div
          className="hidden lg:flex w-[170px] flex-shrink-0 flex-col items-center pt-6 pb-8 relative overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #3d1414 0%, #1c0a0a 100%)' }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <SakuraBranch color={GOLD} opacity={0.1} className="w-[220px] h-[340px]" />
          </div>
          <p
            className="relative text-center"
            style={{
              writingMode: 'vertical-rl',
              fontFamily: "'Noto Serif JP', serif",
              color: GOLD,
              fontSize: '15px',
              letterSpacing: '0.15em',
              lineHeight: 2,
            }}
          >
            良い本は、静かに人生を変えていく。
          </p>
          <div className="relative mt-auto flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 flex items-center justify-center text-xs font-serif"
              style={{ background: SEAL_RED, color: GOLD }}
            >
              禅々
            </div>
          </div>
        </div>

        <BotanicalWatermark />

        {/* Main content */}
        <div className="flex-1 px-6 sm:px-10 lg:px-16 py-12 relative">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 items-start">
            {/* Left: copy + features */}
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl leading-tight" style={{ color: INK }}>
                Zenzeii is a reading room
                <br />
                for Japanese literature.
              </h1>
              <p className="text-sm mt-4 max-w-lg leading-relaxed" style={{ color: '#8c7d6b' }}>
                The Toshokan Pass is your membership to read without limits
                and to make Japanese a part of your everyday life.
              </p>
              <div className="w-10 h-px mt-6 mb-2" style={{ background: SEAL_RED }} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 mt-4">
                <div>
                  {LEFT_FEATURES.map((f) => (
                    <FeatureRow key={f.title} {...f} />
                  ))}
                </div>
                <div>
                  {RIGHT_FEATURES.map((f) => (
                    <FeatureRow key={f.title} {...f} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right: membership card + purchase */}
            <div className="flex flex-col items-center">
              <div
                className="relative w-full max-w-[420px] aspect-[1.6/1] rounded-2xl overflow-hidden shadow-xl p-6 flex flex-col justify-between"
                style={{ background: `linear-gradient(135deg, ${CARD_DARK} 0%, #0f0e0c 100%)` }}
              >
                <div className="absolute -right-6 -bottom-10 opacity-90">
                  <SakuraBranch color={GOLD} opacity={0.14} className="w-[260px] h-[400px]" />
                </div>
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-lg font-serif" style={{ color: CARD_LABEL_RED }}>図書館</p>
                    <p className="text-xs tracking-[0.2em] mt-1" style={{ color: GOLD }}>TOSHOKAN PASS</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-serif leading-none" style={{ color: GOLD }}>善井</p>
                    <p className="text-[10px] tracking-[0.2em] mt-1" style={{ color: GOLD }}>ZENZEII</p>
                  </div>
                </div>
                <div className="relative flex items-end justify-between">
                  <div>
                    <p className="text-[10px] tracking-[0.15em]" style={{ color: '#9c8f7d' }}>MEMBER NO.</p>
                    <p className="text-sm mt-0.5" style={{ color: GOLD }}>ZP-24-0001847</p>
                    <p className="text-[10px] tracking-[0.15em] mt-3" style={{ color: '#9c8f7d' }}>SINCE</p>
                    <p className="text-sm mt-0.5" style={{ color: GOLD }}>AUG 2026</p>
                  </div>
                  <div
                    className="w-7 h-7 flex items-center justify-center text-[9px] font-serif flex-shrink-0"
                    style={{ background: SEAL_RED, color: GOLD }}
                  >
                    禅々
                  </div>
                </div>
              </div>
              <p className="text-xs mt-3" style={{ color: '#8c7d6b' }}>Your membership card. Yours to keep.</p>

              <div className="mt-6 text-center">
                <span className="font-serif font-medium text-4xl" style={{ color: INK }}>€3.99</span>
                <span className="text-sm" style={{ color: '#8c7d6b' }}> / month</span>
              </div>

              <Button
                onClick={handleGetPass}
                className="w-full max-w-[420px] mt-4 h-11 text-white rounded-md"
                style={{ background: '#5C1B1B' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#4A1414')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#5C1B1B')}
              >
                Get Toshokan Pass
              </Button>

              <p className="text-xs mt-3 text-center" style={{ color: '#8c7d6b' }}>
                Cancel anytime. No long-term commitment.
              </p>
              <p className="text-xs text-center" style={{ color: '#8c7d6b' }}>
                Secured by Stripe.
              </p>
            </div>
          </div>

          {/* iOS app promo band */}
          <div
            className="mt-16 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8"
            style={{ background: '#EDE4D3' }}
          >
            <PhoneMockup />

            <div className="flex-1">
              <p className="text-xs tracking-[0.15em] font-medium" style={{ color: SEAL_RED }}>
                EXCLUSIVE FOR TOSHOKAN PASS MEMBERS
              </p>
              <h2 className="font-serif text-2xl mt-1" style={{ color: INK }}>
                The Zenzeii reader on your phone.
              </h2>
              <p className="text-sm mt-2 max-w-md leading-relaxed" style={{ color: '#6b5d4f' }}>
                Before the App Store launch, members receive a personal download link for the full iOS reader.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: SEAL_RED }}
                >
                  <Download className="h-2.5 w-2.5 text-white" />
                </span>
                <span className="text-xs" style={{ color: '#6b5d4f' }}>
                  🍎 iOS only <span style={{ color: '#b0a48f' }}>|</span> Early access for members
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
                <div className="flex flex-col gap-1">
                  <Smartphone className="h-4 w-4" style={{ color: '#8c7d6b' }} />
                  <span className="text-xs" style={{ color: '#6b5d4f' }}>The full reading experience on iOS.</span>
                </div>
                <div className="flex flex-col gap-1">
                  <Download className="h-4 w-4" style={{ color: '#8c7d6b' }} />
                  <span className="text-xs" style={{ color: '#6b5d4f' }}>A personal download link, sent to you.</span>
                </div>
                <div className="flex flex-col gap-1">
                  <Lock className="h-4 w-4" style={{ color: '#8c7d6b' }} />
                  <span className="text-xs" style={{ color: '#6b5d4f' }}>Available only to Pass members.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust bar */}
          <div
            className="mt-10 pt-6 flex items-center justify-center gap-3 text-xs border-t"
            style={{ borderColor: 'rgba(61,43,31,0.12)', color: '#8c7d6b' }}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Secure payments. Your data is always protected.</span>
            <span>|</span>
            <span>Powered by Stripe.</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
