import {
  Espacio,
  Deporte,
  Turno,
  Reserva,
  ReservaFija,
  Usuario,
  Bloqueo,
  ArchivoSubido,
  RespuestaApi,
} from '../tipos';
import { pedir, esErrorDeRed, leerIdDeTurno } from './api';
import {
  guardarReservaOffline,
  guardarReservasOffline,
  obtenerReservasOffline,
  guardarEnCache,
  leerDeCache,
} from '../bd/sqlite';
import { File } from 'expo-file-system';

/**
 * Capa de servicios de la app. Ninguna pantalla habla con la API ni con SQLite directo:
 * todo pasa por acá. Cuando no hay señal, las lecturas caen a lo último guardado en SQLite.
 */

// ===================== Catálogo (público, sin cuenta) =====================

export interface FiltrosEspacios {
  deporteId?: string;
  complejo?: string;
  iluminacion?: boolean;
  techado?: boolean;
}

export const obtenerEspacios = async (filtros: FiltrosEspacios = {}): Promise<RespuestaApi<Espacio[]>> => {
  const res = await pedir<Espacio[]>('/espacios', { query: { ...filtros, porPagina: 100 }, conSesion: false });
  const sinFiltros = Object.keys(filtros).length === 0;

  if ('datos' in res) {
    if (sinFiltros) await guardarEnCache('espacios', res.datos);
    return res;
  }
  if (esErrorDeRed(res)) {
    const guardados = await leerDeCache<Espacio[]>('espacios');
    if (guardados) {
      const filtrados = guardados.filter(
        (e) =>
          (!filtros.deporteId || e.deporteId === filtros.deporteId) &&
          (!filtros.complejo || e.complejo === filtros.complejo) &&
          (filtros.iluminacion === undefined || e.iluminacion === filtros.iluminacion) &&
          (filtros.techado === undefined || e.techado === filtros.techado)
      );
      return { datos: filtrados };
    }
  }
  return res;
};

export const obtenerEspacioPorId = async (id: string): Promise<RespuestaApi<Espacio>> => {
  const res = await pedir<Espacio>(`/espacios/${id}`, { conSesion: false });
  if (esErrorDeRed(res)) {
    const guardados = await leerDeCache<Espacio[]>('espacios');
    const espacio = guardados?.find((e) => e.id === id);
    if (espacio) return { datos: espacio };
  }
  return res;
};

export const obtenerDeportes = async (): Promise<RespuestaApi<Deporte[]>> => {
  const res = await pedir<Deporte[]>('/deportes', { query: { porPagina: 100 }, conSesion: false });
  if ('datos' in res) {
    await guardarEnCache('deportes', res.datos);
    return res;
  }
  if (esErrorDeRed(res)) {
    const guardados = await leerDeCache<Deporte[]>('deportes');
    if (guardados) return { datos: guardados };
  }
  return res;
};

/**
 * Grilla de un día: la arma la API cruzando reservas, reservas fijas y bloqueos.
 * Devuelve los 16 turnos de 08:00 a 24:00 con estado libre / reservado / fijo / mantenimiento.
 */
export const obtenerGrillaTurnos = async (espacioId: string, fecha: string): Promise<RespuestaApi<Turno[]>> => {
  const clave = `turnos:${espacioId}:${fecha}`;
  const res = await pedir<Turno[]>(`/espacios/${espacioId}/turnos`, { query: { fecha }, conSesion: false });
  if ('datos' in res) {
    await guardarEnCache(clave, res.datos);
    return res;
  }
  if (esErrorDeRed(res)) {
    const guardados = await leerDeCache<Turno[]>(clave);
    if (guardados) return { datos: guardados };
  }
  return res;
};

// ===================== Reservas del jugador =====================

/** POST /reservas. Si ya la tenía (reintento por mala señal) la API devuelve la misma. */
export const crearReserva = async (turnoId: string, cantidadPersonas: number): Promise<RespuestaApi<Reserva>> => {
  const res = await pedir<Reserva>('/reservas', { metodo: 'POST', cuerpo: { turnoId, cantidadPersonas } });
  if ('datos' in res) await guardarReservaOffline(res.datos);
  return res;
};

/** ¿La reserva es de un turno que ya terminó? (por el id del turno) */
export const turnoYaPaso = (reserva: Reserva): boolean => {
  const t = leerIdDeTurno(reserva.turnoId);
  if (!t) return false;
  const fin = t.fin === '24:00' ? `${t.fecha}T23:59:59` : `${t.fecha}T${t.fin}:00`;
  return new Date(fin).getTime() < Date.now();
};

/**
 * GET /yo/reservas?cuando=proximas|pasadas. Lo que llega se guarda en SQLite;
 * sin señal se devuelve lo guardado (así el QR se ve en la puerta de la cancha).
 */
export const obtenerMisReservas = async (
  usuarioId: string,
  cuando: 'proximas' | 'pasadas'
): Promise<RespuestaApi<Reserva[]> & { offline?: boolean }> => {
  const res = await pedir<Reserva[]>('/yo/reservas', { query: { cuando, porPagina: 100 } });
  if ('datos' in res) {
    await guardarReservasOffline(res.datos);
    return res;
  }
  if (esErrorDeRed(res)) {
    const guardadas = await obtenerReservasOffline(usuarioId);
    const filtradas = guardadas.filter((r) =>
      cuando === 'proximas' ? r.estado === 'confirmada' && !turnoYaPaso(r) : r.estado !== 'confirmada' || turnoYaPaso(r)
    );
    return { datos: filtradas, offline: true };
  }
  return res;
};

