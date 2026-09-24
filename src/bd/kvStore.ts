import { Platform } from 'react-native';

const memoryStore: Record<string, string> = {};

export const setKVItem = async (key: string, value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    try {
      const kv = require('expo-sqlite/kv-store');
      if (kv && typeof kv.setItemAsync === 'function') {
        await kv.setItemAsync(key, value);
        return;
      }
    } catch {
      memoryStore[key] = value;
    }
  } catch {
    memoryStore[key] = value;
  }
};

export const getKVItem = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    try {
      const kv = require('expo-sqlite/kv-store');
      if (kv && typeof kv.getItemAsync === 'function') {
        return await kv.getItemAsync(key);
      }
    } catch {
      return memoryStore[key] || null;
    }
  } catch {
    return memoryStore[key] || null;
  }
  return memoryStore[key] || null;
};

export const removeKVItem = async (key: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    try {
      const kv = require('expo-sqlite/kv-store');
      if (kv && typeof kv.removeItemAsync === 'function') {
        await kv.removeItemAsync(key);
        return;
      }
    } catch {
      delete memoryStore[key];
    }
  } catch {
    delete memoryStore[key];
  }
};
