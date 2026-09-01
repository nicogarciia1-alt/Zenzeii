import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Infinity as InfinityIcon,
  BookOpen,
  MessageCircle,
  Bookmark,
  Users,
  Landmark,
  Library as LibraryIcon,
  Smartphone,
  Download,
  Lock,
  ChevronDown,
  Settings,
  ChevronLeft,
  Bookmark as BookmarkIcon,
  Search,
  Heart,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const SIDEBAR_BG = '#1C0B0B';
const MAIN_BG = '#EAE4D6';
const HEADING = '#1A1614';
const SUBTITLE = '#6B6560';
const ACCENT_RED = '#8B2E2E';
const CARD_BG = '#100F0D';
const CARD_GOLD = '#C8A830';
const CARD_RED = '#C4541A';
const BUTTON_BG = '#6B1F1F';
const SMALL_PRINT = '#9A9490';
const WATERMARK = '#D8D2C4';
const NAV_BORDER = '#D4CEC4';
const ROW_BORDER = '#D4CEC4';
const IOS_BG = '#E0DAD0';

const LEFT_FEATURES = [
  {
    icon: <InfinityIcon className="h-4 w-4" style={{ color: ACCENT_RED }} />,
    title: 'Read without limits.',
    body: 'Every word explained as you read — tap any word for an instant AI explanation, no daily cap.',
  },
  {
    icon: <span className="text-[13px] font-medium leading-none" style={{ color: ACCENT_RED }}>あA</span>,
    title: 'Read in any script.',
    body: 'Switch between Kanji, Hiragana, Katakana, Romaji, and English mid-sentence. Add furigana or an English gloss underneath, independently.',
  },
  {
    icon: <BookOpen className="h-4 w-4" style={{ color: ACCENT_RED }} />,
    title: 'Your vocabulary lights up the page.',
    body: "Words you've saved glow amber in the text as you read; saved kanji in blue. The more you learn, the more the page reflects it back.",
  },
  {
    icon: <MessageCircle className="h-4 w-4" style={{ color: ACCENT_RED }} />,
    title: 'Your literary companion.',
    body: "An AI that knows the book you're reading. Ask about the characters, the period, the author's intent. Always available.",
  },
];

const RIGHT_FEATURES = [
  {
    icon: <Bookmark className="h-4 w-4" style={{ color: ACCENT_RED }} />,
    title: 'Save words as you go.',
    body: 'Every word and kanji you tap gets saved. Review with flashcards, build your vocabulary one book at a time.',
  },
  {
    icon: <Users className="h-4 w-4" style={{ color: ACCENT_RED }} />,
    title: 'Bookshelves and community.',
    body: 'Curate your own shelves, share them, and explore what the readers you follow are discovering.',
  },
  {
    icon: <Landmark className="h-4 w-4" style={{ color: ACCENT_RED }} />,
    title: 'A library worth supporting.',
    body: 'Your membership sustains the curation — new books added, rare works surfaced, the reading room growing.',
  },
];

