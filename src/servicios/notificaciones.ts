import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { getKVItem, removeKVItem, setKVItem } from '../bd/kvStore';
import { pedir } from './api';

type ExpoNotifications = typeof import('expo-notifications');

const CLAVE_TOKEN_PUSH = 'expo-push-token';
const CANAL_RECORDATORIOS = 'recordatorios-turnos';
let manejadorConfigurado = false;

const obtenerModuloNotificaciones = (): ExpoNotifications | null => {
  if (Platform.OS === 'web') return null;

  try {
    // Notifications is native-only, so load it only after the platform guard above.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as ExpoNotifications;
    if (!manejadorConfigurado) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      manejadorConfigurado = true;
    }
    return Notifications;
  } catch (error) {
    console.warn('No se pudo cargar expo-notifications:', error);
    return null;
  }
};

export const solicitarPermisosNotificaciones = async (): Promise<boolean> => {
  const Notifications = obtenerModuloNotificaciones();
  if (!Notifications) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL_RECORDATORIOS, {
      name: 'Recordatorios de turnos',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const programarRecordatorioTurno = async (
  nombreCancha: string,
  fecha: string,
  horaInicio: string,
): Promise<void> => {
  const Notifications = obtenerModuloNotificaciones();
  if (!Notifications) return;

  const inicioTurno = new Date(`${fecha}T${horaInicio}:00`);
  const fechaRecordatorio = new Date(inicioTurno.getTime() - 2 * 60 * 60 * 1000);
  if (Number.isNaN(inicioTurno.getTime()) || fechaRecordatorio.getTime() <= Date.now()) return;
  if (!(await solicitarPermisosNotificaciones())) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚽ Recordatorio de Turno Deportivo',
      body: `¡Atención! Tu reserva en ${nombreCancha} es el ${fecha} a las ${horaInicio} hs. Mostrá tu QR al encargado.`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fechaRecordatorio,
      ...(Platform.OS === 'android' ? { channelId: CANAL_RECORDATORIOS } : {}),
    },
  });
};

export const notificarCancelacion = async (
  nombreCancha: string,
  motivo: string,
): Promise<void> => {
  const Notifications = obtenerModuloNotificaciones();
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌧️ Suspensión / Aviso de Turno',
      body: `Tu turno en ${nombreCancha} ha sido modificado/suspendido. Motivo: ${motivo}`,
      sound: true,
    },
    trigger: null,
  });
};

export const notificarFavoritoLiberado = async (
  nombreCancha: string,
  hora: string,
): Promise<void> => {
  const Notifications = obtenerModuloNotificaciones();
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⭐ ¡Turno Liberado en tu Cancha Favorita!',
      body: `Se acaba de liberar un turno a las ${hora} hs en ${nombreCancha}. ¡Aprovechá a reservarlo!`,
      sound: true,
    },
    trigger: null,
  });
};

export const registrarDispositivoPush = async (): Promise<void> => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  if (
    Platform.OS === 'android' &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    return;
  }
  const Notifications = obtenerModuloNotificaciones();
  if (!Notifications || !(await solicitarPermisosNotificaciones())) return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('No se encontró el projectId de EAS para registrar notificaciones.');

  const tokenExpo = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const tokenAnterior = await getKVItem(CLAVE_TOKEN_PUSH);
  if (tokenAnterior && tokenAnterior !== tokenExpo) {
    const baja = await pedir<null>(`/dispositivos/${encodeURIComponent(tokenAnterior)}`, {
      metodo: 'DELETE',
    });
    if ('error' in baja) {
      console.warn('No se pudo dar de baja el token push anterior:', baja.error.mensaje);
    }
  }

  await setKVItem(CLAVE_TOKEN_PUSH, tokenExpo);
  const alta = await pedir<{ tokenExpo: string; plataforma: 'ios' | 'android' }>('/dispositivos', {
    metodo: 'POST',
    cuerpo: { tokenExpo, plataforma: Platform.OS },
  });
  if ('error' in alta) {
    throw new Error(`No se pudo registrar el dispositivo para notificaciones: ${alta.error.mensaje}`);
  }
};

export const eliminarDispositivoPush = async (): Promise<void> => {
  const tokenExpo = await getKVItem(CLAVE_TOKEN_PUSH);
  if (!tokenExpo) return;

  const baja = await pedir<null>(`/dispositivos/${encodeURIComponent(tokenExpo)}`, {
    metodo: 'DELETE',
  });
  if ('error' in baja) {
    throw new Error(`No se pudo dar de baja el dispositivo para notificaciones: ${baja.error.mensaje}`);
  }
  await removeKVItem(CLAVE_TOKEN_PUSH);
};
