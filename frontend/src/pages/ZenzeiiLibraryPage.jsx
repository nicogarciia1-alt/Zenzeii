import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { importBook } from '@/lib/api';
import { toast } from 'sonner';
import GeneratedBookCover from '@/components/books/GeneratedBookCover';

const CURATED_BOOKS = [
  {
    genre: 'Modern Literature',
    books: [
      { title: '吾輩は猫である', author: '夏目漱石', author_en: 'Natsume Soseki', description: 'A satirical novel narrated by a cat observing the absurdities of Meiji-era Japan.', book_key: 'natsume_soseki/wagahai_wa_neko_de_aru', source: 'aozora' },
      { title: '坊っちゃん', author: '夏目漱石', author_en: 'Natsume Soseki', description: 'A spirited young teacher from Tokyo struggles with rural provincial life.', book_key: 'natsume_soseki/botchan', source: 'aozora' },
      { title: '人間失格', author: '太宰治', author_en: 'Osamu Dazai', description: 'A confessional tale of alienation and self-destruction in modern Japan.', book_key: 'dazai_osamu/ningen_shikkaku', source: 'aozora' },
      { title: '羅生門', author: '芥川龍之介', author_en: 'Ryunosuke Akutagawa', description: 'A servant makes a moral choice in the ruins of Heian-era Kyoto.', book_key: 'akutagawa_ryunosuke/rashomon', source: 'aozora' },
      { title: '鼻', author: '芥川龍之介', author_en: 'Ryunosuke Akutagawa', description: 'A monk obsessed with his unusually long nose seeks a cure.', book_key: 'akutagawa_ryunosuke/hana', source: 'aozora' },
    ]
  },
  {
    genre: 'Lyrical & Poetic',
    books: [
      { title: '雪国', author: '川端康成', author_en: 'Yasunari Kawabata', description: 'A melancholic love story set in the snow country of northern Japan.', book_key: 'kawabata_yasunari/yukiguni', source: 'aozora' },
      { title: '伊豆の踊子', author: '川端康成', author_en: 'Yasunari Kawabata', description: 'A student encounters a young traveling dancer on the Izu Peninsula.', book_key: 'kawabata_yasunari/izu_no_odoriko', source: 'aozora' },
    ]
  },
  {
    genre: 'Ghost Stories',
    books: [
      { title: '怪談', author: 'ラフカディオ・ハーン', author_en: 'Lafcadio Hearn', description: 'Classic Japanese ghost stories and supernatural folk tales.', book_key: 'koizumi_yakumo/kwaidan', source: 'aozora' },
      { title: '藪の中', author: '芥川龍之介', author_en: 'Ryunosuke Akutagawa', description: 'A murder told through contradictory accounts — the story that inspired Rashomon.', book_key: 'akutagawa_ryunosuke/yabu_no_naka', source: 'aozora' },
    ]
  },
  {
    genre: 'Historical',
    books: [
      { title: '高瀬舟', author: '森鴎外', author_en: 'Mori Ogai', description: 'A philosophical tale of a man transported on a boat to exile.', book_key: 'mori_ogai/takasebune', source: 'aozora' },
    ]
  },
  {
    genre: 'Poetry',
    books: [
      { title: '春と修羅', author: '宮沢賢治', author_en: 'Kenji Miyazawa', description: 'Visionary poetry exploring nature, science, and Buddhist themes.', book_key: 'miyazawa_kenji/haru_to_shura', source: 'aozora' },
    ]
  },
];

const BookPreviewModal = ({ book, onClose, onAdd, adding }) => (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 200,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}
    onClick={onClose}
  >
    <div
      style={{
        backgroundColor: 'hsl(var(--background))',
        borderRadius: '8px',
        padding: '32px',
        maxWidth: '420px',
        width: '100%',
        fontFamily: '"EB Garamond", Georgia, serif',
      }}
      onClick={e => e.stopPropagation()}
    >
      <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginBottom: '8px', letterSpacing: '0.08em' }}>
        {book.author_en}
      </p>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: '4px' }}>
        {book.title}
      </h2>
      <p style={{ fontSize: '1rem', color: 'hsl(var(--muted-foreground))', marginBottom: '16px' }}>
        {book.author}
      </p>
      <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'hsl(var(--foreground))', marginBottom: '24px' }}>
        {book.description}
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <Button
          onClick={() => onAdd(book)}
          disabled={adding}
          style={{ flex: 1, fontFamily: '"EB Garamond", Georgia, serif' }}
        >
          {adding ? 'Adding...' : 'Add to My Library'}
        </Button>
        <Button variant="outline" onClick={onClose}
          style={{ fontFamily: '"EB Garamond", Georgia, serif' }}>
          Close
        </Button>
      </div>
    </div>
  </div>
);

const ZenzeiiLibraryPage = () => {
  const [selectedBook, setSelectedBook] = useState(null);
  const [adding, setAdding] = useState(false);

  const handleAddBook = async (book) => {
    setAdding(true);
    try {
      await importBook({ book_key: book.book_key, source: book.source });
      toast.success(`${book.title} added to your library`);
      setSelectedBook(null);
    } catch (err) {
      toast.error('Could not add book. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div style={{ borderBottom: '1px solid hsl(var(--border))', paddingBottom: '24px', marginBottom: '40px' }}>
          <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '2.5rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
            Zenzeii Library
          </h1>
          <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '1.1rem', color: 'hsl(var(--muted-foreground))', marginTop: '8px' }}>
            A curated collection of Japanese literary classics
          </p>
        </div>

        {CURATED_BOOKS.map((section) => (
          <div key={section.genre} style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '1.3rem', fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: '20px', paddingBottom: '8px', borderBottom: '1px solid hsl(var(--border))' }}>
              {section.genre}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
              {section.books.map((book) => (
                <div
                  key={book.book_key}
                  onClick={() => setSelectedBook(book)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ marginBottom: '10px' }}>
                    <GeneratedBookCover
                      book={{ title: book.title, author: book.author_en }}
                    />
                  </div>
                  <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '0.85rem', color: 'hsl(var(--foreground))', fontWeight: 500 }}>
                    {book.title}
                  </p>
                  <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                    {book.author_en}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedBook && (
        <BookPreviewModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onAdd={handleAddBook}
          adding={adding}
        />
      )}
    </Layout>
  );
};

export default ZenzeiiLibraryPage;
