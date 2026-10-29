import { ErrorApi, RespuestaApi, MetaPaginacion } from '../tipos';
import { obtenerTokenDeSecureStore } from '../bd/secureStore';
import axios, { isAxiosError } from 'axios';

/**
 * Cliente HTTP único de la app. Todas las llamadas a la API pasan por acá:
 * - agrega la cabecera Authorization: Bearer <token> (token guardado en expo-secure-store)
 * - desarma el sobre { datos, meta } / { error: { codigo, mensaje } }
 * - convierte fallas de red en un error con código propio para mostrar en pantalla
 */

// Desde el teléfono no sirve localhost: va la IP de la computadora en la red wifi.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.36:3000').replace(/\/$/, '');

const TIEMPO_MAXIMO_MS = 60000;

type Metodo = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface OpcionesPedido {
  metodo?: Metodo;
  cuerpo?: unknown;            // se manda como JSON
  formData?: FormData;         // para POST /archivos
  query?: Record<string, string | number | boolean | null | undefined>;
  conSesion?: boolean;         // default true: manda el token si existe
}

const armarQuery = (query?: OpcionesPedido['query']): string => {
  if (!query) return '';
  const partes = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return partes.length ? `?${partes.join('&')}` : '';
};

export const pedir = async <T>(ruta: string, opciones: OpcionesPedido = {}): Promise<RespuestaApi<T>> => {
  const { metodo = 'GET', cuerpo, formData, query, conSesion = true } = opciones;

  const cabeceras: Record<string, string> = { Accept: 'application/json' };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';

  if (conSesion) {
    const token = await obtenerTokenDeSecureStore();
    if (token) cabeceras.Authorization = `Bearer ${token}`;
  }

  try {
    const respuesta = await axios.request<unknown>({
      url: `${API_URL}${ruta}${armarQuery(query)}`,
      method: metodo,
      headers: cabeceras,
      data: formData ?? cuerpo,
      timeout: TIEMPO_MAXIMO_MS,
    });

    // DELETE exitoso: 204 sin cuerpo
    if (respuesta.status === 204) {
      return { datos: null as T };
    }

    const json = respuesta.data;

    if (!json || typeof json !== 'object') {
      return { error: { codigo: 'RESPUESTA_INVALIDA', mensaje: 'La API respondió algo que no pudimos leer.' } };
    }
    const sobre = json as { datos?: unknown; meta?: unknown; error?: unknown };
    if (sobre.error && typeof sobre.error === 'object') {
      const errorApi = sobre.error as Partial<ErrorApi>;
      if (typeof errorApi.codigo === 'string' && typeof errorApi.mensaje === 'string') {
        return { error: { codigo: errorApi.codigo, mensaje: errorApi.mensaje } };
      }
      return { error: { codigo: 'RESPUESTA_INVALIDA', mensaje: 'La API respondió un error que no pudimos leer.' } };
    }
    if (respuesta.status < 200 || respuesta.status >= 300 || !('datos' in sobre)) {
      return { error: { codigo: 'RESPUESTA_INVALIDA', mensaje: 'La API respondió algo que no pudimos leer.' } };
    }
    return { datos: sobre.datos as T, meta: (sobre.meta ?? undefined) as MetaPaginacion | undefined };
  } catch (error: unknown) {
    if (!isAxiosError(error)) throw error;

    if (error.response) {
      const json: unknown = error.response.data;
      if (json && typeof json === 'object') {
        const sobre = json as { error?: unknown };
        if (sobre.error && typeof sobre.error === 'object') {
          const errorApi = sobre.error as Partial<ErrorApi>;
          if (typeof errorApi.codigo === 'string' && typeof errorApi.mensaje === 'string') {
            return { error: { codigo: errorApi.codigo, mensaje: errorApi.mensaje } };
          }
        }
      }
      return { error: { codigo: 'RESPUESTA_INVALIDA', mensaje: 'La API respondió algo que no pudimos leer.' } };
    }

    const porTiempo = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    return {
      error: {
        codigo: porTiempo ? 'TIEMPO_AGOTADO' : 'ERROR_DE_RED',
        mensaje: porTiempo
          ? 'La API tardó demasiado en responder. Probá de nuevo.'
          : 'No pudimos conectarnos con el servidor. Revisá tu conexión.',
      },
    };
  }
};

/** true si el error se debe a no tener conexión (para caer a los datos guardados). */
export const esErrorDeRed = (res: RespuestaApi<unknown>): boolean =>
  'error' in res && (res.error.codigo === 'ERROR_DE_RED' || res.error.codigo === 'TIEMPO_AGOTADO');

/** Fecha local "AAAA-MM-DD" (toISOString usa UTC y de noche en Argentina da el día siguiente). */
export const fechaLocal = (d: Date = new Date()): string => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/** Lee el id determinístico del turno: tur-<espacioId>-<AAAAMMDD>-<HH>. */
export const leerIdDeTurno = (turnoId: string): { espacioId: string; fecha: string; inicio: string; fin: string } | null => {
  const m = /^tur-(esp-[A-Za-z0-9_-]+)-(\d{4})(\d{2})(\d{2})-(\d{2})$/.exec(turnoId);
  if (!m) return null;
  const hora = Number(m[5]);
  return {
    espacioId: m[1],
    fecha: `${m[2]}-${m[3]}-${m[4]}`,
    inicio: `${m[5]}:00`,
    fin: `${String(hora + 1).padStart(2, '0')}:00`,
  };
};
