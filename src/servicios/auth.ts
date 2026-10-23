import { Usuario, RespuestaApi, Sesion } from '../tipos';
import { pedir } from './api';
import {
  guardarTokenEnSecureStore,
  guardarUsuarioEnSecureStore,
  obtenerTokenDeSecureStore,
  obtenerUsuarioDeSecureStore,
  eliminarTokenDeSecureStore,
} from '../bd/secureStore';
import { borrarReservasOffline } from '../bd/sqlite';
import { Platform } from 'react-native';

const guardarSesion = async (sesion: Sesion) => {
  await guardarTokenEnSecureStore(sesion.token);
  await guardarUsuarioEnSecureStore(JSON.stringify(sesion.usuario));
};

/** POST /auth/ingreso → { token, usuario }. El token vale 30 días. */
export const iniciarSesion = async (email: string, contrasena: string): Promise<RespuestaApi<Sesion>> => {
  const res = await pedir<Sesion>('/auth/ingreso', {
    metodo: 'POST',
    cuerpo: { email: email.trim(), contrasena },
    conSesion: false,
  });
  if ('datos' in res) await guardarSesion(res.datos);
  return res;
};

/** POST /auth/registro → siempre crea un jugador. El teléfono es obligatorio. */
export const registrarUsuario = async (
  nombre: string,
  email: string,
  contrasena: string,
  telefono: string
): Promise<RespuestaApi<Sesion>> => {
  const res = await pedir<Sesion>('/auth/registro', {
    metodo: 'POST',
    cuerpo: { nombre: nombre.trim(), email: email.trim(), contrasena, telefono: telefono.trim() },
    conSesion: false,
  });
  if ('datos' in res) await guardarSesion(res.datos);
  return res;
};

/** Sesión guardada en el teléfono (sobrevive al cierre de la app y funciona sin señal). */
export const obtenerSesionActual = async (): Promise<{ usuario: Usuario | null; token: string | null }> => {
  const token = await obtenerTokenDeSecureStore();
  const usuarioJson = await obtenerUsuarioDeSecureStore();
  if (!token || !usuarioJson) return { usuario: null, token: null };
  try {
    return { usuario: JSON.parse(usuarioJson) as Usuario, token };
  } catch {
    return { usuario: null, token: null };
  }
};

/** GET /yo → refresca los datos del usuario (favoritos, cancelaciones tardías, ausencias). */
export const refrescarUsuario = async (): Promise<RespuestaApi<Usuario>> => {
  const res = await pedir<Usuario>('/yo');
  if ('datos' in res) await guardarUsuarioEnSecureStore(JSON.stringify(res.datos));
  return res;
};

/** PUT / DELETE /yo/espacios-favoritos/<espacioId> */
export const marcarFavorito = async (espacioId: string, favorito: boolean): Promise<RespuestaApi<Usuario | null>> => {
  if (favorito) {
    const res = await pedir<Usuario>(`/yo/espacios-favoritos/${espacioId}`, { metodo: 'PUT' });
    if ('datos' in res) await guardarUsuarioEnSecureStore(JSON.stringify(res.datos));
    return res;
  }
  const res = await pedir<null>(`/yo/espacios-favoritos/${espacioId}`, { metodo: 'DELETE' });
  if ('datos' in res) await refrescarUsuario();
  return res;
};

export const cerrarSesion = async (): Promise<void> => {
  await eliminarTokenDeSecureStore();
  await borrarReservasOffline();
};

/**
 * Reingreso biométrico (huella / rostro) con expo-local-authentication.
 * Si el teléfono no tiene sensor o no hay huellas cargadas, devuelve disponible=false
 * para que la pantalla ofrezca la alternativa: reingresar con la contraseña.
 */
export const autenticarConBiometria = async (): Promise<{ exito: boolean; disponible: boolean; mensaje: string }> => {
  if (Platform.OS === 'web') {
    return { exito: false, disponible: false, mensaje: 'La biometría no está disponible en web.' };
  }
  try {
    const LocalAuthentication = require('expo-local-authentication');
    const tieneHardware = await LocalAuthentication.hasHardwareAsync();
    const estaEnrolado = tieneHardware && (await LocalAuthentication.isEnrolledAsync());
    if (!tieneHardware || !estaEnrolado) {
      return {
        exito: false,
        disponible: false,
        mensaje: !tieneHardware
          ? 'Este teléfono no tiene sensor biométrico.'
          : 'No hay huellas ni rostros registrados en el teléfono.',
      };
    }
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirmá tu identidad',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    return {
      exito: !!resultado.success,
      disponible: true,
      mensaje: resultado.success ? 'Identidad verificada.' : 'No se pudo verificar la identidad.',
    };
  } catch (error) {
    console.error('Error en autenticación biométrica:', error);
    return { exito: false, disponible: false, mensaje: 'No se pudo acceder al sensor biométrico.' };
  }
};

/** Alternativa a la biometría: reingresar con la contraseña de la cuenta actual. */
export const reingresarConClave = async (contrasena: string): Promise<RespuestaApi<Sesion>> => {
  const { usuario } = await obtenerSesionActual();
  if (!usuario) return { error: { codigo: 'NO_AUTENTICADO', mensaje: 'Tenés que ingresar con tu cuenta.' } };
  return iniciarSesion(usuario.email, contrasena);
};
