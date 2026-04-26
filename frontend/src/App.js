import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Pages
import HomePage from "@/pages/HomePage";
import ReaderPage from "@/pages/ReaderPage";
import VocabularyPage from "@/pages/VocabularyPage";
import ProfilePage from "@/pages/ProfilePage";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ZenzeiiLibraryPage from "@/pages/ZenzeiiLibraryPage";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
};

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground font-serif text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/read/:bookId" element={<ProtectedRoute><ReaderPage /></ProtectedRoute>} />
      <Route path="/read/:bookId/:chapterId" element={<ProtectedRoute><ReaderPage /></ProtectedRoute>} />
      <Route path="/vocabulary" element={<ProtectedRoute><VocabularyPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/zenzeii-library" element={<ProtectedRoute><ZenzeiiLibraryPage /></ProtectedRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="bottom-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