const FeatureRow = ({ icon, title, body, last }) => (
  <div
    className="flex gap-2.5 py-2.5"
    style={{ borderBottom: last ? 'none' : `1px solid ${ROW_BORDER}` }}
  >
    <div className="w-4 flex-shrink-0 pt-0.5 flex items-center justify-center">{icon}</div>
    <div>
      <p className="text-sm font-semibold leading-tight" style={{ color: HEADING }}>{title}</p>
      <p className="text-xs mt-0.5 leading-snug" style={{ color: SUBTITLE }}>{body}</p>
    </div>
  </div>
);

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
const SakuraBranch = ({ color, opacity = 0.1, className = '', style = {} }) => (
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

// Bamboo + sakura watermark for the right ~45% of the main content area.
const BotanicalWatermark = () => (
  <div
    className="absolute right-0 top-0 bottom-0 w-[45%] pointer-events-none overflow-hidden"
    aria-hidden="true"
  >
    <svg viewBox="0 0 620 848" width="100%" height="100%" preserveAspectRatio="xMaxYMid slice">
      <g stroke={WATERMARK} strokeWidth="2.5" fill="none">
        <line x1="560" y1="0" x2="560" y2="848" />
        <line x1="590" y1="0" x2="590" y2="848" />
        {[60, 160, 260, 360, 460, 560, 660, 760].map((y) => (
          <g key={y}>
            <line x1="550" y1={y} x2="570" y2={y} />
            <line x1="580" y1={y + 40} x2="600" y2={y + 40} />
          </g>
        ))}
      </g>
      <g transform="translate(330 260) scale(1.3)">
        <SakuraBranch color={WATERMARK} opacity={0.9} />
      </g>
      <g transform="translate(220 520) scale(1.05) rotate(12)">
        <SakuraBranch color={WATERMARK} opacity={0.7} />
      </g>
    </svg>
  </div>
);

const PhoneMockup = () => (
  <div
    className="w-[104px] h-[168px] rounded-[16px] overflow-hidden border relative flex-shrink-0"
    style={{ background: CARD_BG, borderColor: '#00000022' }}
  >
    <div className="flex items-center justify-between px-2 pt-1.5 text-[6px]" style={{ color: '#e5dfd5' }}>
      <span>9:41</span>
      <span>📶 🔋</span>
    </div>
    <div className="flex items-center justify-between px-2 mt-0.5">
      <div className="flex items-center gap-0.5" style={{ color: '#e5dfd5' }}>
        <ChevronLeft className="h-2 w-2" />
        <span className="text-[7px]">Zenzeii</span>
      </div>
      <BookmarkIcon className="h-2 w-2" style={{ color: '#e5dfd5' }} />
    </div>
    <div className="mx-2 mt-1 flex items-center gap-1 rounded-sm px-1 py-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="w-3 h-4 rounded-sm flex-shrink-0" style={{ background: ACCENT_RED }} />
      <div>
        <p className="text-[6px] leading-tight" style={{ color: CARD_GOLD }}>こころ</p>
        <p className="text-[5px] leading-tight" style={{ color: '#9c8f7d' }}>Natsume Sōseki</p>
      </div>
    </div>
    <div className="relative mt-1.5 px-2">
      <p className="text-[7px] leading-relaxed" style={{ color: '#e5dfd5' }}>
        先生と私とは時々会って、
        <span className="rounded-sm px-0.5" style={{ background: CARD_GOLD, color: '#1c1a17' }}>信じる</span>
        。
      </p>
      <div
        className="absolute left-0.5 top-[26px] w-[86px] rounded-sm p-1 shadow-lg"
        style={{ background: '#FEFCF6', border: '1px solid #E5DBC5' }}
      >
        <p className="text-[6px] font-medium" style={{ color: HEADING }}>
          信じる <span className="font-normal" style={{ color: '#8c7d6b' }}>to believe</span>
        </p>
      </div>
    </div>
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-2 py-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <Heart className="h-2 w-2" style={{ color: '#9c8f7d' }} />
      <Search className="h-2 w-2" style={{ color: '#9c8f7d' }} />
    </div>
    {/* PASS MEMBERS ONLY stamp */}
    <div
      className="absolute flex items-center justify-center rounded-full"
      style={{
        width: 46,
        height: 46,
        top: 60,
        left: 30,
        border: `1.5px solid ${ACCENT_RED}`,
        transform: 'rotate(-18deg)',
        background: 'rgba(28,11,11,0.15)',
      }}
    >
      <span
        className="text-center leading-[7px]"
        style={{ color: ACCENT_RED, fontSize: '5.5px', fontWeight: 700, letterSpacing: '0.05em' }}
      >
        PASS
        <br />
        MEMBERS
        <br />
        ONLY
      </span>
    </div>
  </div>
);

const NAV_ITEMS = [
  { label: 'My Books', path: '/', icon: BookOpen },
  { label: 'Bookshelves', path: '/library', icon: LibraryIcon },
  { label: 'Zenzeii', path: '/zenzeii', icon: MessageCircle },
  { label: 'Library', path: '/library', icon: Landmark, active: true },
];

export default function PricingPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleGetPass = () => {
    // TODO: wire to checkout/payments backend
    toast('Checkout coming soon.');
  };

  return (
    <div className="w-full flex justify-center" style={{ background: '#0d0d0d' }}>
      <div
        className="relative flex-shrink-0"
        style={{ width: 1440, height: 900, overflow: 'hidden', background: MAIN_BG }}
      >
        {/* Nav bar */}
        <div
          className="flex items-center justify-between"
          style={{ height: 52, background: MAIN_BG, borderBottom: `1px solid ${NAV_BORDER}`, padding: '0 24px' }}
        >
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-serif" style={{ color: ACCENT_RED }}>祝</span>
            <span className="text-base font-medium font-serif" style={{ color: HEADING }}>Zenzeii</span>
          </Link>

          <div className="flex items-center gap-7">
            {NAV_ITEMS.map(({ label, path, icon: Icon, active }) => (
              <Link
                key={label}
                to={path}
                className="flex items-center gap-1.5 text-[13px]"
                style={{ color: active ? ACCENT_RED : '#4A4540', fontWeight: active ? 600 : 400 }}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-[13px]" style={{ color: '#4A4540' }}>
                  {user?.username || 'account'}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px] font-sans">
                <DropdownMenuItem onSelect={() => navigate('/profile')}>Edit Profile</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => logout()}>Log Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={() => navigate('/profile')} aria-label="Settings">
              <Settings className="h-4 w-4" style={{ color: '#4A4540' }} />
            </button>
          </div>
        </div>

        {/* Sidebar + content row */}
        <div className="flex" style={{ height: 848 }}>
          {/* Sidebar */}
          <div
            className="relative flex-shrink-0 flex flex-col items-center overflow-hidden"
            style={{ width: 148, background: SIDEBAR_BG }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <SakuraBranch color="#3a1f1f" opacity={0.5} className="w-[190px] h-[300px]" />
            </div>
            <p
              className="relative"
              style={{
                writingMode: 'vertical-rl',
                fontFamily: "'Noto Serif JP', serif",
                color: '#7A6A5A',
                fontSize: '13px',
                letterSpacing: '0.2em',
                lineHeight: 2,
                marginTop: 48,
              }}
            >
              良い本は、静かに人生を変えていく。
            </p>
            <div
              className="relative flex items-center justify-center flex-shrink-0"
              style={{ width: 24, height: 24, background: ACCENT_RED, position: 'absolute', bottom: 24 }}
            >
              <span className="text-[8px] font-serif" style={{ color: CARD_GOLD }}>禅々</span>
            </div>
          </div>

          {/* Main content */}
          <div className="relative flex-1 flex flex-col overflow-hidden" style={{ background: MAIN_BG }}>
            <BotanicalWatermark />

            <div className="relative flex" style={{ padding: '48px 48px 0 72px', gap: 48 }}>
              {/* Left column: heading + features */}
              <div style={{ width: '54%' }}>
                <h1 className="font-serif" style={{ fontSize: 38, lineHeight: 1.15, color: HEADING, fontWeight: 500 }}>
                  Zenzeii is a reading room
                  <br />
                  for Japanese literature.
                </h1>
                <p className="text-sm mt-3 leading-snug" style={{ color: SUBTITLE, fontWeight: 300, maxWidth: 480 }}>
                  The Toshokan Pass is your membership to read without limits
                  and to make Japanese a part of your everyday life.
                </p>
                <div style={{ width: 44, height: 2, background: ACCENT_RED, marginTop: 18, marginBottom: 6 }} />

                <div className="grid grid-cols-2 gap-x-8 mt-3">
                  <div>
                    {LEFT_FEATURES.map((f, i) => (
                      <FeatureRow key={f.title} {...f} last={i === LEFT_FEATURES.length - 1} />
                    ))}
                  </div>
                  <div>
                    {RIGHT_FEATURES.map((f, i) => (
                      <FeatureRow key={f.title} {...f} last={i === RIGHT_FEATURES.length - 1} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column: card + CTA */}
              <div className="relative flex flex-col items-center" style={{ width: '42%' }}>
                <div
                  className="relative overflow-hidden flex-shrink-0"
                  style={{
                    width: 380,
                    height: 240,
                    borderRadius: 14,
                    background: CARD_BG,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                  }}
                >
                  <div className="absolute -right-8 -bottom-10">
                    <SakuraBranch color={CARD_GOLD} opacity={0.11} className="w-[240px] h-[360px]" />
                  </div>
                  <div className="relative flex items-start justify-between" style={{ padding: '20px 22px 0 22px' }}>
                    <div>
                      <p className="font-serif" style={{ fontSize: 22, color: CARD_RED, lineHeight: 1 }}>図書館</p>
                      <p style={{ fontSize: 8, color: CARD_GOLD, letterSpacing: '0.2em', marginTop: 8 }}>TOSHOKAN PASS</p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif" style={{ fontSize: 28, color: CARD_GOLD, lineHeight: 1.1 }}>善井</p>
                      <p style={{ fontSize: 7, color: CARD_GOLD, letterSpacing: '0.2em', marginTop: 4 }}>ZENZEII</p>
                    </div>
                  </div>
                  <div className="relative flex items-end justify-between" style={{ padding: '0 22px 20px 22px', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                    <div>
                      <p style={{ fontSize: 9, color: SMALL_PRINT, letterSpacing: '0.15em' }}>MEMBER NO.</p>
                      <p style={{ fontSize: 14, color: CARD_GOLD, marginTop: 2 }}>ZP-24-0001847</p>
                      <p style={{ fontSize: 9, color: SMALL_PRINT, letterSpacing: '0.15em', marginTop: 10 }}>SINCE</p>
                      <p style={{ fontSize: 14, color: CARD_GOLD, marginTop: 2 }}>AUG 2026</p>
                    </div>
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{ width: 28, height: 28, background: ACCENT_RED }}
                    >
                      <span className="font-serif" style={{ fontSize: 8, color: CARD_GOLD }}>禅々</span>
                    </div>
                  </div>
                </div>
                <p className="italic text-center" style={{ fontSize: 12, color: SMALL_PRINT, marginTop: 12 }}>
                  Your membership card. Yours to keep.
                </p>

                <div className="flex items-baseline mt-4" style={{ width: 380 }}>
                  <span className="font-serif" style={{ fontSize: 38, color: HEADING }}>€3.99</span>
                  <span style={{ fontSize: 15, color: SUBTITLE, fontWeight: 300, marginLeft: 6 }}>/ month</span>
                </div>

                <button
                  onClick={handleGetPass}
                  className="mt-3 transition-colors"
                  style={{
                    width: 380,
                    height: 50,
                    background: BUTTON_BG,
                    color: '#FFFFFF',
                    borderRadius: 6,
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#551818')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = BUTTON_BG)}
                >
                  Get your Pass
                </button>

                <p className="text-center" style={{ fontSize: 11, color: SMALL_PRINT, marginTop: 10, width: 380 }}>
                  Cancel anytime. No long-term commitment. Secured by Stripe.
                </p>
              </div>
            </div>

            {/* iOS callout — pinned toward bottom of remaining space */}
            <div
              className="relative flex items-center"
              style={{ marginTop: 'auto', background: IOS_BG, padding: '20px 48px 20px 72px', gap: 28 }}
            >
              <PhoneMockup />

              <div style={{ width: '38%' }}>
                <p style={{ fontSize: 10, color: ACCENT_RED, letterSpacing: '0.12em', fontWeight: 600 }}>
                  EXCLUSIVE FOR TOSHOKAN PASS MEMBERS
                </p>
                <h2 className="font-serif" style={{ fontSize: 19, color: HEADING, marginTop: 4 }}>
                  The Zenzeii reader on your phone.
                </h2>
                <p style={{ fontSize: 12, color: SUBTITLE, marginTop: 4, lineHeight: 1.4 }}>
                  Before the App Store launch, members receive a personal download link for the full iOS reader.
                </p>
                <p style={{ fontSize: 11, color: SUBTITLE, marginTop: 6 }}>
                  🍎 iOS only <span style={{ color: '#b0a48f' }}>·</span> Early access for members
                </p>
              </div>

              <div className="flex flex-1 justify-end" style={{ gap: 36 }}>
                <div className="flex flex-col items-start" style={{ gap: 6, maxWidth: 130 }}>
                  <Smartphone className="h-4 w-4" style={{ color: SUBTITLE }} />
                  <span style={{ fontSize: 11, color: SUBTITLE, lineHeight: 1.3 }}>The full reading experience on iOS.</span>
                </div>
                <div className="flex flex-col items-start" style={{ gap: 6, maxWidth: 130 }}>
                  <Download className="h-4 w-4" style={{ color: SUBTITLE }} />
                  <span style={{ fontSize: 11, color: SUBTITLE, lineHeight: 1.3 }}>A personal download link, sent to you.</span>
                </div>
                <div className="flex flex-col items-start" style={{ gap: 6, maxWidth: 130 }}>
                  <Lock className="h-4 w-4" style={{ color: SUBTITLE }} />
                  <span style={{ fontSize: 11, color: SUBTITLE, lineHeight: 1.3 }}>Available only to Pass members.</span>
                </div>
              </div>
            </div>

            {/* Footer strip */}
            <div
              className="relative flex items-center justify-center flex-shrink-0"
              style={{ height: 32, gap: 6, borderTop: `1px solid ${NAV_BORDER}` }}
            >
              <Lock className="h-3 w-3" style={{ color: SMALL_PRINT }} />
              <span style={{ fontSize: 11, color: SMALL_PRINT }}>
                Secure payments. Your data is always protected. <span style={{ color: '#c4bdb0' }}>·</span> Powered by Stripe.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
