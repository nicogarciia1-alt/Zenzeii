import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToshokanGateProvider } from "@/features/toshokan/context/ToshokanGateContext";

// Pages
import LandingPage from "@/pages/LandingPage";
import HomePage from "@/pages/HomePage";
import ReaderPage from "@/pages/ReaderPage";
import VocabularyPage from "@/pages/VocabularyPage";
import ProfilePage from "@/pages/ProfilePage";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import PricingPage from "@/pages/PricingPage";
import LibraryPage from "@/pages/LibraryPage";
import BookDetailPage from "@/pages/BookDetailPage";
import ShelfDetailPage from "@/pages/ShelfDetailPage";
import ZenzeiiPage from "@/pages/ZenzeiiPage";
import MembershipArrivalPage from "@/pages/MembershipArrivalPage";

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
      <Route path="/" element={isAuthenticated ? <ProtectedRoute><HomePage /></ProtectedRoute> : <LandingPage />} />
      <Route path="/read/:bookId" element={<ProtectedRoute><ReaderPage /></ProtectedRoute>} />
      <Route path="/read/:bookId/:chapterId" element={<ProtectedRoute><ReaderPage /></ProtectedRoute>} />
      <Route path="/vocabulary" element={<ProtectedRoute><VocabularyPage /></ProtectedRoute>} />
      <Route path="/zenzeii" element={<ProtectedRoute><ZenzeiiPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
      <Route path="/library/:bookId" element={<ProtectedRoute><BookDetailPage /></ProtectedRoute>} />
      <Route path="/bookshelves/:slug" element={<ProtectedRoute><ShelfDetailPage /></ProtectedRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
      <Route path="/upgrade" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
      <Route path="/payment-success" element={<ProtectedRoute><MembershipArrivalPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ToshokanGateProvider>
            <AppRoutes />
            <Toaster position="bottom-right" />
          </ToshokanGateProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
