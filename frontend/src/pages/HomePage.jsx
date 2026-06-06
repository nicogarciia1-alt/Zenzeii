import React, { useState, useEffect } from 'react';
import { Clock, Library, Plus, Search, Upload, Loader2, Check, Download, Zap, X, Star, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Layout from '@/components/layout/Layout';
import BookCard from '@/components/books/BookCard';
import { 
  getBooks, 
  getProgress, 
  getAvailableBooks, 
  importBook, 
  searchGutenberg,
  searchAozora,
  uploadBook,
  getBookStatus,
  cancelImport,
  prioritizeImport
} from '@/lib/api';
import { toast } from 'sonner';

export const HomePage = () => {
  const [books, setBooks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableBooks, setAvailableBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchSource, setSearchSource] = useState('gutenberg');
  const [importingBooks, setImportingBooks] = useState(new Set());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedSource, setSelectedSource] = useState('all');
  
  // Upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Poll for import/preparing status
  useEffect(() => {
    if (importingBooks.size === 0) return;
    
    const interval = setInterval(async () => {
      for (const bookId of importingBooks) {
        try {
          const res = await getBookStatus(bookId);
          // Only remove from tracking when fully completed or failed
          if (res.data.status === 'completed' || res.data.status === 'failed') {
            setImportingBooks(prev => {
              const next = new Set(prev);
              next.delete(bookId);
              return next;
            });
            if (res.data.status === 'completed') {
              toast.success('Book ready! Japanese translations prepared.');
            } else {
              toast.error('Import failed');
            }
            fetchData();
          } else {
            // Refresh to update UI for "preparing" status
            fetchData();
          }
        } catch (e) {
          console.error('Status check failed:', e);
        }
      }
    }, 3000);  // Check every 3 seconds
    
    return () => clearInterval(interval);
  }, [importingBooks]);

  const fetchData = async () => {
    try {
      const [booksRes, progressRes, availableRes] = await Promise.all([
        getBooks(),
        getProgress(),
        getAvailableBooks()
      ]);
      setBooks(booksRes.data);
      setProgress(progressRes.data);
      setAvailableBooks(availableRes.data);
      
      // Check for importing or preparing books
      const importing = new Set();
      for (const book of booksRes.data) {
        if (book.import_status === 'importing' || book.import_status === 'preparing') {
          importing.add(book.id);
        }
      }
      setImportingBooks(importing);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookDelete = (bookId) => {
    // Remove the book from local state immediately
    setBooks(prev => prev.filter(b => b.id !== bookId));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = searchSource === 'aozora'
        ? await searchAozora(searchQuery)
        : await searchGutenberg(searchQuery);
      setSearchResults(res.data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleImportPredefined = async (bookKey, source = 'gutenberg') => {
    setImportingBooks(prev => new Set(prev).add(bookKey));
    try {
      const res = await importBook({ book_key: bookKey, source });
      const bookId = res.data.book_id || bookKey;
      if (res.data.status === 'completed') {
        setImportingBooks(prev => { const n = new Set(prev); n.delete(bookKey); return n; });
        toast.success('Book added to your library!');
        fetchData();
      } else {
        setImportingBooks(prev => { const n = new Set(prev); n.delete(bookKey); n.add(bookId); return n; });
        toast.success('Importing... Translations will be prepared in background.');
      }
      const availableRes = await getAvailableBooks();
      setAvailableBooks(availableRes.data);
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error('Import limit reached (3 books/hour). Please try again later.');
      } else {
        toast.error('Failed to start import');
      }
      setImportingBooks(prev => { const n = new Set(prev); n.delete(bookKey); return n; });
    }
  };

  const handleCancelImport = async (bookId) => {
    try {
      await cancelImport(bookId);
      toast.success('Import cancelled');
      setImportingBooks(prev => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to cancel import');
    }
  };

  const handlePrioritize = async (bookId) => {
    try {
      await prioritizeImport(bookId);
      toast.success('Book prioritized for faster translation');
    } catch (error) {
      toast.error('Failed to prioritize');
    }
  };

  const handleImportGutenberg = async (result) => {
    const tempId = `gutenberg-${result.gutenberg_id}`;
    setImportingBooks(prev => new Set(prev).add(tempId));
    try {
      const res = await importBook({
        gutenberg_id: result.gutenberg_id,
        title: result.title,
        author: result.author
      });
      const bookId = res.data.book_id || tempId;
      if (res.data.status === 'completed') {
        setImportingBooks(prev => { const n = new Set(prev); n.delete(tempId); return n; });
        toast.success('Book added to your library!');
        fetchData();
      } else {
        setImportingBooks(prev => { const n = new Set(prev); n.delete(tempId); n.add(bookId); return n; });
        toast.success('Importing... This only takes a few seconds!');
      }
      setShowImportDialog(false);
    } catch (error) {
      toast.error('Failed to start import');
      setImportingBooks(prev => { const n = new Set(prev); n.delete(tempId); return n; });
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle || !uploadAuthor) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setUploading(true);
    try {
      const res = await uploadBook(uploadFile, uploadTitle, uploadAuthor);
      toast.success('Uploading... Almost ready!');
      setImportingBooks(prev => new Set(prev).add(res.data.book_id));
      setUploadFile(null);
      setUploadTitle('');
      setUploadAuthor('');
      setShowImportDialog(false);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getBookProgress = (bookId) => progress.find(p => p.book_id === bookId);

  const completedBooks = books.filter(b => b.import_status === 'completed');
  const importingBooksList = books.filter(b => b.import_status === 'importing');
  const preparingBooksList = books.filter(b => b.import_status === 'preparing');
  const booksInProgress = completedBooks.filter(book => getBookProgress(book.id));
  const otherBooks = completedBooks.filter(book => !getBookProgress(book.id));

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
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Learn Japanese by reading classic literature with instant translations and vocabulary tools
          </p>
          
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2" data-testid="import-books-btn">
                <Plus className="h-5 w-5" />
                Add Books to Library
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="font-serif flex items-center gap-2">
                  Add Books to Library
                  <Badge variant="secondary" className="gap-1">
                    <Zap className="h-3 w-3" /> Instant Import
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Choose a source and import books. Translations are generated in the background.
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="predefined" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="predefined">Quick Import</TabsTrigger>
                  <TabsTrigger value="search">Search</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                </TabsList>
                
                <TabsContent value="predefined">
                  {/* Source selector */}
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Select value={selectedSource} onValueChange={setSelectedSource}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="gutenberg">Project Gutenberg (English)</SelectItem>
                        <SelectItem value="aozora">青空文庫 Aozora (Japanese)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <ScrollArea className="h-[350px] pr-4">
                    <div className="space-y-3">
                      {availableBooks
                        .filter(book => selectedSource === 'all' || book.source === selectedSource)
                        .map((book) => (
                        <Card key={book.book_key} className={`border-border ${book.language === 'ja' ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-blue-500'}`}>
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-foreground">{book.title}</h4>
                                {book.title_en && <span className="text-xs text-muted-foreground">({book.title_en})</span>}
                              </div>
                              <p className="text-sm text-muted-foreground">{book.author}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">{book.genre}</Badge>
                                <Badge variant={book.language === 'ja' ? 'default' : 'secondary'} className="text-xs">
                                  {book.language === 'ja' ? '日本語' : 'English'}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              {book.is_imported && book.import_status === 'completed' ? (
                                <Badge variant="secondary" className="gap-1">
                                  <Check className="h-3 w-3" /> Ready
                                </Badge>
                              ) : importingBooks.has(book.book_key) ? (
                                <Badge variant="outline" className="gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Importing
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleImportPredefined(book.book_key, book.source)}
                                  data-testid={`import-btn-${book.book_key}`}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Import
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="search">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={searchSource === 'gutenberg' ? 'default' : 'outline'}
                        onClick={() => { setSearchSource('gutenberg'); setSearchResults([]); setSearchQuery(''); }}
                      >
                        <Globe className="h-3.5 w-3.5 mr-1" /> Gutenberg
                      </Button>
                      <Button
                        size="sm"
                        variant={searchSource === 'aozora' ? 'default' : 'outline'}
                        onClick={() => { setSearchSource('aozora'); setSearchResults([]); setSearchQuery(''); }}
                      >
                        青空 Aozora
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={searchSource === 'aozora' ? 'Search Aozora Bunko...' : 'Search Project Gutenberg...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        data-testid="gutenberg-search-input"
                      />
                      <Button onClick={handleSearch} disabled={searching}>
                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>

                    <ScrollArea className="h-[310px]">
                      <div className="space-y-2">
                        {searchResults.map((result) =>
                          searchSource === 'aozora' ? (
                            <Card key={result.book_key} className="border-border">
                              <CardContent className="p-3 flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-sm text-foreground line-clamp-1">{result.title}</h4>
                                  {result.title_en && (
                                    <p className="text-xs text-muted-foreground">{result.title_en}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground">{result.author}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleImportPredefined(result.book_key, 'aozora')}
                                  disabled={importingBooks.has(result.book_key)}
                                >
                                  {importingBooks.has(result.book_key) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          ) : (
                            <Card key={result.gutenberg_id} className="border-border">
                              <CardContent className="p-3 flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-sm text-foreground line-clamp-1">{result.title}</h4>
                                  <p className="text-xs text-muted-foreground">{result.author}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {result.download_count.toLocaleString()} downloads
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleImportGutenberg(result)}
                                  disabled={importingBooks.has(`gutenberg-${result.gutenberg_id}`)}
                                >
                                  {importingBooks.has(`gutenberg-${result.gutenberg_id}`) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          )
                        )}
                        {searchResults.length === 0 && searchQuery && !searching && (
                          <p className="text-center text-muted-foreground py-8">
                            No results found.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
                
                <TabsContent value="upload">
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Book Title</Label>
                      <Input
                        placeholder="Enter book title"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        data-testid="upload-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Author</Label>
                      <Input
                        placeholder="Enter author name"
                        value={uploadAuthor}
                        onChange={(e) => setUploadAuthor(e.target.value)}
                        data-testid="upload-author"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Text File (.txt)</Label>
                      <Input
                        type="file"
                        accept=".txt"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        data-testid="upload-file"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleUpload}
                      disabled={uploading || !uploadFile || !uploadTitle || !uploadAuthor}
                      data-testid="upload-submit"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload Book
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Preparing Section - Books being translated */}
        {preparingBooksList.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <h2 className="text-xl font-serif text-foreground">Preparing books...</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Translating initial chapters. This takes about 30-60 seconds.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {preparingBooksList.map((book) => (
                <Card key={book.id} className="border-border bg-card/50 relative group">
                  <CardContent className="p-4 text-center">
                    <div className="relative mb-3">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground line-clamp-1">{book.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">Translating...</p>
                    
                    {/* Action buttons */}
                    <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handlePrioritize(book.id)}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Prioritize
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs px-2"
                        onClick={() => handleCancelImport(book.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Importing Section */}
        {importingBooksList.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <h2 className="text-xl font-serif text-foreground">Downloading...</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {importingBooksList.map((book) => (
                <Card key={book.id} className="border-border animate-pulse relative group">
                  <CardContent className="p-4 text-center">
                    <Download className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground line-clamp-1">{book.title}</p>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCancelImport(book.id)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {completedBooks.length === 0 && importingBooksList.length === 0 && preparingBooksList.length === 0 && (
          <div className="text-center py-16 space-y-4" data-testid="empty-library">
            <Library className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-serif text-foreground">Your library is empty</h2>
            <p className="text-muted-foreground">
              Import public domain books to start your Japanese reading journey
            </p>
          </div>
        )}

        {/* Continue Reading */}
        {booksInProgress.length > 0 && (
          <section className="mb-12" data-testid="continue-reading-section">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-serif text-foreground">Continue Reading</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {booksInProgress.map(book => (
                <BookCard key={book.id} book={book} progress={getBookProgress(book.id)} onDelete={handleBookDelete} />
              ))}
            </div>
          </section>
        )}

        {/* Book Library */}
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
                <BookCard key={book.id} book={book} onDelete={handleBookDelete} />
              ))}
            </div>
          </section>
        )}

        {/* Stats - Real metrics only */}
        {completedBooks.length > 0 && (
          <div className="mt-12 p-6 bg-card rounded-xl border border-border">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-3xl font-serif text-primary">{completedBooks.length}</p>
                <p className="text-sm text-muted-foreground">Books in Library</p>
              </div>
              <div>
                <p className="text-3xl font-serif text-primary">{booksInProgress.length}</p>
                <p className="text-sm text-muted-foreground">Currently Reading</p>
              </div>
              <div>
                <p className="text-3xl font-serif text-primary">
                  {completedBooks.reduce((sum, b) => sum + b.total_chapters, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Chapters</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HomePage;
