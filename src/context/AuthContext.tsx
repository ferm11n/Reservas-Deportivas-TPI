import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario } from '../tipos';
import { obtenerSesionActual, cerrarSesion, autenticarConBiometria, refrescarUsuario } from '../servicios/auth';

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

  useEffect(() => {
    cargarSesion();
  }, []);

  const cargarSesion = async () => {
    setCargando(true);
    const { usuario: u, token: t } = await obtenerSesionActual();
    setUsuario(u);
    setToken(t);
    setCargando(false);
    if (u && t) {
      const actualizado = await refrescarUsuario();
      if ('datos' in actualizado) setUsuario(actualizado.datos);
    }
  };

  const actualizarUsuario = (u: Usuario | null, t?: string | null) => {
    setUsuario(u);
    if (t !== undefined) setToken(t);
  };

  const logout = async () => {
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
