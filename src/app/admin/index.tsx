import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Espacio, ReservaFija, Turno } from '../../tipos';
import {
  obtenerEspacios,
  obtenerGrillaTurnos,
  bloquearTurno,
  crearReservaFija,
  actualizarPrecioEspacio,
} from '../../servicios/reservas';
import { MOCK_RESERVAS_FIJAS } from '../../mocks';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AdminScreen() {
  const router = useRouter();
  const { usuario, cambiarRol } = useAuth();
  const { notificarCancelacion, notificarFavoritoLiberado } = useNotifications();

  const [tabActiva, setTabActiva] = useState<'agenda' | 'bloqueos' | 'fijas' | 'tarifas'>('agenda');

  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioIdSeleccionado, setEspacioIdSeleccionado] = useState<string>('esp-02');
  const [cargando, setCargando] = useState(true);

  // Agenda del día
  const [fechaAgenda, setFechaAgenda] = useState<string>(new Date().toISOString().split('T')[0]);
  const [turnosAgenda, setTurnosAgenda] = useState<Turno[]>([]);
  const [cargandoAgenda, setCargandoAgenda] = useState(false);

  // Bloqueos por mantenimiento / lluvia
  const [fechaBloqueo, setFechaBloqueo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [inicioBloqueo, setInicioBloqueo] = useState<string>('14:00');
  const [finBloqueo, setFinBloqueo] = useState<string>('20:00');
  const [motivoBloqueo, setMotivoBloqueo] = useState<string>('Cancha anegada por lluvia');
  const [listaBloqueos, setListaBloqueos] = useState<{ id: string; espacioId: string; fecha: string; motivo: string }[]>([
    { id: 'bloq-1', espacioId: 'esp-03', fecha: new Date().toISOString().split('T')[0], motivo: 'Mantenimiento de césped por lluvia' },
  ]);

  // Reservas Fijas semanales
  const [reservasFijas, setReservasFijas] = useState<ReservaFija[]>([...MOCK_RESERVAS_FIJAS]);
  const [titularFija, setTitularFija] = useState<string>('Club Atlético Villaguay');
  const [diaSemanaFija, setDiaSemanaFija] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(2); // Martes
  const [inicioFija, setInicioFija] = useState<string>('21:00');

  // Tarifas
  const [nuevoPrecio, setNuevoPrecio] = useState<string>('15000');

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (espacioIdSeleccionado && fechaAgenda) {
      cargarAgendaDelDia();
    }
  }, [espacioIdSeleccionado, fechaAgenda]);

  const cargarDatosIniciales = async () => {
    setCargando(true);
    const res = await obtenerEspacios();
    if ('datos' in res) {
      setEspacios(res.datos);
      if (res.datos.length > 0) {
        setEspacioIdSeleccionado(res.datos[0].id);
        setNuevoPrecio(res.datos[0].precioPorHora.toString());
      }
    }
    setCargando(false);
  };

  const cargarAgendaDelDia = async () => {
    setCargandoAgenda(true);
    const res = await obtenerGrillaTurnos(espacioIdSeleccionado, fechaAgenda);
    if ('datos' in res) {
      setTurnosAgenda(res.datos);
    }
    setCargandoAgenda(false);
  };

  const handleCargarBloqueo = async () => {
    if (!motivoBloqueo) {
      Alert.alert('Motivo requerido', 'Por favor ingresá la causa del bloqueo.');
      return;
    }

    await bloquearTurno(espacioIdSeleccionado, fechaBloqueo, inicioBloqueo, finBloqueo, motivoBloqueo);

    const espacio = espacios.find((e) => e.id === espacioIdSeleccionado);
    if (espacio) {
      notificarCancelacion(espacio.nombre, motivoBloqueo);
    }

    const nuevoBloqueo = {
      id: `bloq-${Date.now().toString().slice(-4)}`,
      espacioId: espacioIdSeleccionado,
      fecha: fechaBloqueo,
      motivo: motivoBloqueo,
    };
    setListaBloqueos((prev) => [nuevoBloqueo, ...prev]);

    Alert.alert('Bloqueo Registrado', 'Se han bloqueado los turnos indicados y notificado a los usuarios.');
    cargarAgendaDelDia();
  };

  const handleEliminarBloqueo = (id: string) => {
    Alert.alert('Desbloquear Turno', '¿Deseas levantar este bloqueo de mantenimiento?', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Desbloquear',
        onPress: () => {
          setListaBloqueos((prev) => prev.filter((b) => b.id !== id));
          const espacio = espacios.find((e) => e.id === espacioIdSeleccionado);
          if (espacio) {
            notificarFavoritoLiberado(espacio.nombre, '14:00');
          }
          Alert.alert('Bloqueo Removido', 'El turno ha vuelto a estar disponible en la grilla.');
          cargarAgendaDelDia();
        },
      },
    ]);
  };

  const handleCargarFija = async () => {
    if (!titularFija) {
      Alert.alert('Titular requerido', 'Ingresá el nombre del titular, club o grupo.');
      return;
    }

    const res = await crearReservaFija(espacioIdSeleccionado, titularFija, diaSemanaFija, inicioFija, '22:00');
    if ('datos' in res) {
      setReservasFijas((prev) => [...prev, res.datos]);
      Alert.alert('Reserva Fija Registrada', `Se asignó la reserva semanal a: ${titularFija}`);
      cargarAgendaDelDia();
    }
  };

  const handleToggleFija = (id: string) => {
    setReservasFijas((prev) =>
      prev.map((f) => (f.id === id ? { ...f, activa: !f.activa } : f))
    );
    cargarAgendaDelDia();
  };

  const handleCambiarPrecio = async () => {
    const val = parseInt(nuevoPrecio, 10);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Precio inválido', 'Ingresá un monto numérico positivo.');
      return;
    }

    await actualizarPrecioEspacio(espacioIdSeleccionado, val);
    Alert.alert('Tarifa Actualizada', 'Se modificó el precio por hora del espacio deportivo.');
    cargarDatosIniciales();
  };

  const espacioActual = espacios.find((e) => e.id === espacioIdSeleccionado);
  const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Si el usuario no es admin, dar opción rápida para la defensa oral
  if (usuario?.rol !== 'administrador') {
    return (
      <View style={styles.centrado}>
        <Ionicons name="shield-outline" size={64} color="#6A1B9A" />
        <Text style={styles.tituloSinAdmin}>Acceso Restringido — Administrador</Text>
        <Text style={styles.subSinAdmin}>
          Actualmente tenés el rol de <Text style={styles.boldGreen}>{usuario?.rol.toUpperCase()}</Text>. Para probar el Panel de Administración presioná el botón inferior.
        </Text>
        <TouchableOpacity
          style={styles.botonCambiarAdmin}
          onPress={async () => {
            await cambiarRol('administrador');
            Alert.alert('Modo Administrador', 'Ahora tenés permisos completos de Administrador.');
          }}
        >
          <Ionicons name="key-outline" size={18} color="#FFF" />
          <Text style={styles.textoBotonAdmin}>Activar Rol Administrador (Modo Prueba)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#6A1B9A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header del Panel */}
      <View style={styles.headerPanel}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="shield-checkmark" size={24} color="#CE93D8" />
          <Text style={styles.headerTitle}>Panel de Administración</Text>
        </View>
        <Text style={styles.headerSub}>Dirección de Deportes — Municipalidad de Villaguay</Text>
      </View>

      {/* Barra de Métricas Globales */}
      <View style={styles.metricasRow}>
        <View style={styles.cardMetrica}>
          <Text style={styles.valorMetrica}>{espacios.length}</Text>
          <Text style={styles.labelMetrica}>Canchas</Text>
        </View>
        <View style={styles.cardMetrica}>
          <Text style={styles.valorMetrica}>{reservasFijas.filter((f) => f.activa).length}</Text>
          <Text style={styles.labelMetrica}>Fijas Activas</Text>
        </View>
        <View style={styles.cardMetrica}>
          <Text style={styles.valorMetrica}>{listaBloqueos.length}</Text>
          <Text style={styles.labelMetrica}>Bloqueos</Text>
        </View>
      </View>

      {/* Selector de Pestañas del Panel */}
      <View style={styles.navTabs}>
        <TouchableOpacity
          style={[styles.btnTab, tabActiva === 'agenda' && styles.btnTabActivo]}
          onPress={() => setTabActiva('agenda')}
        >
          <Ionicons name="calendar-outline" size={16} color={tabActiva === 'agenda' ? '#FFF' : '#AAA'} />
          <Text style={[styles.textTab, tabActiva === 'agenda' && styles.textTabActivo]}>Agenda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnTab, tabActiva === 'bloqueos' && styles.btnTabActivo]}
          onPress={() => setTabActiva('bloqueos')}
        >
          <Ionicons name="rainy-outline" size={16} color={tabActiva === 'bloqueos' ? '#FFF' : '#AAA'} />
          <Text style={[styles.textTab, tabActiva === 'bloqueos' && styles.textTabActivo]}>Bloqueos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnTab, tabActiva === 'fijas' && styles.btnTabActivo]}
          onPress={() => setTabActiva('fijas')}
        >
          <Ionicons name="repeat-outline" size={16} color={tabActiva === 'fijas' ? '#FFF' : '#AAA'} />
          <Text style={[styles.textTab, tabActiva === 'fijas' && styles.textTabActivo]}>Res. Fijas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnTab, tabActiva === 'tarifas' && styles.btnTabActivo]}
          onPress={() => setTabActiva('tarifas')}
        >
          <Ionicons name="cash-outline" size={16} color={tabActiva === 'tarifas' ? '#FFF' : '#AAA'} />
          <Text style={[styles.textTab, tabActiva === 'tarifas' && styles.textTabActivo]}>Tarifas</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.mainScroll} contentContainerStyle={styles.scrollContent}>
        {/* Selector de Espacio Deportivo */}
        <View style={styles.cardSeccion}>
          <Text style={styles.labelSeccion}>SELECCIONAR CANCHA A GESTIONAR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollEspacios}>
            {espacios.map((esp) => {
              const activo = esp.id === espacioIdSeleccionado;
              return (
                <TouchableOpacity
                  key={esp.id}
                  style={[styles.chipEspacio, activo && styles.chipEspacioActivo]}
                  onPress={() => {
                    setEspacioIdSeleccionado(esp.id);
                    setNuevoPrecio(esp.precioPorHora.toString());
                  }}
                >
                  <Text style={[styles.textChip, activo && styles.textChipActivo]}>{esp.nombre}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* PESTAÑA 1: AGENDA GLOBAL DEL DÍA */}
        {tabActiva === 'agenda' && (
          <View style={styles.cardSeccion}>
            <View style={styles.titleRow}>
              <Ionicons name="today-outline" size={20} color="#64B5F6" />
              <Text style={styles.tituloBox}>AGENDA DEL DÍA — {espacioActual?.nombre}</Text>
            </View>

            <Text style={styles.inputLabel}>Fecha de consulta (AAAA-MM-DD):</Text>
            <TextInput style={styles.input} value={fechaAgenda} onChangeText={setFechaAgenda} />

            {cargandoAgenda ? (
              <ActivityIndicator color="#64B5F6" style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.agendaGrid}>
                {turnosAgenda.map((turno) => (
                  <View
                    key={turno.id}
                    style={[
                      styles.itemAgendaRow,
                      turno.estado === 'libre' && styles.rowLibre,
                      turno.estado === 'reservado' && styles.rowReservado,
                      turno.estado === 'fijo' && styles.rowFijo,
                      turno.estado === 'mantenimiento' && styles.rowMantenimiento,
                    ]}
                  >
                    <Text style={styles.horaAgenda}>{turno.inicio} - {turno.fin}</Text>
                    <Text style={styles.estadoAgenda}>{turno.estado.toUpperCase()}</Text>
                    <Text style={styles.obsAgenda} numberOfLines={1}>
                      {turno.motivoBloqueo || (turno.estado === 'libre' ? `$${turno.precio}` : 'Reservado')}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* PESTAÑA 2: BLOQUEOS Y MANTENIMIENTO / LLUVIA */}
        {tabActiva === 'bloqueos' && (
          <>
            <View style={styles.cardSeccion}>
              <View style={styles.titleRow}>
                <Ionicons name="rainy-outline" size={20} color="#FFB74D" />
                <Text style={styles.tituloBox}>NUEVO BLOQUEO POR LLUVIA / MANTENIMIENTO</Text>
              </View>

              <Text style={styles.inputLabel}>Cancha Seleccionada:</Text>
              <Text style={styles.boldWhite}>{espacioActual?.nombre} ({espacioActual?.complejo})</Text>

              <Text style={styles.inputLabel}>Fecha del Bloqueo (AAAA-MM-DD):</Text>
              <TextInput style={styles.input} value={fechaBloqueo} onChangeText={setFechaBloqueo} />

              <View style={styles.horariosRow}>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Hora Inicio:</Text>
                  <TextInput style={styles.input} value={inicioBloqueo} onChangeText={setInicioBloqueo} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Hora Fin:</Text>
                  <TextInput style={styles.input} value={finBloqueo} onChangeText={setFinBloqueo} />
                </View>
              </View>

              <Text style={styles.inputLabel}>Motivo del Bloqueo:</Text>
              <TextInput
                style={styles.input}
                placeholder="ej: Cancha anegada por lluvia"
                placeholderTextColor="#666"
                value={motivoBloqueo}
                onChangeText={setMotivoBloqueo}
              />

              <TouchableOpacity style={styles.btnBloquear} onPress={handleCargarBloqueo}>
                <Ionicons name="lock-closed" size={16} color="#FFF" />
                <Text style={styles.textBtn}>Aplicar Bloqueo y Notificar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardSeccion}>
              <Text style={styles.labelSeccion}>BLOQUEOS ACTIVOS REGISTRADOS</Text>
              {listaBloqueos.length === 0 ? (
                <Text style={styles.textoVacio}>No hay bloqueos activos cargados.</Text>
              ) : (
                listaBloqueos.map((b) => (
                  <View key={b.id} style={styles.cardBloqueoActivo}>
                    <View style={styles.flex1}>
                      <Text style={styles.bloqueoMotivo}>{b.motivo}</Text>
                      <Text style={styles.bloqueoFecha}>Fecha: {b.fecha}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.btnDesbloquear}
                      onPress={() => handleEliminarBloqueo(b.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#FF5252" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* PESTAÑA 3: RESERVAS FIJAS SEMANALES */}
        {tabActiva === 'fijas' && (
          <>
            <View style={styles.cardSeccion}>
              <View style={styles.titleRow}>
                <Ionicons name="repeat-outline" size={20} color="#CE93D8" />
                <Text style={styles.tituloBox}>REGISTRAR RESERVA FIJA SEMANAL</Text>
              </View>

              <Text style={styles.inputLabel}>Cancha:</Text>
              <Text style={styles.boldWhite}>{espacioActual?.nombre}</Text>

              <Text style={styles.inputLabel}>Titular / Grupo / Club:</Text>
              <TextInput
                style={styles.input}
                placeholder="ej: Grupo de los Martes"
                placeholderTextColor="#666"
                value={titularFija}
                onChangeText={setTitularFija}
              />

              <Text style={styles.inputLabel}>Día de la semana (0=Dom, 1=Lun, 2=Mar, 3=Mié...):</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={diaSemanaFija.toString()}
                onChangeText={(t) => setDiaSemanaFija((parseInt(t, 10) || 0) as any)}
              />
              <Text style={styles.textDiaDesc}>Seleccionado: {diasNombres[diaSemanaFija] || 'Martes'}</Text>

              <Text style={styles.inputLabel}>Hora Inicio (HH:MM):</Text>
              <TextInput style={styles.input} value={inicioFija} onChangeText={setInicioFija} />

              <TouchableOpacity style={styles.btnFija} onPress={handleCargarFija}>
                <Ionicons name="add-circle-outline" size={16} color="#FFF" />
                <Text style={styles.textBtn}>Guardar Reserva Fija</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardSeccion}>
              <Text style={styles.labelSeccion}>RESERVAS FIJAS REGISTRADAS</Text>
              {reservasFijas.map((f) => (
                <View key={f.id} style={styles.cardFijaItem}>
                  <View style={styles.flex1}>
                    <Text style={styles.fijaTitular}>{f.titular}</Text>
                    <Text style={styles.fijaSub}>
                      {diasNombres[f.dia]}s a las {f.inicio} hs — Espacio: {f.espacioId}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.btnToggleFija, f.activa ? styles.btnFijaActiva : styles.btnFijaInactiva]}
                    onPress={() => handleToggleFija(f.id)}
                  >
                    <Text style={styles.textToggleFija}>{f.activa ? 'ACTIVA' : 'PAUSADA'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {/* PESTAÑA 4: GESTIÓN DE TARIFAS Y PRECIOS */}
        {tabActiva === 'tarifas' && (
          <View style={styles.cardSeccion}>
            <View style={styles.titleRow}>
              <Ionicons name="cash-outline" size={20} color="#66BB6A" />
              <Text style={styles.tituloBox}>MODIFICAR TARIFA POR HORA</Text>
            </View>

            <Text style={styles.inputLabel}>Espacio Deportivo:</Text>
            <Text style={styles.boldWhite}>{espacioActual?.nombre} ({espacioActual?.complejo})</Text>

            <Text style={styles.inputLabel}>Precio Actual:</Text>
            <Text style={styles.precioActual}>${espacioActual?.precioPorHora.toLocaleString('es-AR')} ARS / hr</Text>

            <Text style={styles.inputLabel}>Nuevo Precio ($ ARS / hr):</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={nuevoPrecio}
              onChangeText={setNuevoPrecio}
            />

            <TouchableOpacity style={styles.btnPrecio} onPress={handleCambiarPrecio}>
              <Ionicons name="checkmark-done-outline" size={16} color="#FFF" />
              <Text style={styles.textBtn}>Actualizar Tarifa del Espacio</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerPanel: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 2,
  },
  metricasRow: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    padding: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  cardMetrica: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  valorMetrica: {
    color: '#CE93D8',
    fontSize: 18,
    fontWeight: '800',
  },
  labelMetrica: {
    color: '#AAA',
    fontSize: 10,
    marginTop: 2,
  },
  navTabs: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  btnTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  btnTabActivo: {
    borderBottomColor: '#CE93D8',
    backgroundColor: '#2A2A2A44',
  },
  textTab: {
    color: '#AAA',
    fontSize: 11,
    fontWeight: '700',
  },
  textTabActivo: {
    color: '#FFF',
    fontWeight: '800',
  },
  mainScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  cardSeccion: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 14,
    gap: 8,
  },
  labelSeccion: {
    color: '#CE93D8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  scrollEspacios: {
    gap: 8,
  },
  chipEspacio: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  chipEspacioActivo: {
    backgroundColor: '#6A1B9A',
  },
  textChip: {
    color: '#CCC',
    fontSize: 12,
    fontWeight: '600',
  },
  textChipActivo: {
    color: '#FFF',
    fontWeight: '800',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tituloBox: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  inputLabel: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 4,
  },
  boldWhite: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  precioActual: {
    color: '#66BB6A',
    fontSize: 18,
    fontWeight: '800',
  },
  textDiaDesc: {
    color: '#CE93D8',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#121212',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 14,
  },
  horariosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  btnBloquear: {
    backgroundColor: '#E65100',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  btnFija: {
    backgroundColor: '#4A148C',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  btnPrecio: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  textBtn: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  agendaGrid: {
    gap: 6,
    marginTop: 10,
  },
  itemAgendaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#161616',
  },
  rowLibre: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  rowReservado: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  rowFijo: {
    borderLeftWidth: 4,
    borderLeftColor: '#AB47BC',
  },
  rowMantenimiento: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  horaAgenda: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
    width: 90,
  },
  estadoAgenda: {
    color: '#AAA',
    fontSize: 11,
    fontWeight: '800',
    width: 100,
  },
  obsAgenda: {
    color: '#CCC',
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  cardBloqueoActivo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  bloqueoMotivo: {
    color: '#FFB74D',
    fontWeight: '700',
    fontSize: 13,
  },
  bloqueoFecha: {
    color: '#AAA',
    fontSize: 11,
    marginTop: 2,
  },
  btnDesbloquear: {
    padding: 8,
  },
  cardFijaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  fijaTitular: {
    color: '#E1BEE7',
    fontWeight: '700',
    fontSize: 13,
  },
  fijaSub: {
    color: '#AAA',
    fontSize: 11,
    marginTop: 2,
  },
  btnToggleFija: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnFijaActiva: {
    backgroundColor: '#4A148C',
  },
  btnFijaInactiva: {
    backgroundColor: '#333333',
  },
  textToggleFija: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  textoVacio: {
    color: '#777',
    fontSize: 13,
    fontStyle: 'italic',
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#121212',
  },
  tituloSinAdmin: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  subSinAdmin: {
    color: '#AAA',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
  },
  boldGreen: {
    color: '#66BB6A',
    fontWeight: '800',
  },
  botonCambiarAdmin: {
    backgroundColor: '#6A1B9A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textoBotonAdmin: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
