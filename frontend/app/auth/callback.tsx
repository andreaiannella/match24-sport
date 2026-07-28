// Auth Callback Screen (Google OAuth)
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS } from '../../src/utils/constants';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { googleAuth, user } = useAuth();
  const { t } = useLanguage();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use ref to prevent double processing
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processCallback = async () => {
      try {
        let sessionId: string | null = null;

        if (Platform.OS === 'web') {
          const hash = window.location.hash;
          if (hash) {
            const match = hash.match(/session_id=([^&]+)/);
            if (match) {
              sessionId = match[1];
            }
          }
        }

        if (sessionId) {
          await googleAuth(sessionId);
          
          // Clear the hash
          if (Platform.OS === 'web') {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
        
        // Navigate based on user role
        router.replace('/');
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/auth/login');
      }
    };

    processCallback();
  }, []);

  return (
    <View style={styles.container}>
      <LoadingSpinner message="Autenticazione in corso..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
