import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';

const moods = [
  { emoji: '🌧️', label: 'Rainy Day', count: 32, bg: '#4A3F35' },
  { emoji: '🌙', label: 'Quiet Evening', count: 31, bg: '#1C1A17' },
  { emoji: '🔥', label: 'Cozy & Warm', count: 41, bg: '#3D2B1F' },
  { emoji: '🕊️', label: 'Reflective', count: 37, bg: '#1F3330' },
  { emoji: '👁️', label: 'Mysterious', count: 29, bg: '#14231C' },
  { emoji: '😄', label: 'Funny', count: 21, bg: '#4A3220' },
];

const DiscoverByFeeling = () => {
  return (
    <section className="bg-library-bg-primary py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Carousel opts={{ align: 'start', dragFree: true }}>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-playfair text-3xl text-library-text-primary mb-2">Discover by feeling</h2>
              <p className="font-crimson text-library-text-secondary">Find a book for your mood, any time.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <CarouselPrevious className="static translate-y-0 h-9 w-9 border-library-border" />
              <CarouselNext className="static translate-y-0 h-9 w-9 border-library-border" />
            </div>
          </div>

          <CarouselContent className="-ml-4">
            {moods.map((mood) => (
              <CarouselItem key={mood.label} className="pl-4 basis-[168px] shrink-0 grow-0">
                <div
                  className="rounded-2xl h-40 w-full p-5 flex flex-col justify-between"
                  style={{ backgroundColor: mood.bg }}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <div>
                    <p className="text-white font-medium text-sm">{mood.label}</p>
                    <p className="text-white/55 text-xs mt-0.5">{mood.count} books</p>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
};

export default DiscoverByFeeling;
