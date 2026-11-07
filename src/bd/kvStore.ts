import { Platform } from 'react-native';

// Respaldo en memoria para web sin localStorage o si el módulo nativo falla.
const memoryStore: Record<string, string> = {};

type KVStore = (typeof import('expo-sqlite/kv-store'))['default'];

const obtenerStore = (): KVStore | null => {
  if (Platform.OS === 'web') return null;
  try {
    // expo-sqlite es nativo: se carga recién después del guard de plataforma.
    // El módulo exporta la instancia como default (AsyncStorage de SQLiteStorage).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const modulo = require('expo-sqlite/kv-store') as typeof import('expo-sqlite/kv-store');
    return modulo.default ?? null;
  } catch {
    return null;
  }
};

export const setKVItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryStore[key] = value;
    }
    return;
  }

  const store = obtenerStore();
  if (!store) {
    memoryStore[key] = value;
    return;
  }
  try {
    await store.setItemAsync(key, value);
  } catch {
    memoryStore[key] = value;
  }
};

export const getKVItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStore[key] ?? null;
    }
  }

  const store = obtenerStore();
  if (!store) {
    return memoryStore[key] ?? null;
  }
  try {
    return await store.getItemAsync(key);
  } catch {
    return memoryStore[key] ?? null;
  }
};

export const removeKVItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      delete memoryStore[key];
    }
    return;
  }

  const store = obtenerStore();
  if (!store) {
    delete memoryStore[key];
    return;
  }
  try {
    await store.removeItemAsync(key);
  } catch {
    delete memoryStore[key];
  }
};
