import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario, Rol } from '../tipos';
import { obtenerSesionActual, cerrarSesion, cambiarRolPruebas, autenticarConBiometria } from '../servicios/auth';

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  actualizarUsuario: (u: Usuario | null, token?: string | null) => void;
  logout: () => Promise<void>;
  cambiarRol: (rol: Rol) => Promise<void>;
  verificarBiometria: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  token: null,
  cargando: true,
  actualizarUsuario: () => {},
  logout: async () => {},
  cambiarRol: async () => {},
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

  const cambiarRol = async (nuevoRol: Rol) => {
    const usuarioActualizado = await cambiarRolPruebas(nuevoRol);
    if (usuarioActualizado) {
      setUsuario({ ...usuarioActualizado });
    }
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
        cambiarRol,
        verificarBiometria,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
