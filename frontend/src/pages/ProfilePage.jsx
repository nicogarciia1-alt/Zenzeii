import React, { useState, useEffect } from 'react';
import {
  User,
  BookOpen,
  Star,
  BarChart3,
  Clock,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { getStats, getProgress, getVocabulary } from '@/lib/api';

export const ProfilePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, progressRes, vocabRes] = await Promise.all([
        getStats(),
        getProgress(),
        getVocabulary()
      ]);
      setStats(statsRes.data);
      setProgress(progressRes.data);
      setVocabulary(vocabRes.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMasteryDistribution = () => {
    if (!stats?.mastery_distribution) return [];
    const levels = ['0', '1', '2', '3', '4', '5'];
    return levels.map(level => ({
      level: parseInt(level),
      count: stats.mastery_distribution[level] || 0,
      label: level === '0' ? 'New' : level === '5' ? 'Mastered' : `Level ${level}`
    }));
  };

  const masteryData = getMasteryDistribution();
  const totalMasteryWords = masteryData.reduce((sum, d) => sum + d.count, 0);

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
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif text-foreground" data-testid="profile-username">
              {user?.username}
            </h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Vocabulary Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-serif text-foreground" data-testid="stat-vocab-count">
                {stats?.vocabulary_count || 0}
              </p>
              <p className="text-xs text-muted-foreground">words saved</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Books in Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-serif text-foreground" data-testid="stat-books-progress">
                {stats?.books_in_progress || 0}
              </p>
              <p className="text-xs text-muted-foreground">currently reading</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Words Read
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-serif text-foreground" data-testid="stat-words-read">
                {stats?.total_words_read || 0}
              </p>
              <p className="text-xs text-muted-foreground">total estimated</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4" />
                Mastery Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-serif text-foreground" data-testid="stat-mastery-rate">
                {totalMasteryWords > 0
                  ? Math.round(((masteryData.find(d => d.level === 5)?.count || 0) / totalMasteryWords) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">words mastered</p>
            </CardContent>
          </Card>
        </div>

        {/* Mastery Distribution */}
        <Card className="border-border mb-8">
          <CardHeader>
            <CardTitle className="font-serif">Vocabulary Mastery</CardTitle>
          </CardHeader>
          <CardContent>
            {totalMasteryWords === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Save some words to see your mastery progress
              </p>
            ) : (
              <div className="space-y-4">
                {masteryData.map((level) => (
                  <div key={level.level} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{level.label}</span>
                      <span className="text-foreground font-medium">{level.count} words</span>
                    </div>
                    <Progress
                      value={(level.count / totalMasteryWords) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reading Progress */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-serif">Reading Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {progress.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Start reading a book to track your progress
              </p>
            ) : (
              <div className="space-y-4" data-testid="reading-progress-list">
                {progress.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">Book: {p.book_id}</p>
                      <p className="text-sm text-muted-foreground">
                        Last read: {new Date(p.last_read).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-primary">
                        {p.words_read} words read
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Vocabulary */}
        <Card className="border-border mt-8">
          <CardHeader>
            <CardTitle className="font-serif">Recently Saved Words</CardTitle>
          </CardHeader>
          <CardContent>
            {vocabulary.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Save words while reading to build your vocabulary
              </p>
            ) : (
              <div className="flex flex-wrap gap-2" data-testid="recent-vocab">
                {vocabulary.slice(0, 20).map((word) => (
                  <div
                    key={word.id}
                    className="px-3 py-2 bg-muted rounded-lg text-sm"
                  >
                    <span className="font-serif text-foreground">{word.word}</span>
                    <span className="text-muted-foreground ml-2">{word.meanings[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProfilePage;
