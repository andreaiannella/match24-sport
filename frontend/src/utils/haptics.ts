// Haptic Feedback Utility
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Light haptic - for subtle interactions (selections, toggles)
export const lightHaptic = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Silently fail if haptics not available
    }
  }
};

// Medium haptic - for confirmations (button press, navigation)
export const mediumHaptic = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Silently fail
    }
  }
};

// Heavy haptic - for important actions (booking, sending message)
export const heavyHaptic = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      // Silently fail
    }
  }
};

// Success haptic - for successful operations
export const successHaptic = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Silently fail
    }
  }
};

// Error haptic - for errors
export const errorHaptic = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      // Silently fail
    }
  }
};

// Warning haptic - for warnings
export const warningHaptic = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      // Silently fail
    }
  }
};

// Selection haptic - for picker/selection changes
export const selectionHaptic = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      // Silently fail
    }
  }
};
