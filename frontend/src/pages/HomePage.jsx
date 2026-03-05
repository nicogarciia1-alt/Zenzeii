import React, { useState, useEffect } from 'react';
import { Clock, Library, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import BookCard from '@/components/books/BookCard';
import { getBooks, getProgress, seedDatabase } from '@/lib/api';
import { toast } from 'sonner';

export const HomePage = () => {
  const [books, setBooks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [booksRes, progressRes] = await Promise.all([
        getBooks(),
        getProgress()
      ]);
      setBooks(booksRes.data);
      setProgress(progressRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDatabase();
      toast.success('Library seeded with sample books!');
      fetchData();
    } catch (error) {
      toast.error('Failed to seed database');
    } finally {
      setSeeding(false);
    }
  };

  const getBookProgress = (bookId) => {
    return progress.find(p => p.book_id === bookId);
  };

  const booksInProgress = books.filter(book => getBookProgress(book.id));
  const otherBooks = books.filter(book => !getBookProgress(book.id));

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-serif text-foreground mb-4">
            日本語を読んで学ぶ
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Learn Japanese by reading classic literature with instant translations and vocabulary tools
          </p>
        </div>

        {/* Empty State */}
        {books.length === 0 && (
          <div className="text-center py-16 space-y-4" data-testid="empty-library">
            <Library className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-serif text-foreground">Your library is empty</h2>
            <p className="text-muted-foreground">
              Seed the database with sample Japanese books to get started
            </p>
            <Button
              onClick={handleSeed}
              disabled={seeding}
              className="mt-4"
              data-testid="seed-database-btn"
            >
              {seeding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Seed Library with Sample Books
            </Button>
          </div>
        )}

        {/* Continue Reading Section */}
        {booksInProgress.length > 0 && (
          <section className="mb-12" data-testid="continue-reading-section">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-serif text-foreground">Continue Reading</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {booksInProgress.map(book => (
                <BookCard
                  key={book.id}
                  book={book}
                  progress={getBookProgress(book.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* All Books Section */}
        {otherBooks.length > 0 && (
          <section data-testid="book-library-section">
            <div className="flex items-center gap-2 mb-6">
              <Library className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-serif text-foreground">
                {booksInProgress.length > 0 ? 'Explore More' : 'Book Library'}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {otherBooks.map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        )}

        {/* Quick Stats */}
        {books.length > 0 && (
          <div className="mt-12 p-6 bg-card rounded-xl border border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-3xl font-serif text-primary">{books.length}</p>
                <p className="text-sm text-muted-foreground">Books Available</p>
              </div>
              <div>
                <p className="text-3xl font-serif text-primary">{booksInProgress.length}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
              <div>
                <p className="text-3xl font-serif text-primary">
                  {books.reduce((sum, b) => sum + b.total_chapters, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Chapters</p>
              </div>
              <div>
                <p className="text-3xl font-serif text-primary">4</p>
                <p className="text-sm text-muted-foreground">Genres</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HomePage;
