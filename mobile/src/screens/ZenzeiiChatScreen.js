import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendChatMessage } from '../lib/api';

// ── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  primary: '#D3382F',
  textPrimary: '#2B2B2B',
  textMuted: '#8C8C8C',
  border: '#E5E5E5',
  muted: '#F0EFE9',
};

// ── Initial greeting — standalone screen, no book context ────────────────────
// Web's version references "the text you are reading"; that's context-specific.
// This version opens with the scholar personality but doesn't assume a book.
const INITIAL_MESSAGE = {
  id: '0',
  role: 'assistant',
  content:
    'Good day. I am Zenzeii, your literary companion. Ask me anything about Japanese literature, language, or the texts you are studying.',
};

// ── ZenzeiiChatScreen ─────────────────────────────────────────────────────────

export default function ZenzeiiChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const flatListRef = useRef(null);
  const msgIdRef = useRef(1);

  // ── Scroll to latest message ───────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  // Re-scroll when thinking indicator appears/disappears (footer change doesn't
  // trigger onContentSizeChange on its own in some RN versions)
  useEffect(() => {
    const t = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(t);
  }, [thinking]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Snapshot history before the new user turn (mirrors web exactly)
    const historyToSend = messages.map(m => ({ role: m.role, content: m.content }));

    const userMsg = { id: String(msgIdRef.current++), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    try {
      // book_title and current_sentence are empty — standalone screen, no reading context
      const res = await sendChatMessage(text, '', '', historyToSend);
      const reply = {
        id: String(msgIdRef.current++),
        role: 'assistant',
        content: res.data.reply,
      };
      setMessages(prev => [...prev, reply]);
    } catch (err) {
      const errText =
        err.response?.status === 503
          ? 'AI chat is not configured on this server.'
          : 'I encountered a difficulty. Please try again.';
      setMessages(prev => [
        ...prev,
        { id: String(msgIdRef.current++), role: 'assistant', content: errText },
      ]);
    } finally {
      setThinking(false);
    }
  }, [input, thinking, messages]);

  // ── Render a single message bubble ─────────────────────────────────────────
  const renderItem = useCallback(({ item: msg }) => {
    const isUser = msg.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {msg.content}
          </Text>
        </View>
      </View>
    );
  }, []);

  // ── Thinking indicator (FlatList footer) ───────────────────────────────────
  const ListFooter = thinking ? (
    <View style={styles.msgRow}>
      <View style={[styles.bubble, styles.bubbleAssistant, styles.thinkingBubble]}>
        <Text style={styles.thinkingText}>Zenzeii is thinking…</Text>
      </View>
    </View>
  ) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* ── Header — "Zenzeii 文" + subtitle ── */}
      {/* web: fontFamily garamond, 1.1rem, fontWeight 600, letterSpacing 0.06em */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Zenzeii 文</Text>
        <Text style={styles.headerSub}>Your literary companion</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Messages list ── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={ListFooter}
          ListFooterComponentStyle={thinking ? styles.footerSpacing : null}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        />

        {/* ── Input bar ── */}
        {/* web: padding 12, borderTop, flex row with gap 8 */}
        <View style={[
          styles.inputBar,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}>
          <TextInput
            style={[styles.input, thinking && styles.inputDisabled]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Zenzeii…"
            placeholderTextColor={C.textMuted}
            multiline
            maxLength={2000}
            editable={!thinking}
            returnKeyType="default"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={thinking || !input.trim()}
            style={[
              styles.sendBtn,
              (thinking || !input.trim()) && styles.sendBtnDisabled,
            ]}
            activeOpacity={0.75}
          >
            {thinking ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  flex1: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  // web: EB Garamond 1.1rem 600 letterSpacing 0.06em → Georgia approximation
  headerTitle: {
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: 0.9,
  },
  headerSub: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 1,
  },

  // ── Message list ─────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  separator: { height: 12 },
  footerSpacing: { marginTop: 12 },

  // ── Bubbles ──────────────────────────────────────────────────────────────────
  msgRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  // web: bg muted, border-radius 12 12 12 2
  bubbleAssistant: {
    backgroundColor: C.muted,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 2,
  },
  // web: bg primary, border-radius 12 12 2 12
  bubbleUser: {
    backgroundColor: C.primary,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 2,
    borderBottomLeftRadius: 12,
  },
  // web: EB Garamond 0.9rem lineHeight 1.55
  bubbleText: {
    fontFamily: 'Georgia',
    fontSize: 15,
    lineHeight: 23,
    color: C.textPrimary,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  // web: 0.85rem italic muted-foreground
  thinkingBubble: {},
  thinkingText: {
    fontFamily: 'Georgia',
    fontSize: 14,
    lineHeight: 21,
    color: C.textMuted,
    fontStyle: 'italic',
  },

  // ── Input bar ────────────────────────────────────────────────────────────────
  // web: borderTop padding 12, flex row gap 8
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    backgroundColor: '#FFFFFF',
  },
  // web: flex-1, padding 8 12, border border-border rounded, Georgia 16px
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    fontFamily: 'Georgia',
    fontSize: 16,
    color: C.textPrimary,
  },
  inputDisabled: { opacity: 0.6 },
  // web: bg primary, padding 8 16, borderRadius 4, Georgia 0.9rem
  sendBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  // web: opacity 0.55 when disabled
  sendBtnDisabled: { opacity: 0.55 },
  sendBtnText: {
    fontFamily: 'Georgia',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
