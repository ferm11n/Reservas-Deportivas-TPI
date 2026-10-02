import { Platform } from 'react-native';

const getHapticsModule = () => {
  if (Platform.OS === 'web') return null;
  try {
    const Haptics = require('expo-haptics');
    if (Haptics && typeof Haptics.notificationAsync === 'function') {
      return Haptics;
    }
  } catch (e) {
    // Fallback silencioso si no está disponible el módulo nativo
  }
  return null;
};

export const useHaptics = () => {
  const vibrarExito = async () => {
    const Haptics = getHapticsModule();
    if (!Haptics) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('Haptics no disponible:', e);
    }
  };

  const vibrarError = async () => {
    const Haptics = getHapticsModule();
    if (!Haptics) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      console.warn('Haptics no disponible:', e);
    }
  };

  const vibrarSeleccion = async () => {
    const Haptics = getHapticsModule();
    if (!Haptics) return;
    try {
      await Haptics.selectionAsync();
    } catch (e) {
      console.warn('Haptics no disponible:', e);
    }
  };

  return { vibrarExito, vibrarError, vibrarSeleccion };
};
