import {
  Espacio,
  Deporte,
  Turno,
  Reserva,
  ReservaFija,
  RespuestaApi,
  EstadoTurno,
} from '../tipos';
import {
  MOCK_ESPACIOS,
  MOCK_DEPORTES,
  MOCK_RESERVAS_FIJAS,
  MOCK_RESERVAS_INICIALES,
  MOCK_USUARIOS,
} from '../mocks';
import { guardarReservaOffline, obtenerReservasOffline, obtenerReservaPorQrOffline } from '../bd/sqlite';

// Simulación de almacenamiento mutable en memoria
let espaciosStore: Espacio[] = [...MOCK_ESPACIOS];
let reservasFijasStore: ReservaFija[] = [...MOCK_RESERVAS_FIJAS];
let bloqueosMantenimientoStore: { espacioId: string; fecha: string; inicio: string; fin: string; motivo: string }[] = [
  { espacioId: 'esp-03', fecha: new Date().toISOString().split('T')[0], inicio: '08:00', fin: '14:00', motivo: 'Mantenimiento de césped por lluvia' },
];

const delay = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const obtenerEspacios = async (): Promise<RespuestaApi<Espacio[]>> => {
  await delay();
  return {
    datos: espaciosStore,
    meta: { total: espaciosStore.length, pagina: 1, porPagina: 20 },
  };
};

export const obtenerEspacioPorId = async (id: string): Promise<RespuestaApi<Espacio>> => {
  await delay();
  const espacio = espaciosStore.find((e) => e.id === id);
  if (!espacio) {
    return {
      error: { codigo: 'ESPACIO_NO_ENCONTRADO', mensaje: 'El espacio deportivo solicitado no existe.' },
    };
  }
  return { datos: espacio };
};

export const obtenerDeportes = async (): Promise<RespuestaApi<Deporte[]>> => {
  await delay();
  return { datos: MOCK_DEPORTES };
};

/**
 * LÓGICA CRUCIAL DE GRILLA:
 * Genera franjas horarias de 1h entre las 08:00 y 24:00 hs.
 * Cruza reservas fijas semanales, reservas confirmadas individuales y mantenimientos.
 */
export const obtenerGrillaTurnos = async (
  espacioId: string,
  fecha: string // "AAAA-MM-DD"
): Promise<RespuestaApi<Turno[]>> => {
  await delay();
  const espacio = espaciosStore.find((e) => e.id === espacioId);
  if (!espacio) {
    return { error: { codigo: 'ESPACIO_NO_ENCONTRADO', mensaje: 'Espacio no encontrado.' } };
  }

  const fechaObj = new Date(fecha + 'T00:00:00');
  const diaSemana = fechaObj.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Domingo
  const ahora = new Date();
  const hoyStr = ahora.toISOString().split('T')[0];
  const horaActual = ahora.getHours();

  // Obtener reservas activas para este espacio y fecha
  const reservasLocal = await obtenerReservasOffline('usr-207');
  const todasLasReservas = [...MOCK_RESERVAS_INICIALES, ...reservasLocal];

  const turnos: Turno[] = [];

  for (let hora = 8; hora < 24; hora++) {
    const inicioStr = `${hora.toString().padStart(2, '0')}:00`;
    const finStr = `${(hora + 1).toString().padStart(2, '0')}:00`;
    const turnoId = `tur-${espacioId}-${fecha}-${hora}`;

    let estado: EstadoTurno = 'libre';
    let reservaId: string | null = null;
    let motivoBloqueo: string | null = null;

    // 1. Verificación de iluminación para espacios sin luz
    if (!espacio.iluminacion && hora >= 20) {
      estado = 'mantenimiento';
      motivoBloqueo = 'Sin iluminación nocturna disponible';
    }

    // 2. Verificación de mantenimientos manuales
    const bloqueo = bloqueosMantenimientoStore.find(
      (b) => b.espacioId === espacioId && b.fecha === fecha && b.inicio <= inicioStr && b.fin > inicioStr
    );
    if (bloqueo) {
      estado = 'mantenimiento';
      motivoBloqueo = bloqueo.motivo;
    }

    // 3. Verificación de reservas fijas semanales (si no hay mantenimiento)
    if (estado === 'libre') {
      const fija = reservasFijasStore.find(
        (f) =>
          f.espacioId === espacioId &&
          f.activa &&
          f.dia === diaSemana &&
          f.inicio <= inicioStr &&
          f.fin > inicioStr &&
          f.desde <= fecha &&
          (!f.hasta || f.hasta >= fecha)
      );
      if (fija) {
        estado = 'fijo';
        motivoBloqueo = `Reservado: ${fija.titular}`;
      }
    }

    // 4. Verificación de reservas de usuarios individuales
    if (estado === 'libre') {
      const res = todasLasReservas.find(
        (r) =>
          r.espacioId === espacioId &&
          r.estado === 'confirmada' &&
          r.creadaEn.startsWith(fecha) || r.codigoQr.includes(fecha.replace(/-/g, '').slice(4))
      );
      if (res && res.turnoId.endsWith(`-${hora}`)) {
        estado = 'reservado';
        reservaId = res.id;
      }
    }

    // 5. Horarios pasados del día de hoy
    if (fecha === hoyStr && hora <= horaActual && estado === 'libre') {
      estado = 'mantenimiento';
      motivoBloqueo = 'Turno ya finalizado';
    }

    turnos.push({
      id: turnoId,
      espacioId,
      fecha,
      inicio: inicioStr,
      fin: finStr,
      estado,
      reservaId,
      motivoBloqueo,
      precio: espacio.precioPorHora,
    });
  }

  return { datos: turnos };
};

