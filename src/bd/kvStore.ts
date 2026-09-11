import { Platform } from 'react-native';

// Implementación de KV-Store para Preferencias y Estado Offline (expo-sqlite/kv-store o LocalStorage)
const memoryStore: Record<string, string> = {};

export const setKVItem = async (key: string, value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    try {
      const { setItemAsync } = require('expo-sqlite/kv-store');
      await setItemAsync(key, value);
    } catch {
      memoryStore[key] = value;
    }
  } catch (error) {
    memoryStore[key] = value;
  }
};

export const getKVItem = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    try {
      const { getItemAsync } = require('expo-sqlite/kv-store');
      return await getItemAsync(key);
    } catch {
      return memoryStore[key] || null;
    }
  } catch {
    return memoryStore[key] || null;
  }
};

export const removeKVItem = async (key: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    try {
      const { removeItemAsync } = require('expo-sqlite/kv-store');
      await removeItemAsync(key);
    } catch {
      delete memoryStore[key];
    }
  } catch {
    delete memoryStore[key];
  }
};
