import React, { useState, useEffect } from 'react';
import { Clock, Library, Plus, Search, Upload, Loader2, Check, Download, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import Layout from '@/components/layout/Layout';
import BookCard from '@/components/books/BookCard';
import { 
  getBooks, 
  getProgress, 
  getAvailableBooks, 
  importBook, 
  searchGutenberg,
  uploadBook,
  getBookImportStatus,
  cancelBookImport
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
  const [importingBooks, setImportingBooks] = useState({});  // Changed to object for progress tracking
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Poll for import status updates
  useEffect(() => {
    const importingIds = Object.keys(importingBooks);
    if (importingIds.length === 0) return;
    
    const interval = setInterval(async () => {
      for (const bookId of importingIds) {
        try {
          const res = await getBookImportStatus(bookId);
          const status = res.data;
          
          // Update progress
          setImportingBooks(prev => ({
            ...prev,
            [bookId]: {
              ...prev[bookId],
              progress: status.progress_percent,
              processedSentences: status.processed_sentences,
              totalSentences: status.total_sentences,
              currentChapter: status.current_chapter,
              totalChapters: status.total_chapters,
              status: status.status,
              error: status.error
            }
          }));
          
          if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
            setImportingBooks(prev => {
              const { [bookId]: removed, ...rest } = prev;
              return rest;
            });
            
            if (status.status === 'completed') {
              toast.success(`Book imported successfully!${status.error ? ' (with some translation errors)' : ''}`);
            } else if (status.status === 'cancelled') {
              toast.info('Book import cancelled');
            } else {
              toast.error(`Import failed: ${status.error || 'Unknown error'}`);
            }
            fetchData();
          }
        } catch (e) {
          console.error('Failed to check import status:', e);
        }
      }
    }, 3000);  // Poll every 3 seconds
    
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
      
      // Check for books still importing
      const importing = {};
      for (const book of booksRes.data) {
        if (book.import_status === 'importing') {
          importing[book.id] = {
            progress: book.import_progress || 0,
            processedSentences: book.processed_sentences || 0,
            totalSentences: book.total_sentences_estimate || 0,
            currentChapter: book.current_chapter || 0,
            totalChapters: book.total_chapters_found || 0,
            status: 'importing'
          };
        }
      }
      setImportingBooks(importing);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await searchGutenberg(searchQuery);
      setSearchResults(res.data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleImportPredefined = async (bookKey) => {
    setImportingBooks(prev => ({
      ...prev,
      [bookKey]: { progress: 0, status: 'importing', processedSentences: 0, totalSentences: 0 }
    }));
    try {
      await importBook({ book_key: bookKey });
      toast.success('Import started! This may take a few minutes...');
      
      const availableRes = await getAvailableBooks();
      setAvailableBooks(availableRes.data);
    } catch (error) {
      toast.error('Failed to start import');
      setImportingBooks(prev => {
        const { [bookKey]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleImportGutenberg = async (result) => {
    const bookId = `gutenberg-${result.gutenberg_id}`;
    setImportingBooks(prev => ({
      ...prev,
      [bookId]: { progress: 0, status: 'importing', processedSentences: 0, totalSentences: 0 }
    }));
    try {
      await importBook({
        gutenberg_id: result.gutenberg_id,
        title: result.title,
        author: result.author
      });
      toast.success('Import started! This may take a few minutes...');
      setShowImportDialog(false);
    } catch (error) {
      toast.error('Failed to start import');
      setImportingBooks(prev => {
        const { [bookId]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleCancelImport = async (bookId) => {
    try {
      await cancelBookImport(bookId);
      toast.info('Cancelling import...');
    } catch (error) {
      toast.error('Failed to cancel import');
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
      toast.success('Upload started! Processing may take a few minutes...');
      setImportingBooks(prev => ({
        ...prev,
        [res.data.book_id]: { progress: 0, status: 'importing', processedSentences: 0, totalSentences: 0 }
      }));
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

  const getBookProgress = (bookId) => {
    return progress.find(p => p.book_id === bookId);
  };

  // Filter out books that are still importing for display
  const completedBooks = books.filter(b => b.import_status === 'completed');
  const importingBooksList = books.filter(b => b.import_status === 'importing');
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
          
          {/* Import Button */}
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2" data-testid="import-books-btn">
                <Plus className="h-5 w-5" />
                Add Books to Library
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="font-serif">Add Books to Library</DialogTitle>
                <DialogDescription>
                  Import public domain books from Project Gutenberg or upload your own
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="predefined" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="predefined">Quick Import</TabsTrigger>
                  <TabsTrigger value="search">Search Gutenberg</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                </TabsList>
                
                {/* Predefined Books */}
                <TabsContent value="predefined">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {availableBooks.map((book) => (
                        <Card key={book.book_key} className="border-border">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-foreground">{book.title}</h4>
                              <p className="text-sm text-muted-foreground">{book.author}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">{book.genre}</Badge>
                                <Badge variant="outline" className="text-xs">{book.difficulty}</Badge>
                              </div>
                            </div>
                            <div>
                              {book.is_imported && book.import_status === 'completed' ? (
                                <Badge variant="secondary" className="gap-1">
                                  <Check className="h-3 w-3" /> Imported
                                </Badge>
                              ) : importingBooks[book.book_key] || book.import_status === 'importing' ? (
                                <Badge variant="outline" className="gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Importing...
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleImportPredefined(book.book_key)}
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
                
                {/* Search Gutenberg */}
                <TabsContent value="search">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search Project Gutenberg..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        data-testid="gutenberg-search-input"
                      />
                      <Button onClick={handleSearch} disabled={searching}>
                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-[350px]">
                      <div className="space-y-2">
                        {searchResults.map((result) => (
                          <Card key={result.gutenberg_id} className="border-border">
                            <CardContent className="p-3 flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-sm text-foreground line-clamp-1">{result.title}</h4>
                                <p className="text-xs text-muted-foreground">{result.author}</p>
                                <p className="text-xs text-muted-foreground">
                                  Downloads: {result.download_count.toLocaleString()}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleImportGutenberg(result)}
                                disabled={!!importingBooks[`gutenberg-${result.gutenberg_id}`]}
                              >
                                {importingBooks[`gutenberg-${result.gutenberg_id}`] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                        {searchResults.length === 0 && searchQuery && !searching && (
                          <p className="text-center text-muted-foreground py-8">
                            No results found. Try a different search term.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
                
                {/* Upload */}
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
                      <p className="text-xs text-muted-foreground">
                        Upload a plain text file from Project Gutenberg or other public domain source
                      </p>
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
                      Upload and Process
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Importing Books Section with Progress */}
        {importingBooksList.length > 0 && (
          <section className="mb-8" data-testid="importing-section">
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <h2 className="text-xl font-serif text-foreground">Importing...</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {importingBooksList.map((book) => {
                const importProgress = importingBooks[book.id] || {
                  progress: book.import_progress || 0,
                  processedSentences: book.processed_sentences || 0,
                  totalSentences: book.total_sentences_estimate || 0,
                  currentChapter: book.current_chapter || 0,
                  totalChapters: book.total_chapters_found || 0
                };
                
                return (
                  <Card key={book.id} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-foreground">{book.title}</h4>
                          <p className="text-sm text-muted-foreground">{book.author}</p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              data-testid={`cancel-import-${book.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Import?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will stop the import process. You can restart it later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Continue Importing</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancelImport(book.id)}>
                                Cancel Import
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <Progress value={importProgress.progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {importProgress.totalSentences > 0 
                              ? `${importProgress.processedSentences.toLocaleString()} / ${importProgress.totalSentences.toLocaleString()} sentences`
                              : 'Preparing...'}
                          </span>
                          <span>{Math.round(importProgress.progress)}%</span>
                        </div>
                        {importProgress.totalChapters > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Chapter {importProgress.currentChapter} of {importProgress.totalChapters}
                          </p>
                        )}
                      </div>
                      
                      {importProgress.error && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-warning">
                          <AlertCircle className="h-3 w-3" />
                          <span>{importProgress.error}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty State */}
        {completedBooks.length === 0 && importingBooksList.length === 0 && (
          <div className="text-center py-16 space-y-4" data-testid="empty-library">
            <Library className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-serif text-foreground">Your library is empty</h2>
            <p className="text-muted-foreground">
              Import public domain books to start your Japanese reading journey
            </p>
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
        {completedBooks.length > 0 && (
          <div className="mt-12 p-6 bg-card rounded-xl border border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-3xl font-serif text-primary">{completedBooks.length}</p>
                <p className="text-sm text-muted-foreground">Books Available</p>
              </div>
              <div>
                <p className="text-3xl font-serif text-primary">{booksInProgress.length}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
              <div>
                <p className="text-3xl font-serif text-primary">
                  {completedBooks.reduce((sum, b) => sum + b.total_chapters, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Chapters</p>
              </div>
              <div>
                <p className="text-3xl font-serif text-primary">
                  {completedBooks.reduce((sum, b) => sum + (b.sentences_count || 0), 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Sentences</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HomePage;
