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
import { Espacio, Turno } from '../../tipos';
import { obtenerEspacios, obtenerGrillaTurnos, crearReserva } from '../../servicios/reservas';
import { GrillaTurnos } from '../../componentes/GrillaTurnos';
import { fechaLocal } from '../../servicios/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { useRouter } from 'expo-router';

export default function AvailabilityScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const { programarRecordatorioTurno } = useNotifications();

  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioIdSeleccionado, setEspacioIdSeleccionado] = useState<string>('esp-02');
  const [diasProximos, setDiasProximos] = useState<{ fechaStr: string; label: string; diaNombre: string }[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('');

  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(null);

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [procesandoReserva, setProcesandoReserva] = useState(false);

  useEffect(() => {
    generarProximos7Dias();
    cargarEspacios();
  }, []);

  useEffect(() => {
    if (espacioIdSeleccionado && fechaSeleccionada) {
      cargarGrilla();
    }
  }, [espacioIdSeleccionado, fechaSeleccionada]);

  const generarProximos7Dias = () => {
    const lista = [];
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const hoy = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);
      const iso = fechaLocal(d);
      const diaNom = i === 0 ? 'HOY' : diasSemana[d.getDay()];
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      lista.push({ fechaStr: iso, label, diaNombre: diaNom });
    }

    setDiasProximos(lista);
    setFechaSeleccionada(lista[0].fechaStr);
  };

  const cargarEspacios = async () => {
    const res = await obtenerEspacios();
    if ('datos' in res) {
      setEspacios(res.datos);
      if (res.datos.length > 0 && !espacioIdSeleccionado) {
        setEspacioIdSeleccionado(res.datos[0].id);
      }
    }
  };

  const cargarGrilla = async () => {
    setCargando(true);
    setErrorCarga(null);
    setTurnoSeleccionado(null);
    const res = await obtenerGrillaTurnos(espacioIdSeleccionado, fechaSeleccionada);
    if ('datos' in res) {
      setTurnos(res.datos);
    } else {
      setErrorCarga(res.error.mensaje);
    }
    setCargando(false);
  };

  const handleReservar = async () => {
    if (!usuario) {
      Alert.alert(
        'Iniciar Sesión Requerido',
        'Para reservar un turno debes iniciar sesión o registrarte.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar Sesión', onPress: () => router.push('/(auth)/login' as any) },
        ]
      );
      return;
    }

    if (!turnoSeleccionado) {
      Alert.alert('Seleccioná un turno', 'Por favor seleccioná un turno libre de la grilla.');
      return;
    }

    const espacioActual = espacios.find((e) => e.id === espacioIdSeleccionado);
    if (!espacioActual) return;

    Alert.alert(
      'Confirmar Reserva',
      `¿Deseas reservar ${espacioActual.nombre} el ${fechaSeleccionada} de ${turnoSeleccionado.inicio} a ${turnoSeleccionado.fin} por $${turnoSeleccionado.precio.toLocaleString('es-AR')}?`,
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Confirmar Reserva',
          onPress: async () => {
            setProcesandoReserva(true);
            const res = await crearReserva(
              turnoSeleccionado.id,
              espacioActual.capacidad
            );
            setProcesandoReserva(false);

            if ('error' in res) {
              Alert.alert('Atención', res.error.mensaje);
            } else {
              // Programar recordatorio de notificación local
              programarRecordatorioTurno(
                espacioActual.nombre,
                fechaSeleccionada,
                turnoSeleccionado.inicio
              );

              Alert.alert(
                '¡Reserva Confirmada! 🎉',
                `Tu código QR es: ${res.datos.codigoQr}. Podés consultar tu reserva en la pestaña "Mis Reservas" incluso sin conexión.`,
                [
                  {
                    text: 'Ver Mi QR',
                    onPress: () => router.push(`/reserva/${res.datos.id}` as any),
                  },
                ]
              );
              cargarGrilla();
            }
          },
        },
      ]
    );
  };

  const espacioActual = espacios.find((e) => e.id === espacioIdSeleccionado);

  return (
    <View style={styles.container}>
      {/* Selector Horizontal de Espacios */}
      <View style={styles.espaciosBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.espaciosContent}>
          {espacios.map((esp) => {
            const activo = esp.id === espacioIdSeleccionado;
            return (
              <TouchableOpacity
                key={esp.id}
                style={[styles.chipEspacio, activo && styles.chipEspacioActivo]}
                onPress={() => setEspacioIdSeleccionado(esp.id)}
              >
                <Text style={[styles.textChipEspacio, activo && styles.textChipEspacioActivo]} numberOfLines={1}>
                  {esp.nombre}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Selector de Días (Próximos 7 días) */}
      <View style={styles.diasBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.diasContent}>
          {diasProximos.map((d) => {
            const activo = d.fechaStr === fechaSeleccionada;
            return (
              <TouchableOpacity
                key={d.fechaStr}
                style={[styles.cardDia, activo && styles.cardDiaActivo]}
                onPress={() => setFechaSeleccionada(d.fechaStr)}
              >
                <Text style={[styles.diaNombre, activo && styles.textActivo]}>{d.diaNombre}</Text>
                <Text style={[styles.diaLabel, activo && styles.textActivo]}>{d.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Info del Espacio Elegido */}
      {espacioActual && (
        <View style={styles.headerInfo}>
          <View>
            <Text style={styles.nombreEspacio}>{espacioActual.nombre}</Text>
            <Text style={styles.complejoEspacio}>{espacioActual.complejo}</Text>
          </View>
          <Text style={styles.precioBase}>${espacioActual.precioPorHora.toLocaleString('es-AR')}/hr</Text>
        </View>
      )}

      {/* Grilla de Turnos */}
      <ScrollView contentContainerStyle={styles.grillaContent}>
        {cargando ? (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.textoCargando}>Cargando turnos de la jornada...</Text>
          </View>
        ) : errorCarga ? (
          <View style={styles.centrado}>
            <Text style={styles.textoErrorCarga}>{errorCarga}</Text>
            <TouchableOpacity style={styles.botonReintentarCarga} onPress={cargarGrilla}>
              <Text style={styles.textoBotonReintentarCarga}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <GrillaTurnos
            turnos={turnos}
            turnoSeleccionadoId={turnoSeleccionado?.id}
            onSeleccionarTurno={(t) => setTurnoSeleccionado(t)}
          />
        )}
      </ScrollView>

      {/* Botón Flotante para Reservar */}
      {turnoSeleccionado && (
        <View style={styles.footerSticky}>
          <View style={styles.resumenCol}>
            <Text style={styles.resumenHorario}>
              Turno: {turnoSeleccionado.inicio} a {turnoSeleccionado.fin} hs
            </Text>
            <Text style={styles.resumenPrecio}>Total: ${turnoSeleccionado.precio.toLocaleString('es-AR')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.botonReservar, procesandoReserva && styles.botonDeshabilitado]}
            disabled={procesandoReserva}
            onPress={handleReservar}
          >
            {procesandoReserva ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.textoBotonReservar}>R E S E R V A R</Text>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  espaciosBar: {
    backgroundColor: '#1E1E1E',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  espaciosContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  chipEspacio: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipEspacioActivo: {
    backgroundColor: '#2E7D32',
  },
  textChipEspacio: {
    color: '#CCCCCC',
    fontSize: 13,
    fontWeight: '600',
  },
  textChipEspacioActivo: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  diasBar: {
    backgroundColor: '#161616',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  diasContent: {
    paddingHorizontal: 14,
    gap: 10,
  },
  cardDia: {
    width: 62,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardDiaActivo: {
    backgroundColor: '#4CAF50',
    borderColor: '#81C784',
  },
  diaNombre: {
    color: '#AAAAAA',
    fontSize: 11,
    fontWeight: '700',
  },
  diaLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  textActivo: {
    color: '#FFFFFF',
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  nombreEspacio: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  complejoEspacio: {
    color: '#888888',
    fontSize: 12,
  },
  precioBase: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '800',
  },
  grillaContent: {
    padding: 14,
    paddingBottom: 90,
  },
  centrado: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  textoCargando: {
    color: '#888888',
    fontSize: 14,
    marginTop: 10,
  },
  textoErrorCarga: {
    color: '#FF8A80',
    fontSize: 14,
    textAlign: 'center',
  },
  botonReintentarCarga: {
    marginTop: 12,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  textoBotonReintentarCarga: {
    color: '#FFF',
    fontWeight: '700',
  },
  footerSticky: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8,
  },
  resumenCol: {
    flex: 1,
  },
  resumenHorario: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  resumenPrecio: {
    color: '#66BB6A',
    fontSize: 16,
    fontWeight: '800',
  },
  botonReservar: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoBotonReservar: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
