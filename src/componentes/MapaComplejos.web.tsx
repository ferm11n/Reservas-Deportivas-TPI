import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Coordenadas, Espacio } from '../tipos';

interface Props {
  espacios: Espacio[];
  centro: Coordenadas;
  ubicacionUsuario: Coordenadas | null;
  espacioSeleccionado: Espacio | null;
  onSeleccionar: (espacio: Espacio) => void;
  onAbrir: (espacio: Espacio) => void;
}

export default function MapaComplejos({ espacios }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="map-outline" size={56} color="#4CAF50" />
      <Text style={styles.titulo}>Mapa de Complejos Deportivos de Villaguay</Text>
      <Text style={styles.subtitulo}>
        El mapa nativo está disponible en Android y iOS. Hay {espacios.length} espacios deportivos en el listado.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1A1A1A',
  },
  titulo: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitulo: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
});