/** GET /reservas/<id>, con respaldo offline. */
export const obtenerReserva = async (id: string, usuarioId?: string): Promise<RespuestaApi<Reserva>> => {
  const res = await pedir<Reserva>(`/reservas/${id}`);
  if ('datos' in res) {
    if (!usuarioId || res.datos.usuarioId === usuarioId) await guardarReservaOffline(res.datos);
    return res;
  }
  if (esErrorDeRed(res) && usuarioId) {
    const guardada = (await obtenerReservasOffline(usuarioId)).find((r) => r.id === id);
    if (guardada) return { datos: guardada };
  }
  return res;
};

/** POST /reservas/<id>/cancelacion. Fuera de plazo la API responde CANCELACION_FUERA_DE_PLAZO. */
export const cancelarReserva = async (reservaId: string): Promise<RespuestaApi<Reserva>> => {
  const res = await pedir<Reserva>(`/reservas/${reservaId}/cancelacion`, { metodo: 'POST' });
  if ('datos' in res) await guardarReservaOffline(res.datos);
  return res;
};

// ===================== Encargado / administrador =====================

/** POST /ingresos: el encargado escanea el QR en la puerta de una cancha concreta. */
export const registrarIngreso = async (codigoQr: string, espacioId: string): Promise<RespuestaApi<Reserva>> =>
  pedir<Reserva>('/ingresos', { metodo: 'POST', cuerpo: { codigoQr: codigoQr.trim(), espacioId } });

/** POST /reservas/<id>/ausente: "no se presentó" (desde 15 min después del inicio). */
export const marcarAusente = async (reservaId: string): Promise<RespuestaApi<Reserva>> =>
  pedir<Reserva>(`/reservas/${reservaId}/ausente`, { metodo: 'POST' });

/** GET /agenda?fecha=: los turnos de todos los espacios activos en el día. */
export const obtenerAgenda = async (fecha: string): Promise<RespuestaApi<Turno[]>> =>
  pedir<Turno[]>('/agenda', { query: { fecha, porPagina: 500 } });

/** GET /reservas: reservas de todos (para saber quién tiene cada turno). */
export const obtenerReservasDeTodos = async (filtros: {
  fecha?: string;
  espacioId?: string;
  estado?: string;
}): Promise<RespuestaApi<Reserva[]>> => pedir<Reserva[]>('/reservas', { query: { ...filtros, porPagina: 100 } });

/** GET /usuarios/<id>: el usuario con su teléfono, para avisarle. */
export const obtenerUsuario = async (id: string): Promise<RespuestaApi<Usuario>> => pedir<Usuario>(`/usuarios/${id}`);

/** POST /bloqueos. Sin inicio/fin bloquea el día entero. Cancela reservas confirmadas de esos turnos. */
export const crearBloqueo = async (datos: {
  espacioIds: string[];
  fecha: string;
  inicio?: string | null;
  fin?: string | null;
  motivo: string;
}): Promise<RespuestaApi<Bloqueo[]>> => {
  const cuerpo: Record<string, unknown> = { espacioIds: datos.espacioIds, fecha: datos.fecha, motivo: datos.motivo };
  if (datos.inicio) cuerpo.inicio = datos.inicio;
  if (datos.fin) cuerpo.fin = datos.fin;
  return pedir<Bloqueo[]>('/bloqueos', { metodo: 'POST', cuerpo });
};

export const obtenerBloqueos = async (espacioId?: string): Promise<RespuestaApi<Bloqueo[]>> =>
  pedir<Bloqueo[]>('/bloqueos', { query: { espacioId, porPagina: 100 } });

export const eliminarBloqueo = async (id: string): Promise<RespuestaApi<null>> =>
  pedir<null>(`/bloqueos/${id}`, { metodo: 'DELETE' });

export const obtenerFijas = async (espacioId?: string): Promise<RespuestaApi<ReservaFija[]>> =>
  pedir<ReservaFija[]>('/fijas', { query: { espacioId, activa: true, porPagina: 100 } });

export const crearReservaFija = async (datos: Omit<ReservaFija, 'id' | 'activa'>): Promise<RespuestaApi<ReservaFija>> =>
  pedir<ReservaFija>('/fijas', { metodo: 'POST', cuerpo: datos });

export const editarReservaFija = async (
  id: string,
  cambios: Partial<Omit<ReservaFija, 'id'>>
): Promise<RespuestaApi<ReservaFija>> => pedir<ReservaFija>(`/fijas/${id}`, { metodo: 'PATCH', cuerpo: cambios });

export const bajaReservaFija = async (id: string): Promise<RespuestaApi<null>> =>
  pedir<null>(`/fijas/${id}`, { metodo: 'DELETE' });

/** PATCH /espacios/<id> { precioPorHora } (sólo administrador). */
export const actualizarPrecioEspacio = async (espacioId: string, precioPorHora: number): Promise<RespuestaApi<Espacio>> =>
  pedir<Espacio>(`/espacios/${espacioId}`, { metodo: 'PATCH', cuerpo: { precioPorHora: Math.round(precioPorHora) } });

// ===================== Archivos =====================

/** POST /archivos (multipart, campo "archivo"). Devuelve la URL pública del archivo. */
export const subirArchivo = async (uri: string, nombre: string, mime: string): Promise<RespuestaApi<ArchivoSubido>> => {
  const form = new FormData();
  form.append('archivo', new File(uri), nombre);
  return pedir<ArchivoSubido>('/archivos', { metodo: 'POST', formData: form });
};
