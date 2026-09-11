import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token_reservas_vgy';
const USER_DATA_KEY = 'user_data_reservas_vgy';

export const guardarTokenEnSecureStore = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('Error guardando token en SecureStore:', error);
  }
};

export const obtenerTokenDeSecureStore = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error obteniendo token de SecureStore:', error);
    return null;
  }
};

export const eliminarTokenDeSecureStore = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_DATA_KEY);
    }
  } catch (error) {
    console.error('Error eliminando token de SecureStore:', error);
  }
};

export const guardarUsuarioEnSecureStore = async (usuarioJson: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(USER_DATA_KEY, usuarioJson);
    } else {
      await SecureStore.setItemAsync(USER_DATA_KEY, usuarioJson);
    }
  } catch (error) {
    console.error('Error guardando usuario en SecureStore:', error);
  }
};

export const obtenerUsuarioDeSecureStore = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(USER_DATA_KEY);
    }
    return await SecureStore.getItemAsync(USER_DATA_KEY);
  } catch (error) {
    console.error('Error obteniendo usuario de SecureStore:', error);
    return null;
  }
};
