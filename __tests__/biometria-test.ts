import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { autenticarConBiometria, reingresarConClave } from '../src/servicios/auth';
import * as secureStore from '../src/bd/secureStore';
import { pedir } from '../src/servicios/api';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

jest.mock('../src/bd/secureStore', () => ({
  guardarTokenEnSecureStore: jest.fn(),
  guardarUsuarioEnSecureStore: jest.fn(),
  obtenerTokenDeSecureStore: jest.fn(),
  obtenerUsuarioDeSecureStore: jest.fn(),
  eliminarTokenDeSecureStore: jest.fn(),
}));

jest.mock('../src/bd/sqlite', () => ({
  borrarReservasOffline: jest.fn(),
}));

jest.mock('../src/servicios/api', () => ({
  pedir: jest.fn(),
}));

const mockHardware = LocalAuthentication.hasHardwareAsync as jest.Mock;
const mockEnrolled = LocalAuthentication.isEnrolledAsync as jest.Mock;
const mockAuthenticate = LocalAuthentication.authenticateAsync as jest.Mock;
const mockObtenerToken = secureStore.obtenerTokenDeSecureStore as jest.Mock;
const mockObtenerUsuario = secureStore.obtenerUsuarioDeSecureStore as jest.Mock;
const mockGuardarToken = secureStore.guardarTokenEnSecureStore as jest.Mock;
const mockGuardarUsuario = secureStore.guardarUsuarioEnSecureStore as jest.Mock;
const mockPedir = pedir as jest.Mock;

describe('autenticarConBiometria', () => {
  const osOriginal = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'android';
  });

  afterAll(() => {
    (Platform as { OS: string }).OS = osOriginal;
  });

  it('devuelve disponible=false en web', async () => {
    (Platform as { OS: string }).OS = 'web';
    const res = await autenticarConBiometria();
    expect(res.exito).toBe(false);
    expect(res.disponible).toBe(false);
    expect(mockHardware).not.toHaveBeenCalled();
  });

  it('devuelve disponible=false si el dispositivo no tiene sensor biométrico', async () => {
    mockHardware.mockResolvedValue(false);
    const res = await autenticarConBiometria();
    expect(res).toEqual({
      exito: false,
      disponible: false,
      mensaje: 'Este teléfono no tiene sensor biométrico.',
    });
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('devuelve disponible=false si no hay huellas ni rostros cargados', async () => {
    mockHardware.mockResolvedValue(true);
    mockEnrolled.mockResolvedValue(false);
    const res = await autenticarConBiometria();
    expect(res).toEqual({
      exito: false,
      disponible: false,
      mensaje: 'No hay huellas ni rostros registrados en el teléfono.',
    });
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('devuelve exito=true cuando la huella o rostro se verifica bien', async () => {
    mockHardware.mockResolvedValue(true);
    mockEnrolled.mockResolvedValue(true);
    mockAuthenticate.mockResolvedValue({ success: true });
    const res = await autenticarConBiometria();
    expect(res).toEqual({
      exito: true,
      disponible: true,
      mensaje: 'Identidad verificada.',
    });
  });

  it('devuelve exito=false y disponible=true cuando el usuario cancela o falla', async () => {
    mockHardware.mockResolvedValue(true);
    mockEnrolled.mockResolvedValue(true);
    mockAuthenticate.mockResolvedValue({ success: false, error: 'user_cancel' });
    const res = await autenticarConBiometria();
    expect(res).toEqual({
      exito: false,
      disponible: true,
      mensaje: 'No se pudo verificar la identidad.',
    });
  });
});

describe('reingresarConClave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve NO_AUTENTICADO si no hay sesión guardada', async () => {
    mockObtenerToken.mockResolvedValue(null);
    mockObtenerUsuario.mockResolvedValue(null);
    const res = await reingresarConClave('villaguay2026');
    expect(res).toEqual({
      error: { codigo: 'NO_AUTENTICADO', mensaje: 'Tenés que ingresar con tu cuenta.' },
    });
    expect(mockPedir).not.toHaveBeenCalled();
  });

  it('valida con el email de la sesión actual y guarda el nuevo token', async () => {
    const usuarioGuardado = {
      id: 'usr-02',
      nombre: 'Marcelo',
      email: 'marcelo@villaguay.demo.ar',
      telefono: '3455-000111',
      rol: 'encargado',
      espaciosFavoritos: [],
      cancelacionesTardias: 0,
      ausencias: 0,
    };
    mockObtenerToken.mockResolvedValue('token-viejo');
    mockObtenerUsuario.mockResolvedValue(JSON.stringify(usuarioGuardado));
    mockPedir.mockResolvedValue({
      datos: { token: 'token-nuevo', usuario: usuarioGuardado },
    });

    const res = await reingresarConClave('villaguay2026');

    expect(mockPedir).toHaveBeenCalledWith('/auth/ingreso', {
      metodo: 'POST',
      cuerpo: { email: 'marcelo@villaguay.demo.ar', contrasena: 'villaguay2026' },
      conSesion: false,
    });
    expect(mockGuardarToken).toHaveBeenCalledWith('token-nuevo');
    expect(mockGuardarUsuario).toHaveBeenCalled();
    expect('datos' in res && res.datos.token).toBe('token-nuevo');
  });
});
