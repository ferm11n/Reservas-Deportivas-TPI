import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Reserva, Espacio } from '../../tipos';
import { obtenerReserva, obtenerEspacioPorId, cancelarReserva } from '../../servicios/reservas';
import { QrViewer } from '../../componentes/QrViewer';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { usuario } = useAuth();

  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cancelando, setCancelando] = useState(false);

  const usuarioId = usuario?.id ?? null;

  const cargarDetalle = useCallback(async () => {
    setCargando(true);
    if (usuarioId) {
      const resultado = await obtenerReserva(id, usuarioId);
      if ('datos' in resultado) {
        setReserva(resultado.datos);
        const resEsp = await obtenerEspacioPorId(resultado.datos.espacioId);
        if ('datos' in resEsp) setEspacio(resEsp.datos);
      } else {
        setReserva(null);
      }
    }
    setCargando(false);
  }, [id, usuarioId]);

  useEffect(() => {
    if (id) cargarDetalle();
  }, [id, cargarDetalle]);

  const handleCancelar = () => {
    if (!reserva) return;
    const cancelableHasta = new Date(reserva.cancelableHasta);
    const esTardio = Date.now() > cancelableHasta.getTime();

    const mensaje = esTardio
      ? `Atención: Faltan menos de 4 horas para tu turno. Si cancelás ahora se registrará como CANCELACIÓN TARDÍA. ¿Deseas proceder?`
      : `¿Confirmás que querés cancelar esta reserva? Se liberará el turno para otros vecinos.`;

    Alert.alert('Cancelar Reserva', mensaje, [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Sí, Cancelar',
        style: 'destructive',
        onPress: async () => {
          setCancelando(true);
          try {
            const resultado = await cancelarReserva(reserva.id);
            if ('error' in resultado) {
              Alert.alert('No se pudo cancelar', resultado.error.mensaje);
            } else {
              Alert.alert('Reserva Cancelada', 'La reserva ha sido cancelada.');
              cargarDetalle();
            }
          } finally {
            setCancelando(false);
          }
        },
      },
    ]);
  };
  const handleCompartir = async () => {
    if (!reserva || !espacio) return;
    try {
      const mensaje = 
        `Reserva confirmada en ${espacio.nombre} (${espacio.complejo}). ` +
        `Precio: $${espacio.precioPorHora.toLocaleString('es-AR')} en puerta. ` +
        `Turno #${reserva.id}. Presentamos el QR municipal al ingresar.`;

      await Share.share({
        message: mensaje,
        title: `Reserva en ${espacio.nombre}`,
      });
    } catch {
      Alert.alert('Error', 'No se pudo abrir el menú para compartir.');
    }
  };

  const handleComoLlegar = async () => {
    if (!espacio) return;
    const { latitud, longitud } = espacio.coordenadas;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'No se pudo abrir la aplicacion de mapas.');
    }
  };
  
  const handleAgendarCalendario = async () => {
    if (!reserva || !espacio) return;
    const titulo = encodeURIComponent(`Turno: ${espacio.nombre}`);
    const descripcion = encodeURIComponent(`Reserva deportiva en ${espacio.complejo}. Presentar QR al ingresar.`);
    const ubicacion = encodeURIComponent(`${espacio.complejo}, Villaguay, Entre Rios`);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&details=${descripcion}&location=${ubicacion}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'No se pudo abrir el calendario.');
    }
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!reserva) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.textoError}>No se encontró la reserva indicada.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tarjeta de Resumen */}
      <View style={styles.cardResumen}>
        <Text style={styles.canchaNombre}>{espacio?.nombre || 'Cancha Municipal'}</Text>
        <Text style={styles.complejoNombre}>
          <Ionicons name="location-outline" size={15} color="#4CAF50" /> {espacio?.complejo}
        </Text>
        <Text style={styles.precioText}>
          ${espacio?.precioPorHora.toLocaleString('es-AR')} — Se paga en el lugar
        </Text>
      </View>

      {/* Visualizador de Código QR Offline */}
      {reserva.estado === 'confirmada' ? (
        <QrViewer codigoQr={reserva.codigoQr} />
      ) : (
        <View style={styles.cardEstadoNoActivo}>
          <Ionicons name="alert-circle-outline" size={40} color="#FF8A80" />
          <Text style={styles.textoEstadoNoActivo}>
            Esta reserva figura como {reserva.estado.toUpperCase()}.
          </Text>
        </View>
      )}

      {/* Botones de Acción */}
      <View style={styles.accionesWrapper}>
        {reserva.estado === 'confirmada' && (
          <TouchableOpacity style={styles.botonCompartir} onPress={handleCompartir}>
            <Ionicons name="share-social-outline" size={18} color="#FFF" />
            <Text style={styles.textoBotonAccion}>Compartir con el equipo</Text>
          </TouchableOpacity>
        )}

        {reserva.estado === 'confirmada' && (
          <TouchableOpacity style={styles.botonCalendario} onPress={handleAgendarCalendario}>
            <Ionicons name="calendar-outline" size={18} color="#FFF" />
            <Text style={styles.textoBotonAccion}>Agendar en mi Calendario</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.botonComoLlegar} onPress={handleComoLlegar}>
          <Ionicons name="navigate-outline" size={18} color="#FFF" />
          <Text style={styles.textoBotonAccion}>Cómo Llegar</Text>
        </TouchableOpacity>

        {reserva.estado === 'confirmada' && (
          <TouchableOpacity
            style={[styles.botonCancelar, cancelando && styles.botonDeshabilitado]}
            disabled={cancelando}
            onPress={handleCancelar}
          >
            <Ionicons name="close-circle-outline" size={18} color="#FF8A80" />
            <Text style={styles.textoBotonCancelar}>Cancelar Reserva</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.notaOffline}>
        💡 El código QR está guardado localmente en tu teléfono y podés mostrarlo en la puerta sin necesidad de señal o datos móviles.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  cardResumen: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  canchaNombre: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  complejoNombre: {
    color: '#AAA',
    fontSize: 14,
    marginTop: 4,
  },
  precioText: {
    color: '#66BB6A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  cardEstadoNoActivo: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#D32F2F',
    gap: 8,
  },
  textoEstadoNoActivo: {
    color: '#FF8A80',
    fontSize: 16,
    fontWeight: '700',
  },
  accionesWrapper: {
    gap: 10,
    marginTop: 8,
  },
  botonCompartir: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },  
  botonCalendario: {
    backgroundColor: '#0288D1',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  botonComoLlegar: {
    backgroundColor: '#1565C0',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  textoBotonAccion: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  botonCancelar: {
    backgroundColor: '#B71C1C33',
    borderColor: '#D32F2F',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  textoBotonCancelar: {
    color: '#FF8A80',
    fontSize: 14,
    fontWeight: '700',
  },
  notaOffline: {
    color: '#888',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 16,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#121212',
  },
  textoError: {
    color: '#EF9A9A',
    fontSize: 16,
  },
});
