import React from 'react';
import { Link } from 'react-router-dom';

const ClosingSection = () => {
  return (
    <section
      className="relative overflow-hidden py-28 lg:py-36"
      style={{
        background:
          'radial-gradient(ellipse 60% 50% at 70% 40%, rgba(196,140,60,0.18) 0%, rgba(0,0,0,0) 60%), linear-gradient(160deg, #0f0d0b 0%, #1c1815 45%, #120f0c 100%)',
      }}
    >
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <p className="font-serif text-white/70 text-sm tracking-wide mb-5">
          次の物語が、待っています。
        </p>
        <h2 className="font-playfair text-4xl sm:text-5xl text-white mb-10 leading-tight">
          Your next story is waiting.
        </h2>
        <Link
          to="/auth"
          className="inline-flex items-center rounded-full bg-library-red text-white px-7 py-3.5 text-sm font-medium hover:bg-library-red-hover transition-colors"
        >
          Enter the Library →
        </Link>
      </div>
    </section>
  );
};

export default ClosingSection;
