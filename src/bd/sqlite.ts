import { Platform } from 'react-native';
import { Reserva } from '../tipos';
import { MOCK_RESERVAS_INICIALES } from '../mocks';

let dbInstance: any = null;
const memoryReservas: Reserva[] = [...MOCK_RESERVAS_INICIALES];

export const inicializarBaseDeDatos = async (): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    const SQLite = require('expo-sqlite');
    if (SQLite && typeof SQLite.openDatabaseAsync === 'function') {
      dbInstance = await SQLite.openDatabaseAsync('reservas_vgy.db');
      await dbInstance.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS reservas (
          id TEXT PRIMARY KEY NOT NULL,
          turnoId TEXT NOT NULL,
          espacioId TEXT NOT NULL,
          usuarioId TEXT NOT NULL,
          cantidadPersonas INTEGER NOT NULL,
          codigoQr TEXT NOT NULL,
          estado TEXT NOT NULL,
          ingresoEn TEXT,
          creadaEn TEXT NOT NULL,
          cancelableHasta TEXT NOT NULL
        );
      `);
    }
  } catch (error) {
    console.warn('SQLite no disponible en este entorno, usando fallback en memoria:', error);
  }
};

export const guardarReservaOffline = async (reserva: Reserva): Promise<void> => {
  const existingIdx = memoryReservas.findIndex((r) => r.id === reserva.id);
  if (existingIdx >= 0) {
    memoryReservas[existingIdx] = reserva;
  } else {
    memoryReservas.unshift(reserva);
  }

  if (Platform.OS === 'web' || !dbInstance) return;

  try {
    await dbInstance.runAsync(
      `INSERT OR REPLACE INTO reservas 
       (id, turnoId, espacioId, usuarioId, cantidadPersonas, codigoQr, estado, ingresoEn, creadaEn, cancelableHasta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        reserva.id,
        reserva.turnoId,
        reserva.espacioId,
        reserva.usuarioId,
        reserva.cantidadPersonas,
        reserva.codigoQr,
        reserva.estado,
        reserva.ingresoEn,
        reserva.creadaEn,
        reserva.cancelableHasta,
      ]
    );
  } catch (error) {
    console.error('Error guardando reserva en SQLite:', error);
  }
};

export const obtenerReservasOffline = async (usuarioId: string): Promise<Reserva[]> => {
  if (Platform.OS === 'web' || !dbInstance) {
    return memoryReservas.filter((r) => r.usuarioId === usuarioId);
  }

  try {
    const rows = await dbInstance.getAllAsync(
      `SELECT * FROM reservas WHERE usuarioId = ? ORDER BY creadaEn DESC;`,
      [usuarioId]
    );
    if (rows && rows.length > 0) {
      return rows as Reserva[];
    }
  } catch (error) {
    console.error('Error leyendo reservas de SQLite:', error);
  }
  return memoryReservas.filter((r) => r.usuarioId === usuarioId);
};

export const obtenerReservaPorQrOffline = async (codigoQr: string): Promise<Reserva | null> => {
  if (Platform.OS === 'web' || !dbInstance) {
    return memoryReservas.find((r) => r.codigoQr === codigoQr) || null;
  }

  try {
    const row = await dbInstance.getFirstAsync(
      `SELECT * FROM reservas WHERE codigoQr = ? LIMIT 1;`,
      [codigoQr]
    );
    if (row) return row as Reserva;
  } catch (error) {
    console.error('Error buscando QR en SQLite:', error);
  }
  return memoryReservas.find((r) => r.codigoQr === codigoQr) || null;
};
