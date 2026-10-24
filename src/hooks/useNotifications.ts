import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const getNotificationsModule = () => {
  if (Platform.OS === 'web') return null;

  // Evitar llamar a require('expo-notifications') en Expo Go (SDK 53+)
  const esExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    (Constants as any).appOwnership === 'expo';

  if (esExpoGo) {
    return null;
  }

  try {
    const Notifications = require('expo-notifications');
    if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
      return Notifications;
    }
  } catch (e) {
    // Captura silenciosa para entornos de desarrollo
  }
  return null;
};

export const useNotifications = () => {
  const solicitarPermisosNotificaciones = async (): Promise<boolean> => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return false;
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('recordatorios-turnos', {
          name: 'Recordatorios de turnos',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch {
      return false;
    }
  };

  const programarRecordatorioTurno = async (
    nombreCancha: string,
    fecha: string,
    horaInicio: string
  ) => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    try {
      const inicioTurno = new Date(`${fecha}T${horaInicio}:00`);
      const fechaRecordatorio = new Date(inicioTurno.getTime() - 2 * 60 * 60 * 1000);
      if (Number.isNaN(inicioTurno.getTime()) || fechaRecordatorio.getTime() <= Date.now()) return;

      const tienePermiso = await solicitarPermisosNotificaciones();
      if (!tienePermiso) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚽ Recordatorio de Turno Deportivo',
          body: `¡Atención! Tu reserva en ${nombreCancha} es el ${fecha} a las ${horaInicio} hs. Mostrá tu QR al encargado.`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fechaRecordatorio,
          ...(Platform.OS === 'android' ? { channelId: 'recordatorios-turnos' } : {}),
        },
      });
    } catch (e) {
      console.warn('Notificaciones no disponibles:', e);
    }
  };

  const notificarCancelacion = async (nombreCancha: string, motivo: string) => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌧️ Suspensión / Aviso de Turno',
          body: `Tu turno en ${nombreCancha} ha sido modificado/suspendido. Motivo: ${motivo}`,
          sound: true,
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Notificaciones no disponibles:', e);
    }
  };

  const notificarFavoritoLiberado = async (nombreCancha: string, hora: string) => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⭐ ¡Turno Liberado en tu Cancha Favorita!',
          body: `Se acaba de liberar un turno a las ${hora} hs en ${nombreCancha}. ¡Aprovechá a reservarlo!`,
          sound: true,
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Notificaciones no disponibles:', e);
    }
  };

  return {
    solicitarPermisosNotificaciones,
    programarRecordatorioTurno,
    notificarCancelacion,
    notificarFavoritoLiberado,
  };
};
