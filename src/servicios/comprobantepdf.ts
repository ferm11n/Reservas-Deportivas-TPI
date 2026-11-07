import * as Print from 'expo-print';
import { Alert } from 'react-native';
import { Espacio, Reserva, Usuario } from '../tipos';
import { leerIdDeTurno } from './api';
export const generarComprobantePDF = async (
  reserva: Reserva,
  espacio: Espacio,
  usuario: Usuario
): Promise<void> => {
  try {
    const infoTurno = leerIdDeTurno(reserva.turnoId);
    const fechaTurno = infoTurno?.fecha || 'Fecha programada';
    const horaTurno = infoTurno ? `${infoTurno.inicio} a ${infoTurno.fin} hs` : 'Horario a confirmar';
    const precio = espacio.precioPorHora.toLocaleString('es-AR');
    // Código QR en imagen generado para el PDF
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
      reserva.codigoQr
    )}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Comprobante de Reserva - Municipalidad de Villaguay</title>
        <style>
          * { box-sizing: border-box; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
          body { padding: 30px; color: #222; background-color: #FFF; }
          .header { border-bottom: 3px solid #2E7D32; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
          .logo-text h1 { margin: 0; font-size: 20px; color: #1B5E20; text-transform: uppercase; letter-spacing: 1px; }
          .logo-text h2 { margin: 4px 0 0 0; font-size: 13px; color: #555; font-weight: normal; }
          .badge-reserva { background: #E8F5E9; border: 1px solid #A5D6A7; color: #2E7D32; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px; }
          
          .seccion { margin-bottom: 20px; }
          .seccion-titulo { font-size: 12px; font-weight: bold; color: #777; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #EEE; padding-bottom: 4px; }
          
          .tabla-datos { width: 100%; border-collapse: collapse; margin-top: 5px; }
          .tabla-datos td { padding: 8px 10px; font-size: 14px; border-bottom: 1px solid #F0F0F0; }
          .tabla-datos td.label { font-weight: bold; width: 35%; color: #444; }
          .tabla-datos td.valor { color: #111; }
          .highlight { background-color: #FAFAFA; border-radius: 8px; border: 1px solid #E0E0E0; padding: 15px; margin: 20px 0; }
          .qr-box { text-align: center; margin-top: 15px; }
          .qr-box img { width: 140px; height: 140px; border: 1px solid #DDD; padding: 5px; border-radius: 6px; }
          .qr-token { font-family: monospace; font-size: 11px; color: #666; margin-top: 5px; }
          .footer { margin-top: 35px; border-top: 1px dashed #CCC; padding-top: 15px; font-size: 11px; color: #777; text-align: center; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-text">
            <h1>Municipalidad de Villaguay</h1>
            <h2>Dirección de Deportes — Sistema de Reservas</h2>
          </div>
          <div class="badge-reserva">TURNO CONFIRMADO</div>
        </div>
        <div class="seccion">
          <div class="seccion-titulo">Información del Titular</div>
          <table class="tabla-datos">
            <tr>
              <td class="label">Nombre y Apellido:</td>
              <td class="valor">${usuario.nombre}</td>
            </tr>
            <tr>
              <td class="label">Correo Electrónico:</td>
              <td class="valor">${usuario.email}</td>
            </tr>
            <tr>
              <td class="label">Teléfono de Contacto:</td>
              <td class="valor">${usuario.telefono || 'No registrado'}</td>
            </tr>
          </table>
        </div>
        <div class="seccion">
          <div class="seccion-titulo">Detalle del Espacio Deportivo</div>
          <table class="tabla-datos">
            <tr>
              <td class="label">Espacio / Cancha:</td>
              <td class="valor"><strong>${espacio.nombre}</strong></td>
            </tr>
            <tr>
              <td class="label">Complejo Deportivo:</td>
              <td class="valor">${espacio.complejo}</td>
            </tr>
            <tr>
              <td class="label">Deporte:</td>
              <td class="valor">${espacio.deporteId.toUpperCase()} (${espacio.superficie})</td>
            </tr>
            <tr>
              <td class="label">Condición:</td>
              <td class="valor">${espacio.techado ? 'Techado' : 'Al aire libre'} | ${espacio.iluminacion ? 'Con iluminación nocturna' : 'Sin iluminación'}</td>
            </tr>
          </table>
        </div>
        <div class="highlight">
          <div class="seccion-titulo" style="border: none;">Horario y Arancel</div>
          <table class="tabla-datos">
            <tr>
              <td class="label">Fecha del Turno:</td>
              <td class="valor"><strong>${fechaTurno}</strong></td>
            </tr>
            <tr>
              <td class="label">Franja Horaria:</td>
              <td class="valor"><strong>${horaTurno}</strong></td>
            </tr>
            <tr>
              <td class="label">Arancel a abonar en puerta:</td>
              <td class="valor" style="color: #2E7D32; font-size: 16px; font-weight: bold;">$${precio}</td>
            </tr>
            <tr>
              <td class="label">Identificador de Reserva:</td>
              <td class="valor">#${reserva.id}</td>
            </tr>
          </table>
        </div>
        <div class="qr-box">
          <p style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">Código de Acceso en Portería</p>
          <img src="${qrImageUrl}" alt="Código QR" />
          <div class="qr-token">Código: ${reserva.codigoQr}</div>
        </div>
        <div class="footer">
          <p>⚠️ Presentar este comprobante o el código QR digital en el acceso al complejo municipal.<br/>
          Tolerancia máxima de 15 minutos luego de iniciado el turno. Cumplir con las normas de uso y calzado adecuado.<br/>
          <em>Documento generado por la App Móvil de Reservas Deportivas de Villaguay</em></p>
        </div>
      </body>
      </html>
    `;
   // Abre directamente la vista previa oficial con el botón "Guardar como PDF"
    await Print.printAsync({
      html: htmlContent,
    });
  } catch (error) {
    console.error('Error al generar el PDF:', error);
    Alert.alert('Error', 'No se pudo generar el comprobante PDF.');
  }
};