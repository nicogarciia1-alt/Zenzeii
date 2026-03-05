import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Books API
export const getBooks = () => axios.get(`${API}/books`);
export const getBook = (bookId) => axios.get(`${API}/books/${bookId}`);
export const getChapters = (bookId) => axios.get(`${API}/books/${bookId}/chapters`);
export const getChapter = (chapterId) => axios.get(`${API}/chapters/${chapterId}`);
export const getSentences = (chapterId) => axios.get(`${API}/chapters/${chapterId}/sentences`);

// Dictionary API
export const lookupWord = (word) => axios.get(`${API}/dictionary/${encodeURIComponent(word)}`);

// Vocabulary API
export const getVocabulary = () => axios.get(`${API}/vocabulary`);
export const saveWord = (wordData) => axios.post(`${API}/vocabulary`, wordData);
export const updateSavedWord = (wordId, data) => axios.put(`${API}/vocabulary/${wordId}`, data);
export const deleteSavedWord = (wordId) => axios.delete(`${API}/vocabulary/${wordId}`);
export const getReviewWords = () => axios.get(`${API}/vocabulary/review`);
export const submitReview = (wordId, correct) => axios.post(`${API}/vocabulary/review`, { word_id: wordId, correct });

// Bookmarks API
export const getBookmarks = () => axios.get(`${API}/bookmarks`);
export const createBookmark = (data) => axios.post(`${API}/bookmarks`, data);
export const deleteBookmark = (bookmarkId) => axios.delete(`${API}/bookmarks/${bookmarkId}`);

// Progress API
export const getProgress = () => axios.get(`${API}/progress`);
export const getBookProgress = (bookId) => axios.get(`${API}/progress/${bookId}`);
export const updateProgress = (data) => axios.post(`${API}/progress`, data);

// Stats API
export const getStats = () => axios.get(`${API}/stats`);

// Seed API
export const seedDatabase = () => axios.post(`${API}/seed`);
