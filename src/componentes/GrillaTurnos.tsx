import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Turno } from '../tipos';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  turnos: Turno[];
  turnoSeleccionadoId?: string | null;
  onSeleccionarTurno?: (turno: Turno) => void;
}

export const GrillaTurnos: React.FC<Props> = ({
  turnos,
  turnoSeleccionadoId,
  onSeleccionarTurno,
}) => {
  return (
    <View style={styles.container}>
      {turnos.map((turno) => {
        const esSeleccionado = turnoSeleccionadoId === turno.id;
        const esLibre = turno.estado === 'libre';

        return (
          <TouchableOpacity
            key={turno.id}
            disabled={!esLibre}
            style={[
              styles.itemRow,
              turno.estado === 'libre' && styles.rowLibre,
              turno.estado === 'reservado' && styles.rowReservado,
              turno.estado === 'fijo' && styles.rowFijo,
              turno.estado === 'mantenimiento' && styles.rowMantenimiento,
              esSeleccionado && styles.rowSeleccionado,
            ]}
            onPress={() => esLibre && onSeleccionarTurno && onSeleccionarTurno(turno)}
            activeOpacity={0.7}
          >
            <View style={styles.horarioCol}>
              <Ionicons name="time-outline" size={16} color="#AAAAAA" />
              <Text style={styles.horarioTexto}>
                {turno.inicio} - {turno.fin}
              </Text>
            </View>

            <View style={styles.estadoCol}>
              {turno.estado === 'libre' && (
                <View style={styles.badgeLibre}>
                  <Text style={styles.textoLibre}>LIBRE</Text>
                </View>
              )}

              {turno.estado === 'reservado' && (
                <View style={styles.badgeReservado}>
                  <Text style={styles.textoReservado}>OCUPADO</Text>
                </View>
              )}

              {turno.estado === 'fijo' && (
                <View style={styles.badgeFijo}>
                  <Ionicons name="repeat-outline" size={12} color="#CE93D8" />
                  <Text style={styles.textoFijo} numberOfLines={1}>
                    FIJO {turno.motivoBloqueo ? `- ${turno.motivoBloqueo.replace('Reservado: ', '')}` : ''}
                  </Text>
                </View>
              )}

              {turno.estado === 'mantenimiento' && (
                <View style={styles.badgeMantenimiento}>
                  <Ionicons name="warning-outline" size={12} color="#FFCC80" />
                  <Text style={styles.textoMantenimiento} numberOfLines={1}>
                    {turno.motivoBloqueo || 'MANTENIMIENTO'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.precioCol}>
              {esLibre && (
                <Text style={styles.precioTexto}>${turno.precio.toLocaleString('es-AR')}</Text>
              )}
              {esLibre && (
                <View style={[styles.radioCheck, esSeleccionado && styles.radioChecked]}>
                  {esSeleccionado && <View style={styles.radioInner} />}
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1E1E1E',
  },
  rowLibre: {
    borderColor: '#2E7D3266',
    backgroundColor: '#1B5E2015',
  },
  rowReservado: {
    borderColor: '#C6282844',
    backgroundColor: '#B71C1C10',
    opacity: 0.7,
  },
  rowFijo: {
    borderColor: '#6A1B9A55',
    backgroundColor: '#4A148C15',
    opacity: 0.8,
  },
  rowMantenimiento: {
    borderColor: '#E6510055',
    backgroundColor: '#E6510015',
    opacity: 0.75,
  },
  rowSeleccionado: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#2E7D3233',
  },
  horarioCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 110,
  },
  horarioTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  estadoCol: {
    flex: 1,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
  },
  badgeLibre: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  textoLibre: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeReservado: {
    backgroundColor: '#C62828',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  textoReservado: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeFijo: {
    backgroundColor: '#4A148C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textoFijo: {
    color: '#E1BEE7',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeMantenimiento: {
    backgroundColor: '#E65100',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textoMantenimiento: {
    color: '#FFE0B2',
    fontSize: 11,
    fontWeight: '700',
  },
  precioCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  precioTexto: {
    color: '#66BB6A',
    fontSize: 14,
    fontWeight: '800',
  },
  radioCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioChecked: {
    borderColor: '#4CAF50',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
});
