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
import { Bloqueo, Espacio, ReservaFija, Reserva, Turno } from '../../tipos';
import {
  obtenerEspacios,
  obtenerAgenda,
  obtenerReservasDeTodos,
  obtenerBloqueos,
  crearBloqueo,
  eliminarBloqueo,
  obtenerFijas,
  crearReservaFija,
  editarReservaFija,
  bajaReservaFija,
  actualizarPrecioEspacio,
  marcarAusente,
} from '../../servicios/reservas';
import { fechaLocal } from '../../servicios/api';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const calcularFechaDesde = (dia: 0 | 1 | 2 | 3 | 4 | 5 | 6, hora: string): string => {
  const fecha = new Date();
  let diasHasta = (dia - fecha.getDay() + 7) % 7;
  const horaActual = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  if (diasHasta === 0 && horaActual >= hora) diasHasta = 7;
  fecha.setDate(fecha.getDate() + diasHasta);
  return fechaLocal(fecha);
};

export default function AdminScreen() {
  const { usuario } = useAuth();

  const [tabActiva, setTabActiva] = useState<'agenda' | 'bloqueos' | 'fijas' | 'tarifas'>('agenda');

  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioIdSeleccionado, setEspacioIdSeleccionado] = useState<string>('');
  const [cargando, setCargando] = useState(true);

  // Agenda del día
  const [fechaAgenda, setFechaAgenda] = useState<string>(fechaLocal());
  const [turnosAgenda, setTurnosAgenda] = useState<Turno[]>([]);
  const [reservasAgenda, setReservasAgenda] = useState<Reserva[]>([]);
  const [cargandoAgenda, setCargandoAgenda] = useState(false);

  // Bloqueos por mantenimiento / lluvia
  const [fechaBloqueo, setFechaBloqueo] = useState<string>(fechaLocal());
  const [bloqueoDiaCompleto, setBloqueoDiaCompleto] = useState(false);
  const [inicioBloqueo, setInicioBloqueo] = useState<string>('14:00');
  const [finBloqueo, setFinBloqueo] = useState<string>('20:00');
  const [motivoBloqueo, setMotivoBloqueo] = useState<string>('Cancha anegada por lluvia');
  const [listaBloqueos, setListaBloqueos] = useState<Bloqueo[]>([]);

  // Reservas Fijas semanales
  const [reservasFijas, setReservasFijas] = useState<ReservaFija[]>([]);
  const [titularFija, setTitularFija] = useState<string>('Club Atlético Villaguay');
  const [diaSemanaFija, setDiaSemanaFija] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(2); // Martes
  const [inicioFija, setInicioFija] = useState<string>('21:00');
  const [finFija, setFinFija] = useState<string>('22:00');
  const [desdeFija, setDesdeFija] = useState<string>(() => calcularFechaDesde(2, '21:00'));
  const [fijaEditandoId, setFijaEditandoId] = useState<string | null>(null);

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

  useEffect(() => {
    if (espacioIdSeleccionado) {
      cargarBloqueos();
      cargarFijas();
    }
  }, [espacioIdSeleccionado]);

  const cargarDatosIniciales = async () => {
    setCargando(true);
    const res = await obtenerEspacios();
    if ('datos' in res) {
      setEspacios(res.datos);
      if (res.datos.length > 0) {
        setEspacioIdSeleccionado(res.datos[0].id);
        setNuevoPrecio(res.datos[0].precioPorHora.toString());
      }
    } else {
      Alert.alert('No se pudieron cargar los espacios', res.error.mensaje);
    }
    setCargando(false);
  };

  const cargarAgendaDelDia = async () => {
    setCargandoAgenda(true);
    const [agenda, reservas] = await Promise.all([
      obtenerAgenda(fechaAgenda),
      obtenerReservasDeTodos({ fecha: fechaAgenda, espacioId: espacioIdSeleccionado }),
    ]);
    if ('datos' in agenda && 'datos' in reservas) {
      setTurnosAgenda(agenda.datos.filter((turno) => turno.espacioId === espacioIdSeleccionado));
      setReservasAgenda(reservas.datos);
    } else {
      const error = 'error' in agenda ? agenda.error : 'error' in reservas ? reservas.error : null;
      if (error) Alert.alert('No se pudo cargar la agenda', error.mensaje);
    }
    setCargandoAgenda(false);
  };

  const cargarBloqueos = async () => {
    const res = await obtenerBloqueos(espacioIdSeleccionado);
    if ('datos' in res) setListaBloqueos(res.datos);
    else Alert.alert('No se pudieron cargar los bloqueos', res.error.mensaje);
  };

  const cargarFijas = async () => {
    const res = await obtenerFijas(espacioIdSeleccionado);
    if ('datos' in res) setReservasFijas(res.datos);
    else Alert.alert('No se pudieron cargar las reservas fijas', res.error.mensaje);
  };

  const handleCargarBloqueo = async () => {
    if (!motivoBloqueo.trim()) {
      Alert.alert('Motivo requerido', 'Por favor ingresá la causa del bloqueo.');
      return;
    }

    const res = await crearBloqueo({
      espacioIds: [espacioIdSeleccionado],
      fecha: fechaBloqueo,
      inicio: bloqueoDiaCompleto ? undefined : inicioBloqueo,
      fin: bloqueoDiaCompleto ? undefined : finBloqueo,
      motivo: motivoBloqueo.trim(),
    });
    if ('error' in res) {
      Alert.alert('No se pudo registrar el bloqueo', res.error.mensaje);
      return;
    }
    await Promise.all([cargarBloqueos(), cargarAgendaDelDia()]);
    Alert.alert('Bloqueo registrado', 'Los turnos seleccionados quedaron bloqueados.');
  };

  const handleEliminarBloqueo = (id: string) => {
    Alert.alert('Desbloquear Turno', '¿Deseas levantar este bloqueo de mantenimiento?', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Desbloquear',
        onPress: async () => {
          const res = await eliminarBloqueo(id);
          if ('error' in res) {
            Alert.alert('No se pudo quitar el bloqueo', res.error.mensaje);
            return;
          }
          await Promise.all([cargarBloqueos(), cargarAgendaDelDia()]);
          Alert.alert('Bloqueo removido', 'La API actualizó la disponibilidad del espacio.');
        },
      },
    ]);
  };

  const handleCargarFija = async () => {
    if (!titularFija.trim()) {
      Alert.alert('Titular requerido', 'Ingresá el nombre del titular, club o grupo.');
      return;
    }

    const datos = {
      espacioId: espacioIdSeleccionado,
      titular: titularFija.trim(),
      dia: diaSemanaFija,
      inicio: inicioFija,
      fin: finFija,
      desde: desdeFija,
    };
    const res = fijaEditandoId
      ? await editarReservaFija(fijaEditandoId, datos)
      : await crearReservaFija({ ...datos, hasta: null });
    if ('datos' in res) {
      setFijaEditandoId(null);
      await cargarFijas();
      Alert.alert(
        fijaEditandoId ? 'Reserva fija actualizada' : 'Reserva fija registrada',
        `Se guardó la reserva semanal de: ${titularFija}`
      );
      cargarAgendaDelDia();
    } else {
      Alert.alert('No se pudo crear la reserva fija', res.error.mensaje);
    }
  };

  const handleDarDeBajaFija = async (id: string) => {
    const res = await bajaReservaFija(id);
    if ('error' in res) {
      Alert.alert('No se pudo dar de baja', res.error.mensaje);
      return;
    }
    await Promise.all([cargarFijas(), cargarAgendaDelDia()]);
  };

  const handleCambiarPrecio = async () => {
    const val = parseInt(nuevoPrecio, 10);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Precio inválido', 'Ingresá un monto numérico positivo.');
      return;
    }

    const res = await actualizarPrecioEspacio(espacioIdSeleccionado, val);
    if ('error' in res) {
      Alert.alert('No se pudo actualizar la tarifa', res.error.mensaje);
      return;
    }
    setEspacios((actuales) => actuales.map((espacio) => (espacio.id === res.datos.id ? res.datos : espacio)));
    Alert.alert('Tarifa actualizada', 'Se modificó el precio por hora del espacio deportivo.');
  };

  const handleMarcarAusente = async (reservaId: string) => {
    const res = await marcarAusente(reservaId);
    if ('error' in res) {
      Alert.alert('No se pudo marcar la ausencia', res.error.mensaje);
      return;
    }
    await cargarAgendaDelDia();
  };

  const espacioActual = espacios.find((e) => e.id === espacioIdSeleccionado);
  const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Los permisos de administración los determina el rol autenticado por la API.
  if (usuario?.rol !== 'administrador') {
    return (
      <View style={styles.centrado}>
        <Ionicons name="shield-outline" size={64} color="#6A1B9A" />
        <Text style={styles.tituloSinAdmin}>Acceso Restringido — Administrador</Text>
        <Text style={styles.subSinAdmin}>
          Tu cuenta es de rol <Text style={styles.boldGreen}>{usuario?.rol.toUpperCase()}</Text>. Para administrar tarifas y reservas fijas, ingresá con la cuenta de administrador de demo.
        </Text>
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
                {turnosAgenda.map((turno) => {
                  const reserva = reservasAgenda.find((item) => item.id === turno.reservaId);
                  return (
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
                        {turno.motivoBloqueo || (turno.estado === 'libre' ? `$${turno.precio}` : reserva?.id || 'Reservado')}
                      </Text>
                      {reserva?.estado === 'confirmada' && (
                        <TouchableOpacity
                          style={[styles.btnToggleFija, styles.btnFijaInactiva]}
                          onPress={() => handleMarcarAusente(reserva.id)}
                        >
                          <Text style={styles.textToggleFija}>AUSENTE</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
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

              <TouchableOpacity
                style={[styles.btnDiaCompleto, bloqueoDiaCompleto && styles.btnDiaCompletoActivo]}
                onPress={() => setBloqueoDiaCompleto((actual) => !actual)}
              >
                <Ionicons name={bloqueoDiaCompleto ? 'checkbox' : 'square-outline'} size={18} color="#FFF" />
                <Text style={styles.textBtn}>{bloqueoDiaCompleto ? 'Bloquear todo el día' : 'Bloquear sólo una franja horaria'}</Text>
              </TouchableOpacity>

              {!bloqueoDiaCompleto && (
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
              )}

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
                      <Text style={styles.bloqueoFecha}>
                        {b.fecha} · {b.inicio && b.fin ? `${b.inicio}–${b.fin}` : 'día completo'}
                      </Text>
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
                onChangeText={(t) => {
                  const dia = Number.parseInt(t, 10);
                  if (dia >= 0 && dia <= 6) {
                    const diaValido = dia as 0 | 1 | 2 | 3 | 4 | 5 | 6;
                    setDiaSemanaFija(diaValido);
                    if (!fijaEditandoId) setDesdeFija(calcularFechaDesde(diaValido, inicioFija));
                  }
                }}
              />
              <Text style={styles.textDiaDesc}>Seleccionado: {diasNombres[diaSemanaFija] || 'Martes'}</Text>

              <Text style={styles.inputLabel}>Hora Inicio (HH:MM):</Text>
              <TextInput style={styles.input} value={inicioFija} onChangeText={setInicioFija} />
              <Text style={styles.inputLabel}>Hora Fin (HH:MM):</Text>
              <TextInput style={styles.input} value={finFija} onChangeText={setFinFija} />
              <Text style={styles.inputLabel}>Vigente desde (AAAA-MM-DD):</Text>
              <TextInput style={styles.input} value={desdeFija} onChangeText={setDesdeFija} />

              <TouchableOpacity style={styles.btnFija} onPress={handleCargarFija}>
                <Ionicons name="add-circle-outline" size={16} color="#FFF" />
                <Text style={styles.textBtn}>{fijaEditandoId ? 'Guardar Cambios' : 'Guardar Reserva Fija'}</Text>
              </TouchableOpacity>
              {fijaEditandoId && (
                <TouchableOpacity
                  style={styles.btnCancelarEdicion}
                  onPress={() => setFijaEditandoId(null)}
                >
                  <Text style={styles.textBtn}>Cancelar Edición</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.cardSeccion}>
              <Text style={styles.labelSeccion}>RESERVAS FIJAS REGISTRADAS</Text>
              {reservasFijas.length === 0 && (
                <Text style={styles.textoVacio}>No hay reservas fijas activas en este espacio.</Text>
              )}
              {reservasFijas.map((f) => (
                <View key={f.id} style={styles.cardFijaItem}>
                  <View style={styles.flex1}>
                    <Text style={styles.fijaTitular}>{f.titular}</Text>
                    <Text style={styles.fijaSub}>
                      {diasNombres[f.dia]} {f.inicio}–{f.fin} · desde {f.desde}
                    </Text>
                  </View>
                  <View style={styles.accionesFija}>
                    <TouchableOpacity
                      style={[styles.btnToggleFija, styles.btnFijaActiva]}
                      onPress={() => {
                        setFijaEditandoId(f.id);
                        setTitularFija(f.titular);
                        setDiaSemanaFija(f.dia);
                        setInicioFija(f.inicio);
                        setFinFija(f.fin);
                        setDesdeFija(f.desde);
                      }}
                    >
                      <Text style={styles.textToggleFija}>EDITAR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnToggleFija, styles.btnFijaInactiva]}
                      onPress={() => Alert.alert('Dar de baja reserva fija', `¿Dar de baja la reserva de ${f.titular}?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Dar de baja', style: 'destructive', onPress: () => handleDarDeBajaFija(f.id) },
                      ])}
                    >
                      <Text style={styles.textToggleFija}>DAR DE BAJA</Text>
                    </TouchableOpacity>
                  </View>
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
  btnDiaCompleto: {
    backgroundColor: '#292929',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDiaCompletoActivo: {
    backgroundColor: '#E65100',
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
  btnCancelarEdicion: {
    backgroundColor: '#424242',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
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
  accionesFija: {
    gap: 6,
    alignItems: 'flex-end',
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
