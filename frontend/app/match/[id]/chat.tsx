// Match Chat Screen - Fixed Version
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '../../../src/components';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useLanguage } from '../../../src/contexts/LanguageContext';
import { COLORS } from '../../../src/utils/constants';
import { apiClient } from '../../../src/api/client';
import { ChatMessage } from '../../../src/types';
import { format } from 'date-fns';
import { io, Socket } from 'socket.io-client';
import { GradientBackground } from '../../../src/components';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function MatchChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Safe date formatting that handles both ISO strings and Date objects
  const formatMessageTime = (dateInput: string | Date) => {
    try {
      let date: Date;
      if (typeof dateInput === 'string') {
        // Handle ISO string with or without timezone
        date = new Date(dateInput);
      } else {
        date = dateInput;
      }
      
      if (isNaN(date.getTime())) {
        return '';
      }
      
      return format(date, 'HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiClient.getMatchChat(id);
      // Track all fetched message IDs to prevent duplicates
      data.forEach((msg: ChatMessage) => processedMessageIds.current.add(msg.message_id));
      setMessages(data);
    } catch (error: any) {
      if (error.response?.status === 400) {
        Alert.alert(t('chat_unavailable'), 'La chat non è più disponibile');
        router.back();
      }
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMessages();

    // Setup Socket.IO for real-time updates
    socketRef.current = io(API_BASE_URL, {
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      socketRef.current?.emit('join_match_chat', { match_id: id });
    });

    // Handle incoming socket messages - with duplicate prevention
    socketRef.current.on(`chat_${id}`, (message: ChatMessage) => {
      // Only add if we haven't seen this message before
      if (!processedMessageIds.current.has(message.message_id)) {
        processedMessageIds.current.add(message.message_id);
        setMessages((prev) => {
          // Double-check it's not already in the list
          if (prev.some(m => m.message_id === message.message_id)) {
            return prev;
          }
          return [...prev, message];
        });
      }
    });

    return () => {
      socketRef.current?.emit('leave_match_chat', { match_id: id });
      socketRef.current?.disconnect();
    };
  }, [id, fetchMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !id || !user) return;

    const messageContent = newMessage.trim();
    setIsSending(true);
    setNewMessage('');
    
    // Create optimistic message with temp ID
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      message_id: tempId,
      match_id: id,
      user_id: user.user_id,
      user_name: user.name,
      content: messageContent,
      created_at: new Date().toISOString(),
    };
    
    // Add to processed to prevent socket duplicate
    processedMessageIds.current.add(tempId);
    setMessages((prev) => [...prev, optimisticMessage]);
    
    // Scroll to bottom immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      const sentMessage = await apiClient.sendChatMessage(id, messageContent);
      
      // Success! Add the real message ID to processed
      if (sentMessage && sentMessage.message_id) {
        processedMessageIds.current.add(sentMessage.message_id);
        
        // Replace optimistic message with the real one from server
        setMessages((prev) => 
          prev.map(msg => 
            msg.message_id === tempId ? sentMessage : msg
          )
        );
      }
      // Message sent successfully - no error to show
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Check if the error is a network/timeout issue but message might have been saved
      // If we get a response with status 200/201, the message was actually saved
      const responseStatus = error.response?.status;
      const isServerError = responseStatus && responseStatus >= 500;
      const isClientError = responseStatus && responseStatus >= 400 && responseStatus < 500;
      
      if (isClientError) {
        // True client error (auth, validation, etc.) - remove optimistic message
        setMessages((prev) => prev.filter(msg => msg.message_id !== tempId));
        processedMessageIds.current.delete(tempId);
        
        // Restore the message text
        setNewMessage(messageContent);
        
        // Show error to user
        const errorDetail = error.response?.data?.detail || 'Impossibile inviare il messaggio';
        Alert.alert('Errore', errorDetail);
      } else {
        // Network error or server error - message might have been saved
        // Keep the optimistic message and don't show error (will sync on next fetch)
        // Mark the optimistic message as potentially sent (remove temp status)
        console.log('[Chat] Network/server issue - keeping optimistic message, will sync on refresh');
        
        // After a delay, try to refresh messages to see if it was saved
        setTimeout(async () => {
          try {
            const freshMessages = await apiClient.getMatchChat(id);
            const savedMessage = freshMessages.find(
              (m: ChatMessage) => m.content === messageContent && m.user_id === user.user_id
            );
            
            if (savedMessage) {
              // Message was saved! Update the list
              processedMessageIds.current.add(savedMessage.message_id);
              setMessages(freshMessages);
            } else {
              // Message wasn't saved - now show error
              setMessages((prev) => prev.filter(msg => msg.message_id !== tempId));
              processedMessageIds.current.delete(tempId);
              setNewMessage(messageContent);
              Alert.alert('Errore', 'Impossibile inviare il messaggio. Riprova.');
            }
          } catch (refreshError) {
            // Couldn't refresh - keep optimistic for now
            console.log('[Chat] Refresh failed, keeping optimistic message');
          }
        }, 2000);
      }
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.user_id === user?.user_id;
    const isTemp = item.message_id.startsWith('temp_');

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isOwnMessage && (
          <Text style={styles.messageSender}>{item.user_name}</Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
            isTemp && styles.tempMessageBubble,
          ]}
        >
          <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>{item.content}</Text>
        </View>
        <Text style={styles.messageTime}>
          {isTemp ? 'Invio...' : formatMessageTime(item.created_at)}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message={t('loading')} />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('chat')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.message_id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Nessun messaggio</Text>
              <Text style={styles.emptySubtext}>Inizia la conversazione!</Text>
            </View>
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t('type_message')}
            placeholderTextColor={COLORS.textMuted}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim() || isSending}
          >
            <Ionicons
              name="send"
              size={20}
              color={newMessage.trim() && !isSending ? COLORS.background : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  ownMessageBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  tempMessageBubble: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  ownMessageText: {
    color: COLORS.background,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.surfaceLight,
  },
});
