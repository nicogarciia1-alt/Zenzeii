import React from 'react';
import { MessageCircle, Download, Library, BookOpen, Upload, RefreshCw, Search } from 'lucide-react';

const features = [
  { icon: MessageCircle, title: 'AI Chat', desc: 'Ask Zenzeii about the story at any page' },
  { icon: Download, title: 'Export to PDF', desc: 'Send your edited books to Kindle, read anywhere' },
  { icon: Library, title: 'Personal Library', desc: 'All your books and progress in one place' },
  { icon: BookOpen, title: 'Vocabulary Review', desc: 'AI cards with context that follow your reading' },
  { icon: Upload, title: 'Import Any EPUB', desc: 'Bring your own books and read them in Zenzeii' },
  { icon: RefreshCw, title: 'Cross-Device Sync', desc: 'Your library, reading, and progress, on any device' },
];

const covers = [
  { title: 'こころ', gradient: 'linear-gradient(160deg, #6b2b3a, #3d1420)' },
  { title: '雪国', gradient: 'linear-gradient(160deg, #7a6a3f, #4a3f22)' },
  { title: '人間失格', gradient: 'linear-gradient(160deg, #2f4a3d, #17261f)' },
  { title: '羅生門', gradient: 'linear-gradient(160deg, #3a3a5c, #1c1c33)' },
  { title: '坊っちゃん', gradient: 'linear-gradient(160deg, #7a4a25, #452a15)' },
  { title: '銀河鉄道の夜', gradient: 'linear-gradient(160deg, #2c4a5c, #16262f)' },
];

const LibraryMockup = () => (
  <div className="relative w-full h-[440px] sm:h-[480px] flex items-center justify-center">
    <div className="relative w-[300px] sm:w-[340px] rounded-2xl bg-white shadow-library-card-lg border border-library-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <span className="font-serif text-library-text-primary">読</span>
          <span className="text-sm font-medium text-library-text-primary">Zenzeii</span>
        </div>
        <Search className="w-3.5 h-3.5 text-library-text-muted" />
      </div>
      <div className="flex items-center gap-4 mb-4 text-xs">
        <span className="text-library-text-primary font-medium border-b-2 border-library-red pb-1">16 Books</span>
        <span className="text-library-text-muted pb-1">Vocabulary</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {covers.map((c) => (
          <div
            key={c.title}
            className="aspect-[3/4] rounded-lg flex items-end p-1.5"
            style={{ background: c.gradient }}
          >
            <span className="text-white text-[9px] font-serif leading-tight">{c.title}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="absolute -right-2 sm:right-2 bottom-0 w-32 sm:w-36 rounded-2xl bg-white shadow-library-card-lg border border-library-border p-3 rotate-3">
      <p className="text-[10px] font-medium text-library-text-primary mb-2">Library</p>
      <div className="space-y-2">
        {['Kokoro', 'The Longer Report', 'Candleless', 'The Setting Sun'].map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <div className="w-4 h-5 rounded-sm bg-library-bg-shelf shrink-0" />
            <span className="text-[8px] text-library-text-secondary truncate">{t}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const FeaturesSection = () => {
  return (
    <section className="bg-library-bg-primary py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <p className="text-library-red text-xs font-medium tracking-[0.15em] uppercase mb-3">Built for readers</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-playfair text-3xl sm:text-4xl text-library-text-primary mb-4 leading-tight">
              Everything you need.
              <br />
              Nothing you don't.
            </h2>
            <p className="font-crimson text-library-text-secondary text-lg mb-10 max-w-md leading-relaxed">
              Zenzeii is designed to let you enjoy Japanese literature with the right support, at the right time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-library-bg-shelf shrink-0">
                    <Icon className="h-4 w-4 text-library-text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-library-text-primary">{title}</p>
                    <p className="text-sm text-library-text-secondary mt-0.5 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <LibraryMockup />
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
