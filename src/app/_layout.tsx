import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { NetworkProvider } from '../context/NetworkContext';
import { BannerOffline } from '../componentes/BannerOffline';
import { inicializarBaseDeDatos } from '../bd/sqlite';

export default function RootLayout() {
  useEffect(() => {
    inicializarBaseDeDatos();
  }, []);

  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <BannerOffline />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#121212' },
              headerTintColor: '#FFFFFF',
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: '#121212' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/login" options={{ title: 'Iniciar Sesión' }} />
            <Stack.Screen name="(auth)/register" options={{ title: 'Crear Cuenta' }} />
            <Stack.Screen name="espacio/[id]" options={{ title: 'Detalle de Cancha' }} />
            <Stack.Screen name="reserva/[id]" options={{ title: 'Mi Reserva' }} />
            <Stack.Screen name="encargado/escaneo" options={{ title: 'Escáner de Ingreso' }} />
            <Stack.Screen name="admin/index" options={{ title: 'Panel Administrador' }} />
          </Stack>
        </AuthProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}
