import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

interface NetworkContextType {
  conectado: boolean;
  comprobarConexion: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType>({
  conectado: true,
  comprobarConexion: async () => true,
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conectado, setConectado] = useState(true);

  const comprobarConexion = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setConectado(online);
      return online;
    }

    try {
      // expo-network es nativo: se carga recién después del guard de plataforma.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Network = require('expo-network') as typeof import('expo-network');
      const state = await Network.getNetworkStateAsync();
      const estaConectado = Boolean(state.isConnected && state.isInternetReachable);
      setConectado(estaConectado);
      return estaConectado;
    } catch {
      setConectado(true);
      return true;
    }
  }, []);

  useEffect(() => {
    comprobarConexion();
    const interval = setInterval(comprobarConexion, 10000);
    return () => clearInterval(interval);
  }, [comprobarConexion]);

  return (
    <NetworkContext.Provider value={{ conectado, comprobarConexion }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
