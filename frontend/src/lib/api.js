import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Books API
export const getBooks = () => axios.get(`${API}/books`);
export const getBook = (bookId) => axios.get(`${API}/books/${bookId}`);
export const getChapters = (bookId) => axios.get(`${API}/books/${bookId}/chapters`);
export const getChapter = (chapterId) => axios.get(`${API}/chapters/${chapterId}`);
export const getSentences = (chapterId, skip = 0, limit = 50) => 
  axios.get(`${API}/chapters/${chapterId}/sentences`, { params: { skip, limit } });
export const getSentencesCount = (chapterId) => 
  axios.get(`${API}/chapters/${chapterId}/sentences/count`);
export const deleteBook = (bookId) => axios.delete(`${API}/books/${bookId}`);
export const getBookStatus = (bookId) => axios.get(`${API}/books/${bookId}/status`);

// Book Import API - Now instant!
export const getAvailableBooks = () => axios.get(`${API}/books/available/list`);
export const searchGutenberg = (query) => axios.get(`${API}/books/search/gutenberg`, { params: { query } });
export const importBook = (data) => axios.post(`${API}/books/import`, data);
export const uploadBook = (file, title, author) => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post(`${API}/books/upload?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Translation API - On-demand lazy loading
export const triggerTranslation = (chapterId, startPosition = 1) => 
  axios.post(`${API}/translate/trigger`, { chapter_id: chapterId, start_position: startPosition });
export const translateSentences = (sentenceIds) => 
  axios.post(`${API}/translate/sentences`, sentenceIds);

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
