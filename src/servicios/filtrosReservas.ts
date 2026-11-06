import { Reserva } from '../tipos';

export type PestaniaReservas = 'proximas' | 'pasadas';

/**
 * Separa "Mis Reservas" según la pestaña activa:
 * - próximas: las confirmadas (tienen QR vigente)
 * - pasadas: cumplidas, canceladas o con ausencia registrada
 */
export const filtrarReservasPorPestania = (
  reservas: Reserva[],
  pestania: PestaniaReservas,
): Reserva[] =>
  reservas.filter((r) =>
    pestania === 'proximas'
      ? r.estado === 'confirmada'
      : r.estado === 'cumplida' || r.estado === 'cancelada' || r.estado === 'ausente'
  );

/** Cantidad de reservas activas (límite del PRD: 3 por persona). */
export const contarReservasActivas = (reservas: Reserva[]): number =>
  reservas.filter((r) => r.estado === 'confirmada').length;
