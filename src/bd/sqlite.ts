import { Platform } from 'react-native';
import { Reserva } from '../tipos';

/**
 * Caché local en expo-sqlite. La fuente de verdad es la API;
 * acá se guarda lo último que llegó para que la app abra y muestre el QR sin señal.
 * - reservas: las del usuario logueado (con su código QR)
 * - cache: catálogo de espacios y deportes (JSON por clave)
 */

let dbInstance: any = null;

// Respaldo en memoria para web o si SQLite no está disponible
const memoriaReservas: Reserva[] = [];
const memoriaCache: Record<string, string> = {};

export const inicializarBaseDeDatos = async (): Promise<void> => {
  if (Platform.OS === 'web' || dbInstance) return;
  try {
    const SQLite = require('expo-sqlite');
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
      CREATE TABLE IF NOT EXISTS cache (
        clave TEXT PRIMARY KEY NOT NULL,
        json TEXT NOT NULL,
        actualizadoEn TEXT NOT NULL
      );
    `);
  } catch (error) {
    console.warn('SQLite no disponible, uso memoria:', error);
    dbInstance = null;
  }
};

const db = async () => {
  if (!dbInstance) await inicializarBaseDeDatos();
  return dbInstance;
};

// ---------- Reservas ----------

export const guardarReservaOffline = async (reserva: Reserva): Promise<void> => {
  const idx = memoriaReservas.findIndex((r) => r.id === reserva.id);
  if (idx >= 0) memoriaReservas[idx] = reserva;
  else memoriaReservas.unshift(reserva);

  const base = await db();
  if (!base) return;
  try {
    await base.runAsync(
      `INSERT OR REPLACE INTO reservas
       (id, turnoId, espacioId, usuarioId, cantidadPersonas, codigoQr, estado, ingresoEn, creadaEn, cancelableHasta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        reserva.id, reserva.turnoId, reserva.espacioId, reserva.usuarioId, reserva.cantidadPersonas,
        reserva.codigoQr, reserva.estado, reserva.ingresoEn, reserva.creadaEn, reserva.cancelableHasta,
      ]
    );
  } catch (error) {
    console.error('Error guardando reserva en SQLite:', error);
  }
};

export const guardarReservasOffline = async (reservas: Reserva[]): Promise<void> => {
  for (const r of reservas) await guardarReservaOffline(r);
};

export const obtenerReservasOffline = async (usuarioId: string): Promise<Reserva[]> => {
  const base = await db();
  if (base) {
    try {
      const filas = await base.getAllAsync(
        `SELECT * FROM reservas WHERE usuarioId = ? ORDER BY turnoId ASC;`,
        [usuarioId]
      );
      return filas as Reserva[];
    } catch (error) {
      console.error('Error leyendo reservas de SQLite:', error);
    }
  }
  return memoriaReservas.filter((r) => r.usuarioId === usuarioId);
};

export const borrarReservasOffline = async (): Promise<void> => {
  memoriaReservas.length = 0;
  const base = await db();
  if (!base) return;
  try {
    await base.runAsync(`DELETE FROM reservas;`);
  } catch (error) {
    console.error('Error borrando reservas de SQLite:', error);
  }
};

// ---------- Caché genérica (catálogo) ----------

export const guardarEnCache = async (clave: string, valor: unknown): Promise<void> => {
  const json = JSON.stringify(valor);
  memoriaCache[clave] = json;
  const base = await db();
  if (!base) return;
  try {
    await base.runAsync(
      `INSERT OR REPLACE INTO cache (clave, json, actualizadoEn) VALUES (?, ?, ?);`,
      [clave, json, new Date().toISOString()]
    );
  } catch (error) {
    console.error('Error guardando caché en SQLite:', error);
  }
};

export const leerDeCache = async <T>(clave: string): Promise<T | null> => {
  const base = await db();
  if (base) {
    try {
      const fila = await base.getFirstAsync(`SELECT json FROM cache WHERE clave = ?;`, [clave]);
      if (fila?.json) return JSON.parse(fila.json) as T;
    } catch (error) {
      console.error('Error leyendo caché de SQLite:', error);
    }
  }
  return memoriaCache[clave] ? (JSON.parse(memoriaCache[clave]) as T) : null;
};
