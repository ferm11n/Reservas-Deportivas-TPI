import { Platform } from 'react-native';

export const useHaptics = () => {
  const vibrarExito = async () => {
    if (Platform.OS === 'web') return;
    try {
      const Haptics = require('expo-haptics');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('Haptics no disponible:', e);
    }
  };

  const vibrarError = async () => {
    if (Platform.OS === 'web') return;
    try {
      const Haptics = require('expo-haptics');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      console.warn('Haptics no disponible:', e);
    }
  };

  const vibrarSeleccion = async () => {
    if (Platform.OS === 'web') return;
    try {
      const Haptics = require('expo-haptics');
      await Haptics.selectionAsync();
    } catch (e) {
      console.warn('Haptics no disponible:', e);
    }
  };

  return { vibrarExito, vibrarError, vibrarSeleccion };
};
