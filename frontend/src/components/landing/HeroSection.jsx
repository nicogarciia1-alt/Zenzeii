import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Type, MoreHorizontal, Maximize2, Settings, Moon, Play, Rewind, FastForward } from 'lucide-react';

const Furigana = ({ base, reading }) => (
  <ruby>
    {base}
    <rt style={{ fontSize: '0.5em', color: '#9B958F' }}>{reading}</rt>
  </ruby>
);

const ReaderMockup = () => (
  <div className="relative w-full h-[440px] sm:h-[500px] flex items-center justify-center">
    {/* Back panel — phone-style, peeking out bottom right */}
    <div className="absolute right-0 bottom-0 w-40 sm:w-48 h-72 sm:h-80 rounded-[28px] bg-library-bg-hero-dark shadow-library-card-lg border border-black/20 rotate-3 translate-x-4 translate-y-6 overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3">
        <span className="text-[10px] text-white/60">‹ こころ</span>
        <MoreHorizontal className="w-3 h-3 text-white/50" />
      </div>
      <div
        className="mx-auto mt-3 text-white/90"
        style={{ writingMode: 'vertical-rl', fontFamily: "'Noto Serif JP', serif", fontSize: '13px', height: '190px', letterSpacing: '0.05em' }}
      >
        私はその時海の方を眺めながら
        <Furigana base="先生" reading="せんせい" />
        の事を思っていた
      </div>
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
        <span className="text-[9px] text-white/50">1.5x</span>
        <Rewind className="w-3 h-3 text-white/70" />
        <Play className="w-4 h-4 text-white fill-white" />
        <FastForward className="w-3 h-3 text-white/70" />
      </div>
    </div>

    {/* Front panel */}
    <div className="relative w-56 sm:w-64 h-[420px] sm:h-[480px] rounded-[28px] bg-white shadow-library-card-lg border border-library-border overflow-hidden -translate-x-4">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-1 text-library-text-secondary text-xs">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>こころ</span>
        </div>
        <div className="flex items-center gap-2 text-library-text-secondary">
          <span className="text-xs font-medium">Aa</span>
          <MoreHorizontal className="w-3.5 h-3.5" />
        </div>
      </div>

      <div
        className="mx-auto mt-4 text-library-text-primary px-2"
        style={{ writingMode: 'vertical-rl', fontFamily: "'Noto Serif JP', serif", fontSize: '15px', height: '300px', letterSpacing: '0.08em', lineHeight: '1.9' }}
      >
        私はその人を常に
        <span className="relative inline-block bg-amber-100 rounded-sm px-0.5">
          <Furigana base="先生" reading="せんせい" />
        </span>
        と呼んでいた。だから
        <Furigana base="此処" reading="ここ" />
        でもただ
        <Furigana base="先生" reading="せんせい" />
        と書くだけで本名は打ち明けない。
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-library-border flex items-center justify-between text-library-text-muted">
        <span className="text-[10px]">12%</span>
        <span className="text-[10px] tracking-wide">CHAPTER 1</span>
        <div className="flex items-center gap-1.5">
          <Maximize2 className="w-3 h-3" />
          <Settings className="w-3 h-3" />
          <Moon className="w-3 h-3" />
        </div>
      </div>
    </div>

    {/* Dictionary popup */}
    <div className="absolute left-0 sm:-left-4 top-16 w-48 rounded-xl bg-white shadow-library-card-lg border border-library-border p-3.5">
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-lg text-library-text-primary">先生</span>
        <span className="text-xs text-library-text-muted">せんせい</span>
      </div>
      <p className="text-xs text-library-text-secondary mt-1 leading-snug">master; teacher; doctor</p>
      <div className="mt-2 pt-2 border-t border-library-border">
        <p className="text-[10px] uppercase tracking-wide text-library-text-muted mb-1">With context</p>
        <p className="text-[11px] text-library-text-secondary leading-snug">
          The narrator refers to the man he admires and never reveals his real name.
        </p>
      </div>
      <button className="mt-3 w-full rounded-full bg-library-text-primary text-white text-[11px] py-1.5 hover:bg-black transition-colors">
        + Add to vocabulary
      </button>
    </div>
  </div>
);

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-library-bg-primary">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #1A1814 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-14 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="flex items-center gap-2 text-library-red text-sm font-medium mb-6">
            <span aria-hidden>✿</span>
            <span className="font-serif tracking-wide">日本の物語を、あなたの言葉で</span>
          </div>
          <h1 className="font-playfair text-5xl sm:text-6xl leading-[1.08] text-library-text-primary mb-6">
            Read Japan
            <br />
            as it was written.
          </h1>
          <p className="font-crimson text-lg text-library-text-secondary max-w-md mb-9 leading-relaxed">
            Authentic literature. Beautiful reading. Intelligent support that disappears into the story.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/auth"
              className="inline-flex items-center rounded-full bg-library-red text-white px-6 py-3 text-sm font-medium hover:bg-library-red-hover transition-colors"
            >
              Enter the Library →
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center rounded-full border border-library-border text-library-text-primary px-6 py-3 text-sm font-medium hover:bg-library-bg-shelf transition-colors"
            >
              See how it works →
            </a>
          </div>
        </div>

        <ReaderMockup />
      </div>
    </section>
  );
};

export default HeroSection;
