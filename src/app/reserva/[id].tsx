import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Reserva, Espacio } from '../../tipos';
import { obtenerReservasOffline } from '../../bd/sqlite';
import { obtenerEspacioPorId, cancelarReserva } from '../../servicios/reservas';
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

  useEffect(() => {
    if (id) cargarDetalle();
  }, [id]);

  const cargarDetalle = async () => {
    setCargando(true);
    if (usuario) {
      const lista = await obtenerReservasOffline(usuario.id);
      const resEncontrada = lista.find((r) => r.id === id);
      if (resEncontrada) {
        setReserva(resEncontrada);
        const resEsp = await obtenerEspacioPorId(resEncontrada.espacioId);
        if ('datos' in resEsp) setEspacio(resEsp.datos);
      }
    }
    setCargando(false);
  };

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
          await cancelarReserva(reserva.id);
          Alert.alert('Reserva Cancelada', 'La reserva ha sido cancelada.');
          cargarDetalle();
        },
      },
    ]);
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
        <TouchableOpacity style={styles.botonComoLlegar} onPress={() => router.push('/(tabs)/mapa' as any)}>
          <Ionicons name="navigate-outline" size={18} color="#FFF" />
          <Text style={styles.textoBotonAccion}>Cómo Llegar</Text>
        </TouchableOpacity>

        {reserva.estado === 'confirmada' && (
          <TouchableOpacity style={styles.botonCancelar} onPress={handleCancelar}>
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
