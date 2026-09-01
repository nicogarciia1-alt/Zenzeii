import React from 'react';
import { ChevronLeft, Bookmark, Search } from 'lucide-react';

// Recreates a real Zenzeii reader screen (title, furigana, a saved/selected
// word, and its AI explanation popover) rather than generic phone artwork —
// there's no production screenshot asset to drop in yet.
export function ReaderPhonePreview() {
  return (
    <div className="ios-phone-wrap">
      <div className="ios-phone">
        <div className="ios-phone__status">
          <span>9:41</span>
          <span>📶 🔋</span>
        </div>
        <div className="ios-phone__topbar">
          <ChevronLeft className="h-2.5 w-2.5" style={{ position: 'absolute', left: 10 }} />
          Zenzeii
        </div>

        <div className="ios-phone__book">
          <div className="ios-phone__cover" />
          <div>
            <p className="ios-phone__book-title">こころ</p>
            <p className="ios-phone__book-author">Natsume Sōseki</p>
          </div>
        </div>

        <p className="ios-phone__text">
          先生と私とは時々会って、
          <span className="word word--selected"><ruby>信<rt>しん</rt></ruby>じる</span>
          。
          <span className="word"><ruby>一緒<rt>いっしょ</rt></ruby></span>
          に散歩した。
        </p>

        <div className="ios-phone__popover">
          <p className="ios-phone__popover-word">
            信じる <span>(しんじる)</span>
          </p>
          <p className="ios-phone__popover-def">to believe; to trust</p>
        </div>

        <div className="ios-phone__nav">
          <Bookmark className="h-2.5 w-2.5" />
          <Search className="h-2.5 w-2.5" />
        </div>
      </div>
    </div>
  );
}

export default ReaderPhonePreview;
