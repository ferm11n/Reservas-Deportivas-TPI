import { Platform } from 'react-native';

export const useNotifications = () => {
  const solicitarPermisosNotificaciones = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;
    try {
      const Notifications = require('expo-notifications');
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
    horaInicio: string,
    segundosSimulados: number = 5
  ) => {
    if (Platform.OS === 'web') return;
    try {
      const Notifications = require('expo-notifications');
      await solicitarPermisosNotificaciones();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚽ Recordatorio de Turno Deportivo',
          body: `¡Atención! Tu reserva en ${nombreCancha} es hoy ${fecha} a las ${horaInicio} hs. Mostrá tu QR al encargado.`,
          sound: true,
        },
        trigger: {
          type: 'timeInterval',
          seconds: segundosSimulados,
          repeats: false,
        },
      });
    } catch (e) {
      console.warn('Error programando notificaciones:', e);
    }
  };

  const notificarCancelacion = async (nombreCancha: string, motivo: string) => {
    if (Platform.OS === 'web') return;
    try {
      const Notifications = require('expo-notifications');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌧️ Suspensión / Aviso de Turno',
          body: `Tu turno en ${nombreCancha} ha sido modificado/suspendido. Motivo: ${motivo}`,
          sound: true,
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Error enviando notificación:', e);
    }
  };

  const notificarFavoritoLiberado = async (nombreCancha: string, hora: string) => {
    if (Platform.OS === 'web') return;
    try {
      const Notifications = require('expo-notifications');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⭐ ¡Turno Liberado en tu Cancha Favorita!',
          body: `Se acaba de liberar un turno a las ${hora} hs en ${nombreCancha}. ¡Aprovechá a reservarlo!`,
          sound: true,
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Error enviando notificación:', e);
    }
  };

  return {
    solicitarPermisosNotificaciones,
    programarRecordatorioTurno,
    notificarCancelacion,
    notificarFavoritoLiberado,
  };
};
