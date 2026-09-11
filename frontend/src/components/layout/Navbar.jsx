import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Library, Moon, Sun, LogOut, Settings, BookMarked, MessageCircle, User, Star, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Navbar = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const handleReport = async (e) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    setReportSending(true);
    try {
      await axios.post(`${API}/feedback`, {
        message: reportText,
        user_email: user?.email,
        username: user?.username
      });
      setReportSent(true);
      setReportText('');
      setTimeout(() => {
        setReportOpen(false);
        setReportSent(false);
      }, 2000);
    } catch {
      setReportSent(true);
      setTimeout(() => {
        setReportOpen(false);
        setReportSent(false);
      }, 2000);
    } finally {
      setReportSending(false);
    }
  };

  const isActive = (path) => location.pathname === path;
  
  const navItems = [
    { path: '/', icon: Library, label: 'My Books' },
    { path: '/vocabulary', icon: BookOpen, label: 'Vocabulary' },
    { path: '/zenzeii', icon: MessageCircle, label: 'Zenzeii' },
    { path: '/library', icon: BookMarked, label: 'Library' },
  ];

  return (
    <>
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/profile" className="flex items-center gap-2 group" data-testid="nav-logo">
            <span className="text-2xl font-serif text-primary">読</span>
            <span className="text-lg font-medium text-foreground hidden sm:inline">Zenzeii</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navItems.map(({ path, icon: Icon, label }) => (
              <Link key={path} to={path}>
                <Button
                  variant={isActive(path) ? "default" : "ghost"}
                  size="sm"
                  className={`gap-2 ${isActive(path) ? '' : 'text-muted-foreground'}`}
                  data-testid={`nav-${label.toLowerCase()}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user.username}
              </span>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="theme-toggle"
              className="text-muted-foreground"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px] font-sans">
                <DropdownMenuItem onSelect={() => navigate('/profile')}>
                  <User className="h-4 w-4" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                  <Flag className="h-4 w-4" />
                  Report Problem
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => logout()}
                  className="text-[#B5294E] focus:text-[#B5294E]"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
                {user?.subscription_tier === 'free' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate('/pricing')}>
                      <Star className="h-4 w-4" />
                      Get Toshokan Pass
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
    {reportOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setReportOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#f5efe0', padding: '32px', maxWidth: '420px', width: '90%',
            fontFamily: 'EB Garamond, serif', border: '1px solid #c8b89a'
          }}>
            <h2 style={{ fontSize: '22px', color: '#3d2b1f', marginBottom: '8px' }}>
              禅々 Report a Problem
            </h2>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '16px' }}>
              Describe the issue and we will look into it.
            </p>
            {reportSent ? (
              <p style={{ color: '#2D7D46', fontSize: '16px', textAlign: 'center' }}>
                Thank you. Your report has been sent.
              </p>
            ) : (
              <form onSubmit={handleReport}>
                <textarea
                  value={reportText}
                  onChange={e => setReportText(e.target.value)}
                  placeholder="Describe the problem..."
                  rows={5}
                  required
                  style={{
                    width: '100%', padding: '10px', border: '1px solid #c8b89a',
                    fontFamily: 'EB Garamond, serif', fontSize: '15px',
                    background: '#fdf8f0', resize: 'vertical', boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button type="submit" disabled={reportSending} style={{
                    padding: '8px 20px', background: '#B5294E', color: 'white',
                    border: 'none', cursor: 'pointer', fontFamily: 'EB Garamond, serif', fontSize: '15px'
                  }}>
                    {reportSending ? 'Sending...' : 'Send Report'}
                  </button>
                  <button type="button" onClick={() => setReportOpen(false)} style={{
                    padding: '8px 20px', background: 'none', border: '1px solid #c8b89a',
                    cursor: 'pointer', fontFamily: 'EB Garamond, serif', fontSize: '15px'
                  }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
