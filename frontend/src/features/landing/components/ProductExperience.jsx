import React from 'react';
import { PRODUCT_STORIES } from '../data/landingContent';
import ProductStory from './ProductStory';
import ReadPreview from './previews/ReadPreview';
import SavePreview from './previews/SavePreview';
import ListenPreview from './previews/ListenPreview';
import ExplainPreview from './previews/ExplainPreview';
import CommunityPreview from './previews/CommunityPreview';
import DiscoverPreview from './previews/DiscoverPreview';

const PREVIEWS = {
  read: ReadPreview,
  save: SavePreview,
  listen: ListenPreview,
  understand: ExplainPreview,
  community: CommunityPreview,
  discover: DiscoverPreview,
};

/**
 * "Explore Zenzeii" — the six-story product exhibition.
 * ≥1400px: six columns · 1024–1399: 3×2 · 768–1023: 2 columns · <768: 1.
 */
export default function ProductExperience() {
  return (
    <section id="explore" className="lp-explore" aria-labelledby="lp-explore-title">
      <div className="lp-container">
        <header className="lp-explore__head">
          <div>
            <p className="lp-eyebrow">EXPLORE ZENZEII</p>
            <h2 id="lp-explore-title" className="lp-explore__title" lang="ja">
              日本の文学を、くらしの中に。
            </h2>
            <p className="lp-explore__sub" lang="ja">
              読む・聴く・調べる・つながる。すべてが、ここに。
            </p>
          </div>
          <p className="lp-explore__note" lang="ja">
            名作から、まだ知らない一冊まで。<br />
            Zenzeii で、もっと深く出会えます。
          </p>
        </header>

        <ol className="lp-stories">
          {PRODUCT_STORIES.map(({ key, ...story }) => {
            const Preview = PREVIEWS[key];
            return (
              <ProductStory key={key} {...story}>
                <Preview />
              </ProductStory>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
