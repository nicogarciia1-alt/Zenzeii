import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const difficultyColors = {
  beginner: 'bg-success/20 text-success border-success/30',
  intermediate: 'bg-warning/20 text-warning border-warning/30',
  advanced: 'bg-primary/20 text-primary border-primary/30',
};

export const BookCard = ({ book, progress }) => {
  const progressPercent = progress ? Math.round((progress.words_read / 500) * 100) : 0;
  const isImporting = book.import_status === 'importing';
  
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
    <Link to={`/read/${book.id}`} data-testid={`book-card-${book.id}`}>
      <Card className="group overflow-hidden border border-border hover:border-primary/30 hover:shadow-float transition-all duration-300 cursor-pointer h-full">
        {/* Book Cover */}
        <div className="aspect-[3/4] relative overflow-hidden bg-muted">
          <img
            src={book.cover_image}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Progress Indicator */}
          {progress && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          )}
          
          {/* Difficulty Badge */}
          <Badge 
            variant="outline" 
            className={`absolute top-3 right-3 text-xs ${difficultyColors[book.difficulty] || difficultyColors.intermediate}`}
          >
            {book.difficulty}
          </Badge>
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
  );
};

export default BookCard;
