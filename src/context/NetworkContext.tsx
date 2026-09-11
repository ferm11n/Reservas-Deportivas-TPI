import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    comprobarConexion();
    const interval = setInterval(comprobarConexion, 10000);
    return () => clearInterval(interval);
  }, []);

  const comprobarConexion = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setConectado(online);
      return online;
    }

    try {
      const Network = require('expo-network');
      const state = await Network.getNetworkStateAsync();
      const estaConectado = Boolean(state.isConnected && state.isInternetReachable);
      setConectado(estaConectado);
      return estaConectado;
    } catch {
      setConectado(true);
      return true;
    }
  };

  return (
    <NetworkContext.Provider value={{ conectado, comprobarConexion }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
