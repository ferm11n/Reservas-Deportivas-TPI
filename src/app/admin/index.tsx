import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Espacio } from '../../tipos';
import {
  obtenerEspacios,
  bloquearTurno,
  crearReservaFija,
  actualizarPrecioEspacio,
} from '../../servicios/reservas';
import { useNotifications } from '../../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';

export default function AdminScreen() {
  const { notificarCancelacion } = useNotifications();

  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioIdSeleccionado, setEspacioIdSeleccionado] = useState<string>('esp-02');

  // Formulario Bloqueo
  const [fechaBloqueo, setFechaBloqueo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [inicioBloqueo, setInicioBloqueo] = useState<string>('14:00');
  const [finBloqueo, setFinBloqueo] = useState<string>('20:00');
  const [motivoBloqueo, setMotivoBloqueo] = useState<string>('Cancha anegada por lluvia');

  // Formulario Reserva Fija
  const [titularFija, setTitularFija] = useState<string>('Grupo de los Martes');
  const [diaSemanaFija, setDiaSemanaFija] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(2); // Martes
  const [inicioFija, setInicioFija] = useState<string>('21:00');

  // Formulario Precio
  const [nuevoPrecio, setNuevoPrecio] = useState<string>('15000');

  useEffect(() => {
    cargarEspacios();
  }, []);

  const cargarEspacios = async () => {
    const res = await obtenerEspacios();
    if ('datos' in res) setEspacios(res.datos);
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

    Alert.alert('Bloqueo Registrado', 'Se han bloqueado los turnos indicados en la grilla.');
  };

  const handleCargarFija = async () => {
    if (!titularFija) {
      Alert.alert('Titular requerido', 'Ingresá el nombre del titular o grupo.');
      return;
    }

    await crearReservaFija(espacioIdSeleccionado, titularFija, diaSemanaFija, inicioFija, '22:00');
    Alert.alert('Reserva Fija Creada', 'El horario quedará reservado semanalmente en la grilla.');
  };

  const handleCambiarPrecio = async () => {
    const val = parseInt(nuevoPrecio, 10);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Precio inválido', 'Ingresá un monto numérico positivo.');
      return;
    }

    await actualizarPrecioEspacio(espacioIdSeleccionado, val);
    Alert.alert('Precio Actualizado', 'Se actualizó la tarifa por hora.');
    cargarEspacios();
  };

  const espacioActual = espacios.find((e) => e.id === espacioIdSeleccionado);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Panel de Control — Dirección de Deportes</Text>

      {/* Selector de Espacio */}
      <View style={styles.cardSeccion}>
        <Text style={styles.labelSeccion}>SELECCIONAR ESPACIO A GESTIONAR</Text>
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

      {/* Seccion 1: Bloquear Turnos por Lluvia / Mantenimiento */}
      <View style={styles.cardSeccion}>
        <View style={styles.titleRow}>
          <Ionicons name="rainy-outline" size={20} color="#FFB74D" />
          <Text style={styles.tituloBox}>BLOQUEAR TURNOS (LLUVIA / MANTENIMIENTO)</Text>
        </View>

        <Text style={styles.inputLabel}>Fecha (AAAA-MM-DD):</Text>
        <TextInput style={styles.input} value={fechaBloqueo} onChangeText={setFechaBloqueo} />

        <View style={styles.horariosRow}>
          <View style={styles.flex1}>
            <Text style={styles.inputLabel}>Hora Inicio (HH:MM):</Text>
            <TextInput style={styles.input} value={inicioBloqueo} onChangeText={setInicioBloqueo} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.inputLabel}>Hora Fin (HH:MM):</Text>
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

      {/* Seccion 2: Cargar Reserva Fija Semanal */}
      <View style={styles.cardSeccion}>
        <View style={styles.titleRow}>
          <Ionicons name="repeat-outline" size={20} color="#CE93D8" />
          <Text style={styles.tituloBox}>REGISTRAR RESERVA FIJA SEMANAL</Text>
        </View>

        <Text style={styles.inputLabel}>Titular / Grupo / Club:</Text>
        <TextInput
          style={styles.input}
          placeholder="ej: Grupo de los martes"
          placeholderTextColor="#666"
          value={titularFija}
          onChangeText={setTitularFija}
        />

        <Text style={styles.inputLabel}>Día de la semana (0=Dom, 1=Lun, 2=Mar...):</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={diaSemanaFija.toString()}
          onChangeText={(t) => setDiaSemanaFija((parseInt(t, 10) || 0) as any)}
        />

        <Text style={styles.inputLabel}>Hora de Inicio (HH:MM):</Text>
        <TextInput style={styles.input} value={inicioFija} onChangeText={setInicioFija} />

        <TouchableOpacity style={styles.btnFija} onPress={handleCargarFija}>
          <Ionicons name="add-circle-outline" size={16} color="#FFF" />
          <Text style={styles.textBtn}>Guardar Reserva Fija</Text>
        </TouchableOpacity>
      </View>

      {/* Seccion 3: Cambiar Tarifas / Precio por Hora */}
      <View style={styles.cardSeccion}>
        <View style={styles.titleRow}>
          <Ionicons name="cash-outline" size={20} color="#66BB6A" />
          <Text style={styles.tituloBox}>MODIFICAR PRECIO POR HORA</Text>
        </View>

        <Text style={styles.inputLabel}>
          Espacio: <Text style={styles.boldWhite}>{espacioActual?.nombre}</Text>
        </Text>
        <Text style={styles.inputLabel}>Nuevo Precio ($ ARS / hr):</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={nuevoPrecio}
          onChangeText={setNuevoPrecio}
        />

        <TouchableOpacity style={styles.btnPrecio} onPress={handleCambiarPrecio}>
          <Ionicons name="checkmark-done-outline" size={16} color="#FFF" />
          <Text style={styles.textBtn}>Actualizar Tarifa</Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  cardSeccion: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
    gap: 8,
  },
  labelSeccion: {
    color: '#66BB6A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
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
    backgroundColor: '#2E7D32',
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
    marginBottom: 6,
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
});
