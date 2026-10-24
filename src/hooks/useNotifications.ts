import {
  solicitarPermisosNotificaciones,
  programarRecordatorioTurno,
  notificarCancelacion,
  notificarFavoritoLiberado,
} from '../servicios/notificaciones';

export {
  solicitarPermisosNotificaciones,
  programarRecordatorioTurno,
  notificarCancelacion,
  notificarFavoritoLiberado,
};

export const useNotifications = () => ({
  solicitarPermisosNotificaciones,
  programarRecordatorioTurno,
  notificarCancelacion,
  notificarFavoritoLiberado,
});