/**
 * Crear nueva reserva individual con validación de máx. 3 reservas activas.
 */
export const crearReserva = async (
  turnoId: string,
  espacioId: string,
  usuarioId: string,
  cantidadPersonas: number
): Promise<RespuestaApi<Reserva>> => {
  await delay();

  // Validar máximo 3 reservas activas
  const reservasExistentes = await obtenerReservasOffline(usuarioId);
  const reservassActivas = reservasExistentes.filter((r) => r.estado === 'confirmada');
  if (reservassActivas.length >= 3) {
    return {
      error: {
        codigo: 'LIMITE_RESERVAS_ALCANZADO',
        mensaje: 'Ya posees 3 reservas activas. Cancelá alguna para poder reservar un nuevo turno.',
      },
    };
  }

  const idNum = Math.floor(1000 + Math.random() * 9000);
  const fechaActual = new Date();
  const cancelableHasta = new Date(fechaActual.getTime() + 4 * 3600000).toISOString();
  const codigoQr = `VGY-${idNum}-${espacioId.replace('esp-', '')}-${Date.now().toString().slice(-4)}`;

  const nuevaReserva: Reserva = {
    id: `res-${idNum}`,
    turnoId,
    espacioId,
    usuarioId,
    cantidadPersonas,
    codigoQr,
    estado: 'confirmada',
    ingresoEn: null,
    creadaEn: fechaActual.toISOString(),
    cancelableHasta,
  };

  await guardarReservaOffline(nuevaReserva);

  return { datos: nuevaReserva };
};

/**
 * Cancelar reserva individual con registro de cancelación tardía (< 4hs)
 */
export const cancelarReserva = async (reservaId: string): Promise<RespuestaApi<Reserva>> => {
  await delay();
  const reservasLocal = await obtenerReservasOffline('usr-207');
  const reserva = [...MOCK_RESERVAS_INICIALES, ...reservasLocal].find((r) => r.id === reservaId);

  if (!reserva) {
    return { error: { codigo: 'RESERVA_NO_ENCONTRADA', mensaje: 'No se encontró la reserva.' } };
  }

  reserva.estado = 'cancelada';

  // Verificar si es cancelación tardía
  const horasRestantes = (new Date(reserva.cancelableHasta).getTime() - Date.now()) / 3600000;
  if (horasRestantes < 0) {
    const usr = MOCK_USUARIOS.find((u) => u.id === reserva.usuarioId);
    if (usr) usr.cancelacionesTardias += 1;
  }

  await guardarReservaOffline(reserva);
  return { datos: reserva };
};

/**
 * Escaneo de QR por parte del Encargado en la puerta
 */
export const escanearQrReserva = async (
  codigoQr: string,
  espacioIdActual: string
): Promise<RespuestaApi<Reserva>> => {
  await delay();
  let reserva = await obtenerReservaPorQrOffline(codigoQr);

  if (!reserva) {
    // Buscar en mock
    reserva = MOCK_RESERVAS_INICIALES.find((r) => r.codigoQr === codigoQr) || null;
  }

  if (!reserva) {
    return {
      error: {
        codigo: 'QR_INVALIDO',
        mensaje: 'El código QR no corresponde a ninguna reserva registrada.',
      },
    };
  }

  if (reserva.espacioId !== espacioIdActual && espacioIdActual !== 'todos') {
    return {
      error: {
        codigo: 'CANCHA_INCORRECTA',
        mensaje: 'Esta reserva pertenece a otra cancha o complejo deportivo.',
      },
    };
  }

  if (reserva.estado === 'cumplida') {
    return {
      error: {
        codigo: 'QR_YA_UTILIZADO',
        mensaje: `Esta reserva ya fue validada el ${new Date(reserva.ingresoEn!).toLocaleTimeString()}.`,
      },
    };
  }

  if (reserva.estado === 'cancelada') {
    return {
      error: {
        codigo: 'RESERVA_CANCELADA',
        mensaje: 'Esta reserva figura como CANCELADA por el usuario.',
      },
    };
  }

  // Validar y marcar como ingresado
  reserva.estado = 'cumplida';
  reserva.ingresoEn = new Date().toISOString();
  await guardarReservaOffline(reserva);

  return { datos: reserva };
};

export const bloquearTurno = async (
  espacioId: string,
  fecha: string,
  inicio: string,
  fin: string,
  motivo: string
): Promise<RespuestaApi<{ ok: boolean }>> => {
  await delay();
  bloqueosMantenimientoStore.push({ espacioId, fecha, inicio, fin, motivo });
  return { datos: { ok: true } };
};

export const crearReservaFija = async (
  espacioId: string,
  titular: string,
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  inicio: string,
  fin: string
): Promise<RespuestaApi<ReservaFija>> => {
  await delay();
  const nuevaFija: ReservaFija = {
    id: `fij-${Math.floor(10 + Math.random() * 90)}`,
    espacioId,
    titular,
    dia,
    inicio,
    fin,
    desde: new Date().toISOString().split('T')[0],
    hasta: null,
    activa: true,
  };
  reservasFijasStore.push(nuevaFija);
  return { datos: nuevaFija };
};

export const actualizarPrecioEspacio = async (
  espacioId: string,
  nuevoPrecio: number
): Promise<RespuestaApi<Espacio>> => {
  await delay();
  const espacio = espaciosStore.find((e) => e.id === espacioId);
  if (!espacio) {
    return { error: { codigo: 'NO_ENCONTRADO', mensaje: 'Espacio no encontrado.' } };
  }
  espacio.precioPorHora = nuevoPrecio;
  return { datos: espacio };
};
