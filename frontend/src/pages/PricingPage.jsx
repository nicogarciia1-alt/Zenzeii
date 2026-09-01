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
  <div className="flex gap-3 py-3 border-b" style={{ borderColor: 'rgba(61,43,31,0.12)' }}>
    <div className="w-5 flex-shrink-0 pt-0.5">{icon}</div>
    <div>
      <p className="text-sm font-semibold" style={{ color: INK }}>{title}</p>
      <p className="text-sm mt-1 leading-relaxed" style={{ color: '#6b5d4f' }}>{body}</p>
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
      <div className="flex min-h-[calc(100vh-4rem)]" style={{ background: CREAM }}>
        {/* Sidebar */}
        <div
          className="hidden lg:flex w-[170px] flex-shrink-0 flex-col items-center pt-6 pb-8"
          style={{ background: 'linear-gradient(180deg, #3d1414 0%, #1c0a0a 100%)' }}
        >
          <p
            className="text-center"
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
          <div className="mt-auto flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 flex items-center justify-center text-xs font-serif"
              style={{ background: SEAL_RED, color: GOLD }}
            >
              禅々
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 px-6 sm:px-10 lg:px-16 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 items-start">
            {/* Left: copy + features */}
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl leading-tight" style={{ color: INK }}>
                Zenzeii is a reading room
                <br />
                for Japanese literature.
              </h1>
              <p className="text-sm mt-4 max-w-lg leading-relaxed" style={{ color: '#6b5d4f' }}>
                The Toshokan Pass is your membership to read without limits
                and to make Japanese a part of your everyday life.
              </p>
              <div className="w-10 h-px mt-6 mb-2" style={{ background: SEAL_RED }} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 mt-4">
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
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.06]"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, ${GOLD} 1px, transparent 0)`,
                    backgroundSize: '18px 18px',
                  }}
                />
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
                <span className="font-serif text-4xl" style={{ color: INK }}>€3.99</span>
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
            <div className="relative flex-shrink-0">
              <div
                className="w-40 h-72 rounded-[24px] overflow-hidden border relative"
                style={{ background: CARD_DARK, borderColor: '#00000022' }}
              >
                <div
                  className="mx-auto mt-6 px-2"
                  style={{
                    writingMode: 'vertical-rl',
                    fontFamily: "'Noto Serif JP', serif",
                    color: '#e5dfd5',
                    fontSize: '12px',
                    height: '200px',
                    letterSpacing: '0.1em',
                    lineHeight: 1.9,
                  }}
                >
                  良い本は、静かに人生を変えていく。
                </div>
              </div>
              <div
                className="absolute -bottom-3 -right-4 w-16 h-16 rounded-full flex flex-col items-center justify-center text-center border-2"
                style={{ background: SEAL_RED, borderColor: CREAM, color: GOLD }}
              >
                <span className="text-[8px] leading-tight font-medium">PASS</span>
                <span className="text-[8px] leading-tight font-medium">MEMBERS</span>
                <span className="text-[8px] leading-tight font-medium">ONLY</span>
              </div>
            </div>

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
