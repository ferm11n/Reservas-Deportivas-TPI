import {
  solicitarPermisosNotificaciones,
  programarRecordatorioTurno,
  cancelarRecordatorioTurno,
  notificarCancelacion,
  notificarFavoritoLiberado,
} from '../servicios/notificaciones';

export {
  solicitarPermisosNotificaciones,
  programarRecordatorioTurno,
  cancelarRecordatorioTurno,
  notificarCancelacion,
  notificarFavoritoLiberado,
};

export const useNotifications = () => ({
  solicitarPermisosNotificaciones,
  programarRecordatorioTurno,
  cancelarRecordatorioTurno,
  notificarCancelacion,
  notificarFavoritoLiberado,
});
