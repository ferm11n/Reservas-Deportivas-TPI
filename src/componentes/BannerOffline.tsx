import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '../context/NetworkContext';
import { Ionicons } from '@expo/vector-icons';

export const BannerOffline: React.FC = () => {
  const { conectado } = useNetwork();
  // El banner se monta arriba del Stack, sin SafeAreaView: sin este padding
  // queda tapado por la barra de estado o el notch.
  const insets = useSafeAreaInsets();

  if (conectado) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 8 }]}>
      <Ionicons name="cloud-offline-outline" size={18} color="#FFFFFF" style={styles.icon} />
      <Text style={styles.texto}>
        Sin conexión a internet — Modo Offline activo (Tus reservas y QR están guardados)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#D32F2F',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  texto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
