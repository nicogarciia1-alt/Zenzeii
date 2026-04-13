import React, { useState } from 'react';
import { BookOpen, Mail, Lock, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL || 'https://zenzeii-production.up.railway.app/api';

export const AuthPage = () => {
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '', username: '' });
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginData.email, loginData.password);
      toast.success('Welcome back!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(registerData.email, registerData.password, registerData.username);
      toast.success('Account created successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: forgotEmail });
      setForgotSent(true);
    } catch {
      // always show success to prevent email enumeration
      setForgotSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#ffffff', colorScheme: 'light' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-5xl font-serif text-primary">読</span>
          </div>
          <h1 className="text-2xl font-serif text-foreground">Zenzeii</h1>
          <p className="text-muted-foreground mt-2">Learn Japanese through reading</p>
        </div>

        <Card className="border-border shadow-card" style={{ background: '#ffffff', color: '#1a1a1a' }}>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="auth-tab-login">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="auth-tab-register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardHeader>
                  <CardTitle className="font-serif">Welcome Back</CardTitle>
                  <CardDescription>Continue your Japanese reading journey</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4" style={{ background: '#ffffff' }}>
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                        data-testid="login-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Your password"
                        className="pl-10"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        data-testid="login-password"
                      />
                    </div>
                  </div>
                  {!forgotMode ? (
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#B5294E',
                        cursor: 'pointer',
                        fontSize: '13px',
                        padding: '4px 0',
                        textAlign: 'right',
                        width: '100%',
                        fontFamily: 'EB Garamond, serif'
                      }}
                    >
                      Forgot password?
                    </button>
                  ) : forgotSent ? (
                    <p style={{ fontSize: '13px', color: '#3d2b1f', textAlign: 'center', fontFamily: 'EB Garamond, serif' }}>
                      If this email exists, a reset link has been sent. Check your inbox.
                    </p>
                  ) : (
                    <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        required
                        style={{ padding: '8px', border: '1px solid #c8b89a', fontFamily: 'EB Garamond, serif', fontSize: '14px' }}
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        style={{ padding: '8px', background: '#B5294E', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'EB Garamond, serif', fontSize: '14px' }}
                      >
                        {loading ? 'Sending...' : 'Send reset link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForgotMode(false)}
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Back to login
                      </button>
                    </form>
                  )}
                  <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BookOpen className="h-4 w-4 mr-2" />}
                    Sign In
                  </Button>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardHeader>
                  <CardTitle className="font-serif">Create Account</CardTitle>
                  <CardDescription>Start your Japanese learning adventure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4" style={{ background: '#ffffff' }}>
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="Your username"
                        className="pl-10"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        required
                        data-testid="register-username"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                        data-testid="register-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a password"
                        className="pl-10"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                        minLength={6}
                        data-testid="register-password"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading} data-testid="register-submit">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BookOpen className="h-4 w-4 mr-2" />}
                    Create Account
                  </Button>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
