import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { forgotPasswordRequest } from '../../lib/api';

const C = {
  bg: '#FFFFFF',
  surface: '#F9F7F2',
  primary: '#D3382F',
  text: '#2B2B2B',
  textSecondary: '#595959',
  textMuted: '#8C8C8C',
  border: '#E5E5E5',
  success: '#4A7C59',
};

export default function AuthScreen() {
  const { login, register } = useAuth();

  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Forgot password
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Refs for keyboard focus chaining
  const loginPasswordRef = useRef(null);
  const regEmailRef = useRef(null);
  const regPasswordRef = useRef(null);

  const switchTab = (next) => {
    setTab(next);
    setError('');
    setForgotMode(false);
    setForgotSent(false);
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(loginEmail.trim(), loginPassword);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regUsername.trim() || !regEmail.trim() || !regPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(regEmail.trim(), regPassword, regUsername.trim());
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await forgotPasswordRequest(forgotEmail.trim());
    } catch {
      // intentionally silent — never reveal whether email exists
    } finally {
      setLoading(false);
      setForgotSent(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <Text style={styles.logoKanji}>読</Text>
            <Text style={styles.logoName}>Zenzeii</Text>
            <Text style={styles.logoTagline}>Learn Japanese through reading</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Tab switcher */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabButton, tab === 'login' && styles.tabButtonActive]}
                onPress={() => switchTab('login')}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'login' }}
              >
                <Text style={[styles.tabLabel, tab === 'login' && styles.tabLabelActive]}>
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, tab === 'register' && styles.tabButtonActive]}
                onPress={() => switchTab('register')}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'register' }}
              >
                <Text style={[styles.tabLabel, tab === 'register' && styles.tabLabelActive]}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login form */}
            {tab === 'login' && !forgotMode && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Welcome Back</Text>
                <Text style={styles.formSubtitle}>Continue your Japanese reading journey</Text>

                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={C.textMuted}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => loginPasswordRef.current?.focus()}
                  testID="login-email"
                />

                <Text style={styles.fieldLabel}>Password</Text>
                <TextInput
                  ref={loginPasswordRef}
                  style={styles.input}
                  placeholder="Your password"
                  placeholderTextColor={C.textMuted}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  testID="login-password"
                />

                <TouchableOpacity
                  onPress={() => { setForgotMode(true); setError(''); }}
                  style={styles.forgotLink}
                  accessibilityRole="button"
                >
                  <Text style={styles.forgotLinkText}>Forgot password?</Text>
                </TouchableOpacity>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  accessibilityRole="button"
                  testID="login-submit"
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.primaryButtonText}>Sign In</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* Forgot password flow */}
            {tab === 'login' && forgotMode && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Reset Password</Text>
                <Text style={styles.formSubtitle}>We'll send a link to your email</Text>

                {forgotSent ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>
                      If this email exists, a reset link has been sent. Check your inbox.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor={C.textMuted}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleForgotPassword}
                    />

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                      style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                      onPress={handleForgotPassword}
                      disabled={loading}
                      accessibilityRole="button"
                    >
                      {loading
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.primaryButtonText}>Send reset link</Text>
                      }
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  onPress={() => { setForgotMode(false); setForgotSent(false); setError(''); }}
                  style={styles.forgotLink}
                  accessibilityRole="button"
                >
                  <Text style={styles.forgotLinkText}>Back to login</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Register form */}
            {tab === 'register' && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Create Account</Text>
                <Text style={styles.formSubtitle}>Start your Japanese learning adventure</Text>

                <Text style={styles.fieldLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your username"
                  placeholderTextColor={C.textMuted}
                  value={regUsername}
                  onChangeText={setRegUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => regEmailRef.current?.focus()}
                  testID="register-username"
                />

                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  ref={regEmailRef}
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={C.textMuted}
                  value={regEmail}
                  onChangeText={setRegEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => regPasswordRef.current?.focus()}
                  testID="register-email"
                />

                <Text style={styles.fieldLabel}>Password</Text>
                <TextInput
                  ref={regPasswordRef}
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={C.textMuted}
                  value={regPassword}
                  onChangeText={setRegPassword}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  testID="register-password"
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                  accessibilityRole="button"
                  testID="register-submit"
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.primaryButtonText}>Create Account</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  // Logo
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoKanji: {
    fontSize: 56,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: C.primary,
    lineHeight: 68,
  },
  logoName: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: C.text,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  logoTagline: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 6,
  },

  // Card
  card: {
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  tabLabel: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: C.textMuted,
  },
  tabLabelActive: {
    color: C.primary,
    fontWeight: '600',
  },

  // Form
  form: {
    padding: 24,
  },
  formTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: C.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: C.text,
  },

  // Actions
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 4,
  },
  forgotLinkText: {
    fontSize: 13,
    color: C.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  primaryButton: {
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Feedback
  errorText: {
    color: C.primary,
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#EDF7F0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  successText: {
    color: C.success,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
