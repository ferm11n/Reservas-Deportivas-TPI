import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Usuario } from '../tipos';
import { obtenerSesionActual, cerrarSesion, autenticarConBiometria, refrescarUsuario } from '../servicios/auth';
import { eliminarDispositivoPush, registrarDispositivoPush } from '../servicios/notificaciones';
import { useNetwork } from './NetworkContext';

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  actualizarUsuario: (u: Usuario | null, token?: string | null) => void;
  logout: () => Promise<void>;
  verificarBiometria: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  token: null,
  cargando: true,
  actualizarUsuario: () => {},
  logout: async () => {},
  verificarBiometria: async () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const { conectado } = useNetwork();
  const registroPushEnCurso = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let activa = true;
    void obtenerSesionActual().then(async ({ usuario: u, token: t }) => {
      if (!activa) return;
      setUsuario(u);
      setToken(t);
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

  const actualizarUsuario = (u: Usuario | null, t?: string | null) => {
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
  };

  const verificarBiometria = async (): Promise<boolean> => {
    const res = await autenticarConBiometria();
    return res.exito;
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        cargando,
        actualizarUsuario,
        logout,
        verificarBiometria,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
