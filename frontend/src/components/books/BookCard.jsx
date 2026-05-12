import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Loader2, Trash2, MoreVertical, Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { deleteBook } from '@/lib/api';
import { toast } from 'sonner';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL || 'https://zenzeii-production.up.railway.app/api';
import GeneratedBookCover from './GeneratedBookCover';


export const BookCard = ({ book, progress, onDelete }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showKindleDialog, setShowKindleDialog] = useState(false);
  const [kindleEmail, setKindleEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  // Always show the generated cover — the backend supplies random Unsplash
  // stock photos that have no relation to the books.
  const showGeneratedCover = true;
  const progressPercent = progress ? Math.round((progress.words_read / 500) * 100) : 0;
  const isImporting = book.import_status === 'importing';
  
  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteBook(book.id);
      toast.success(`"${book.title}" removed from library`);
      if (onDelete) onDelete(book.id);
    } catch (error) {
      toast.error('Failed to delete book');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSendToKindle = async () => {
    if (!kindleEmail.trim()) return;
    setIsSending(true);
    try {
      await axios.post(`${API}/books/${book.id}/send-to-kindle`, {
        recipient_email: kindleEmail
      });
      toast.success('Book sent to your email!');
      setShowKindleDialog(false);
      setKindleEmail('');
    } catch (error) {
      toast.error('Failed to send book. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  if (isImporting) {
    return (
      <Card className="overflow-hidden border border-border h-full opacity-70">
        <div className="aspect-[3/4] relative overflow-hidden bg-muted flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-serif text-lg font-medium text-foreground line-clamp-1">
            {book.title_jp || book.title}
          </h3>
          <p className="text-sm text-muted-foreground">Importing...</p>
        </div>
      </Card>
    );
  }
  
  return (
    <>
      <Link to={`/read/${book.id}`} data-testid={`book-card-${book.id}`}>
        <Card className="group overflow-hidden border border-border hover:border-primary/30 hover:shadow-float transition-all duration-300 cursor-pointer h-full relative">
          {/* Book Cover */}
          <div className="aspect-[3/4] relative overflow-hidden bg-muted">
            {showGeneratedCover ? (
              <div className="w-full h-full group-hover:scale-105 transition-transform duration-500">
                <GeneratedBookCover book={book} />
              </div>
            ) : (
              <img
                src={book.cover_image}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            
            {/* Progress Indicator */}
            {progress && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            )}
            
            {/* Menu Button */}
            <div className="absolute top-2 right-2" onClick={handleMenuClick}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white"
                    data-testid={`book-menu-${book.id}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowKindleDialog(true);
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send to Kindle
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    data-testid={`delete-book-${book.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Book
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Book Info */}
          <div className="p-4 space-y-2">
            <h3 className="font-serif text-lg font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {book.title_jp || book.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {book.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {book.author_jp || book.author}
            </p>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <BookOpen className="h-3 w-3" />
                <span>{book.total_chapters} chapters</span>
              </div>
              
              {progress && (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Clock className="h-3 w-3" />
                  <span>In progress</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </Link>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{book.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this book and all its chapters from your library. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid={`confirm-delete-${book.id}`}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send to Email Dialog */}
      <Dialog open={showKindleDialog} onOpenChange={setShowKindleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send "{book.title}" to Kindle</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <input
              type="email"
              placeholder="your@email.com"
              value={kindleEmail}
              onChange={(e) => setKindleEmail(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
              onKeyDown={(e) => e.key === 'Enter' && handleSendToKindle()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowKindleDialog(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={handleSendToKindle} disabled={isSending || !kindleEmail.trim()}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookCard;
