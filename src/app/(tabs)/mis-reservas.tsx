import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Reserva, Espacio } from '../../tipos';
import { obtenerEspacios, obtenerMisReservas, cancelarReserva } from '../../servicios/reservas';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function MyReservationsScreen() {
  const router = useRouter();
  const { usuario } = useAuth();

  const [tabActiva, setTabActiva] = useState<'proximas' | 'pasadas'>('proximas');
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [usuario, tabActiva]);

  const cargarDatos = async () => {
    setCargando(true);
    const resEsp = await obtenerEspacios();
    if ('datos' in resEsp) {
      setEspacios(resEsp.datos);
    }

    if (usuario) {
      const resReservas = await obtenerMisReservas(usuario.id, tabActiva);
      if ('datos' in resReservas) {
        setReservas(resReservas.datos);
      } else {
        setReservas([]);
        Alert.alert('No se pudieron cargar las reservas', resReservas.error.mensaje);
      }
    } else {
      setReservas([]);
    }
    setCargando(false);
  };

  const handleCancelar = (reserva: Reserva, espacioNombre: string) => {
    const cancelableHasta = new Date(reserva.cancelableHasta);
    const esTardio = Date.now() > cancelableHasta.getTime();

    const mensaje = esTardio
      ? `Estás cancelando con menos de 4 horas de anticipación. Se registrará una CANCELACIÓN TARDÍA en tu cuenta. ¿Confirmás la cancelación en ${espacioNombre}?`
      : `¿Estás seguro de que deseas cancelar la reserva en ${espacioNombre}?`;

    Alert.alert('Cancelar Reserva', mensaje, [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Sí, Cancelar',
        style: 'destructive',
        onPress: async () => {
          const resultado = await cancelarReserva(reserva.id);
          if ('error' in resultado) {
            Alert.alert('No se pudo cancelar', resultado.error.mensaje);
          } else {
            Alert.alert('Reserva Cancelada', 'La reserva ha sido cancelada correctamente.');
            cargarDatos();
          }
        },
      },
    ]);
  };

  const reservasFiltradas = reservas.filter((r) => {
    if (tabActiva === 'proximas') {
      return r.estado === 'confirmada';
    } else {
      return r.estado === 'cumplida' || r.estado === 'cancelada' || r.estado === 'ausente';
    }
  });

  if (!usuario) {
    return (
      <View style={styles.centrado}>
        <Ionicons name="lock-closed-outline" size={56} color="#888" />
        <Text style={styles.tituloSinSesion}>Iniciá sesión para ver tus reservas</Text>
        <Text style={styles.subtituloSinSesion}>
          Podés consultar tus códigos QR guardados para mostrar en la puerta del complejo incluso sin conexión a internet.
        </Text>
        <TouchableOpacity style={styles.botonLogin} onPress={() => router.push('/(auth)/login' as any)}>
          <Text style={styles.textoBotonLogin}>Iniciar Sesión / Registrarse</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs Próximas / Pasadas */}
      <View style={styles.tabsHeader}>
        <TouchableOpacity
          style={[styles.tabButton, tabActiva === 'proximas' && styles.tabButtonActiva]}
          onPress={() => setTabActiva('proximas')}
        >
          <Text style={[styles.tabText, tabActiva === 'proximas' && styles.tabTextActiva]}>
            PRÓXIMAS ({reservas.filter((r) => r.estado === 'confirmada').length}/3)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tabActiva === 'pasadas' && styles.tabButtonActiva]}
          onPress={() => setTabActiva('pasadas')}
        >
          <Text style={[styles.tabText, tabActiva === 'pasadas' && styles.tabTextActiva]}>
            HISTORIAL / PASADAS
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Reservas */}
      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <FlatList
          data={reservasFiltradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const espacio = espacios.find((e) => e.id === item.espacioId);
            const nombreEspacio = espacio?.nombre || 'Cancha Municipal';
            const complejoEspacio = espacio?.complejo || 'Polideportivo Municipal';

            return (
              <View style={styles.reservaCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.flex1}>
                    <Text style={styles.nombreEspacio}>{nombreEspacio}</Text>
                    <Text style={styles.complejoText}>
                      <Ionicons name="location-outline" size={13} color="#888" /> {complejoEspacio}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badgeEstado,
                      item.estado === 'confirmada' && styles.badgeConfirmada,
                      item.estado === 'cumplida' && styles.badgeCumplida,
                      item.estado === 'cancelada' && styles.badgeCancelada,
                    ]}
                  >
                    <Text style={styles.textoBadgeEstado}>{item.estado.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.cardDetailsBox}>
                  <Text style={styles.detailText}>
                    <Ionicons name="qr-code-outline" size={14} color="#4CAF50" /> QR:{' '}
                    <Text style={styles.qrBold}>{item.codigoQr}</Text>
                  </Text>
                  <Text style={styles.detailText}>
                    <Ionicons name="people-outline" size={14} color="#AAA" /> Personas:{' '}
                    {item.cantidadPersonas} jugadores
                  </Text>
                  <Text style={styles.detailText}>
                    <Ionicons name="cash-outline" size={14} color="#66BB6A" /> $
                    {espacio?.precioPorHora.toLocaleString('es-AR')} — Se paga en el predio
                  </Text>
                </View>

                {item.estado === 'confirmada' && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.botonQr}
                      onPress={() => router.push(`/reserva/${item.id}` as any)}
                    >
                      <Ionicons name="qr-code" size={18} color="#FFF" />
                      <Text style={styles.textoBotonQr}>Ver QR de Ingreso</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.botonCancelar}
                      onPress={() => handleCancelar(item, nombreEspacio)}
                    >
                      <Text style={styles.textoBotonCancelar}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centradoVacio}>
              <Ionicons name="calendar-clear-outline" size={48} color="#555" />
              <Text style={styles.textoVacio}>
                {tabActiva === 'proximas'
                  ? 'No tenés reservas activas por el momento.'
                  : 'No tenés reservas en tu historial.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  tabsHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActiva: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActiva: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 14,
    gap: 12,
  },
  reservaCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  flex1: {
    flex: 1,
  },
  nombreEspacio: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  complejoText: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  badgeEstado: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  badgeConfirmada: {
    backgroundColor: '#2E7D32',
  },
  badgeCumplida: {
    backgroundColor: '#1565C0',
  },
  badgeCancelada: {
    backgroundColor: '#C62828',
  },
  textoBadgeEstado: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  cardDetailsBox: {
    backgroundColor: '#161616',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  detailText: {
    color: '#CCCCCC',
    fontSize: 13,
  },
  qrBold: {
    color: '#4CAF50',
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  botonQr: {
    flex: 2,
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  textoBotonQr: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  botonCancelar: {
    flex: 1,
    backgroundColor: '#B71C1C33',
    borderColor: '#D32F2F',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonCancelar: {
    color: '#FF8A80',
    fontSize: 13,
    fontWeight: '700',
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  centradoVacio: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  tituloSinSesion: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  subtituloSinSesion: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
  },
  botonLogin: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  textoBotonLogin: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  textoVacio: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
