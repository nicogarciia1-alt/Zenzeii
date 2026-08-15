import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';

const stories = [
  { label: 'Tokyo Stories', count: 15, gradient: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 45%, #0f3460 100%)' },
  { label: 'Kyoto & Tradition', count: 41, gradient: 'linear-gradient(160deg, #2b1b12 0%, #5c3a21 55%, #8a5a2e 100%)' },
  { label: 'Countryside Life', count: 32, gradient: 'linear-gradient(160deg, #10241c 0%, #1f3d2c 55%, #3c5c3f 100%)' },
  { label: 'Edo Period', count: 24, gradient: 'linear-gradient(160deg, #241a12 0%, #4a2f1c 55%, #6b4423 100%)' },
  { label: 'Tea Ceremony', count: 10, gradient: 'linear-gradient(160deg, #1c211a 0%, #33392c 55%, #565c46 100%)' },
  { label: 'Samurai & History', count: 24, gradient: 'linear-gradient(160deg, #1a1010 0%, #3d1414 55%, #5c1f1f 100%)' },
];

const ExploreStories = () => {
  return (
    <section className="bg-library-bg-primary pb-16 lg:pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Carousel opts={{ align: 'start', dragFree: true }}>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-playfair text-3xl text-library-text-primary mb-2">Explore Japan through stories</h2>
              <p className="font-crimson text-library-text-secondary">Travel through time, places, and culture.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <CarouselPrevious className="static translate-y-0 h-9 w-9 border-library-border" />
              <CarouselNext className="static translate-y-0 h-9 w-9 border-library-border" />
            </div>
          </div>

          <CarouselContent className="-ml-4">
            {stories.map((story) => (
              <CarouselItem key={story.label} className="pl-4 basis-[188px] shrink-0 grow-0">
                <div
                  className="relative rounded-2xl h-56 w-full overflow-hidden flex items-end p-4"
                  style={{ background: story.gradient }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 60%)' }}
                  />
                  <div className="relative">
                    <p className="text-white font-medium text-sm">{story.label}</p>
                    <p className="text-white/65 text-xs mt-0.5">{story.count} books</p>
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

export default ExploreStories;
