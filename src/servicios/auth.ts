import { Usuario, RespuestaApi, Rol } from '../tipos';
import { MOCK_USUARIOS } from '../mocks';
import {
  guardarTokenEnSecureStore,
  guardarUsuarioEnSecureStore,
  obtenerTokenDeSecureStore,
  obtenerUsuarioDeSecureStore,
  eliminarTokenDeSecureStore,
} from '../bd/secureStore';
import { Platform } from 'react-native';

const delay = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const iniciarSesion = async (
  email: string,
  _clave: string
): Promise<RespuestaApi<{ usuario: Usuario; token: string }>> => {
  await delay();
  const usuario = MOCK_USUARIOS.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!usuario) {
    return {
      error: {
        codigo: 'CREDENCIALES_INVALIDAS',
        mensaje: 'El correo electrónico o la contraseña ingresados no son correctos.',
      },
    };
  }

  const token = `vgy_token_${usuario.id}_${Date.now()}`;
  const usuarioJson = JSON.stringify(usuario);

  await guardarTokenEnSecureStore(token);
  await guardarUsuarioEnSecureStore(usuarioJson);

  return { datos: { usuario, token } };
};

export const registrarUsuario = async (
  nombre: string,
  email: string,
  telefono: string
): Promise<RespuestaApi<{ usuario: Usuario; token: string }>> => {
  await delay();
  const existe = MOCK_USUARIOS.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (existe) {
    return {
      error: {
        codigo: 'EMAIL_REGISTRADO',
        mensaje: 'Ya existe una cuenta vinculada a este correo electrónico.',
      },
    };
  }

  const nuevoUsuario: Usuario = {
    id: `usr-${Math.floor(200 + Math.random() * 800)}`,
    nombre,
    email,
    telefono,
    rol: 'jugador',
    espaciosFavoritos: [],
    cancelacionesTardias: 0,
    ausencias: 0,
  };

  MOCK_USUARIOS.push(nuevoUsuario);

  const token = `vgy_token_${nuevoUsuario.id}_${Date.now()}`;
  await guardarTokenEnSecureStore(token);
  await guardarUsuarioEnSecureStore(JSON.stringify(nuevoUsuario));

  return { datos: { usuario: nuevoUsuario, token } };
};

export const obtenerSesionActual = async (): Promise<{ usuario: Usuario | null; token: string | null }> => {
  const token = await obtenerTokenDeSecureStore();
  const usuarioJson = await obtenerUsuarioDeSecureStore();

  if (!token || !usuarioJson) {
    return { usuario: null, token: null };
  }

  try {
    const usuario: Usuario = JSON.parse(usuarioJson);
    return { usuario, token };
  } catch {
    return { usuario: null, token: null };
  }
};

export const cambiarRolPruebas = async (nuevoRol: Rol): Promise<Usuario | null> => {
  const { usuario } = await obtenerSesionActual();
  if (!usuario) return null;
  usuario.rol = nuevoRol;
  await guardarUsuarioEnSecureStore(JSON.stringify(usuario));
  return usuario;
};

export const cerrarSesion = async (): Promise<void> => {
  await eliminarTokenDeSecureStore();
};

/**
 * Autenticación Biométrica (Huella / Rostro) con expo-local-authentication
 */
export const autenticarConBiometria = async (): Promise<{ exito: boolean; mensaje: string }> => {
  if (Platform.OS === 'web') {
    return { exito: true, mensaje: 'Biometría simulada con éxito en Web' };
  }

  try {
    const LocalAuthentication = require('expo-local-authentication');
    const tieneHardware = await LocalAuthentication.hasHardwareAsync();
    if (!tieneHardware) {
      return { exito: false, mensaje: 'El dispositivo no posee sensor biométrico.' };
    }

    const estaEnrolado = await LocalAuthentication.isEnrolledAsync();
    if (!estaEnrolado) {
      return { exito: false, mensaje: 'No hay huellas o rostros registrados en el teléfono.' };
    }

    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirmar identidad para reingreso',
      cancelLabel: 'Usar contraseña',
      fallbackLabel: 'Ingresar PIN',
      disableDeviceFallback: false,
    });

    if (resultado.success) {
      return { exito: true, mensaje: 'Autenticación exitosa.' };
    } else {
      return { exito: false, mensaje: 'No se pudo verificar la identidad.' };
    }
  } catch (error) {
    console.error('Error en autenticación biométrica:', error);
    return { exito: false, mensaje: 'Error al acceder a los sensores biométricos.' };
  }
};
