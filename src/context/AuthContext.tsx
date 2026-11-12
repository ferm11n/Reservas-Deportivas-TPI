import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { Usuario } from '../tipos';
import { obtenerSesionActual, cerrarSesion, autenticarConBiometria, refrescarUsuario } from '../servicios/auth';
import { eliminarDispositivoPush, registrarDispositivoPush } from '../servicios/notificaciones';
import { registrarManejadorSesionExpirada } from '../servicios/api';
import { eliminarTokenDeSecureStore } from '../bd/secureStore';
import { useNetwork } from './NetworkContext';

export interface ResultadoBiometria {
  exito: boolean;
  disponible: boolean;
  mensaje: string;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  requiereReingreso: boolean;
  actualizarUsuario: (u: Usuario | null, token?: string | null) => void;
  completarReingreso: () => void;
  logout: () => Promise<void>;
  verificarBiometria: () => Promise<ResultadoBiometria>;
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  token: null,
  cargando: true,
  requiereReingreso: false,
  actualizarUsuario: () => {},
  completarReingreso: () => {},
  logout: async () => {},
  verificarBiometria: async () => ({
    exito: false,
    disponible: false,
    mensaje: 'Contexto de autenticación no inicializado.',
  }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [requiereReingreso, setRequiereReingreso] = useState(false);
  const { conectado } = useNetwork();
  const registroPushEnCurso = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let activa = true;
    void obtenerSesionActual().then(async ({ usuario: u, token: t }) => {
      if (!activa) return;
      setUsuario(u);
      setToken(t);
      if (u && t) setRequiereReingreso(true);
      setCargando(false);
      if (u && t) {
        const actualizado = await refrescarUsuario();
        if (activa && 'datos' in actualizado) setUsuario(actualizado.datos);
      }
    });
    return () => {
      activa = false;
    };
  }, []);

  useEffect(() => {
    if (!cargando && usuario?.id && conectado) {
      const registroAnterior = registroPushEnCurso.current;
      const registro = registroAnterior
        ? registroAnterior.catch(() => undefined).then(registrarDispositivoPush)
        : registrarDispositivoPush();
      registroPushEnCurso.current = registro;
      void registro
        .catch((error: unknown) => {
          console.warn('No se pudo registrar el dispositivo para notificaciones:', error);
        })
        .finally(() => {
          if (registroPushEnCurso.current === registro) {
            registroPushEnCurso.current = null;
          }
        });
    }
  }, [cargando, conectado, usuario?.id]);

  const expiracionAvisada = useRef(false);

  useEffect(() => {
    registrarManejadorSesionExpirada(() => {
      // Solo se borra el token: las reservas offline (QR) se conservan.
      void eliminarTokenDeSecureStore().catch(() => undefined);
      setUsuario(null);
      setToken(null);
      setRequiereReingreso(false);
      // Varias llamadas en vuelo pueden recibir 401 a la vez: un solo aviso.
      if (!expiracionAvisada.current) {
        expiracionAvisada.current = true;
        Alert.alert('Sesión expirada', 'Tu sesión venció. Iniciá sesión de nuevo para continuar.');
      }
    });
    return () => registrarManejadorSesionExpirada(null);
  }, []);

  const actualizarUsuario = (u: Usuario | null, t?: string | null) => {
    if (u) expiracionAvisada.current = false;
    if (!u || t) setRequiereReingreso(false);
    setUsuario(u);
    if (t !== undefined) setToken(t);
  };

  const logout = async () => {
    const registroPendiente = registroPushEnCurso.current;
    if (registroPendiente) {
      try {
        await registroPendiente;
      } catch (error: unknown) {
        console.warn('El registro push seguía pendiente al cerrar sesión:', error);
      }
    }
    try {
      await eliminarDispositivoPush();
    } catch (error: unknown) {
      console.warn('No se pudo dar de baja el dispositivo antes de cerrar sesión:', error);
    }
    await cerrarSesion();
    setUsuario(null);
    setToken(null);
    setRequiereReingreso(false);
  };

  const completarReingreso = useCallback(() => {
    setRequiereReingreso(false);
  }, []);

  const verificarBiometria = useCallback((): Promise<ResultadoBiometria> => {
    return autenticarConBiometria();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        cargando,
        requiereReingreso,
        actualizarUsuario,
        completarReingreso,
        logout,
        verificarBiometria,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
