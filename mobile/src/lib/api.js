import axios from 'axios';

export const API_URL = 'https://zenzeii-production.up.railway.app/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Auth
export const loginRequest = (email, password) =>
  apiClient.post('/auth/login', { email, password });

export const registerRequest = (email, password, username) =>
  apiClient.post('/auth/register', { email, password, username });

export const getMeRequest = () =>
  apiClient.get('/auth/me');

export const forgotPasswordRequest = (email) =>
  apiClient.post('/auth/forgot-password', { email });

export const updateProfileRequest = (updates) =>
  apiClient.patch('/auth/profile', updates);

// Books
export const getBooks = () => apiClient.get('/books');
export const getBook = (bookId) => apiClient.get(`/books/${bookId}`);
export const getChapters = (bookId) => apiClient.get(`/books/${bookId}/chapters`);
export const getChapter = (chapterId) => apiClient.get(`/chapters/${chapterId}`);
export const getSentences = (chapterId, skip = 0, limit = 50) =>
  apiClient.get(`/chapters/${chapterId}/sentences`, { params: { skip, limit } });
export const getSentencesCount = (chapterId) =>
  apiClient.get(`/chapters/${chapterId}/sentences/count`);
export const deleteBook = (bookId) => apiClient.delete(`/books/${bookId}`);
export const getBookStatus = (bookId) => apiClient.get(`/books/${bookId}/status`);

// Book import
export const getAvailableBooks = (source = null) =>
  apiClient.get('/books/available/list', { params: source ? { source } : {} });
export const searchGutenberg = (query) =>
  apiClient.get('/books/search/gutenberg', { params: { query } });
export const searchAozora = (query) =>
  apiClient.get('/books/search/aozora', { params: { query } });
export const importBook = (data) => apiClient.post('/books/import', data);
export const cancelImport = (bookId) => apiClient.post('/books/cancel', { book_id: bookId });
export const prioritizeImport = (bookId) => apiClient.post('/books/prioritize', { book_id: bookId });

// Translation
export const triggerTranslation = (chapterId, startPosition = 1) =>
  apiClient.post('/translate/trigger', { chapter_id: chapterId, start_position: startPosition });

// Dictionary
export const lookupWord = (word) =>
  apiClient.get(`/dictionary/${encodeURIComponent(word)}`);

// Vocabulary
export const getVocabulary = () => apiClient.get('/vocabulary');
export const saveWord = (wordData) => apiClient.post('/vocabulary', wordData);
export const updateSavedWord = (wordId, data) => apiClient.put(`/vocabulary/${wordId}`, data);
export const deleteSavedWord = (wordId) => apiClient.delete(`/vocabulary/${wordId}`);
export const getReviewWords = () => apiClient.get('/vocabulary/review');
export const submitReview = (wordId, correct) =>
  apiClient.post('/vocabulary/review', { word_id: wordId, correct });

// Bookmarks
export const getBookmarks = () => apiClient.get('/bookmarks');
export const createBookmark = (data) => apiClient.post('/bookmarks', data);
export const deleteBookmark = (bookmarkId) => apiClient.delete(`/bookmarks/${bookmarkId}`);

// Progress
export const getProgress = () => apiClient.get('/progress');
export const getBookProgress = (bookId) => apiClient.get(`/progress/${bookId}`);
export const updateProgress = (data) => apiClient.post('/progress', data);

// Stats
export const getStats = () => apiClient.get('/stats');

// AI
export const explainWord = (word, contextSentence) =>
  apiClient.post('/ai/explain', { word, context_sentence: contextSentence || null });
export const sendChatMessage = (message, bookTitle, currentSentence, chatHistory) =>
  apiClient.post('/ai/chat', {
    message,
    book_title: bookTitle || '',
    current_sentence: currentSentence || '',
    chat_history: chatHistory,
  });

// TTS
export const textToSpeech = (text, voice = 'nova') =>
  apiClient.post('/tts', { text, voice }, { responseType: 'arraybuffer' });

// Tokenizer
export const tokenize = (text) =>
  apiClient.post('/tokenize', { text });
