import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, CameraRef, Map, Marker } from '@maplibre/maplibre-react-native';
import { Coordenadas, Espacio } from '../tipos';

interface Props {
  espacios: Espacio[];
  centro: Coordenadas;
  ubicacionUsuario: Coordenadas | null;
  espacioSeleccionado: Espacio | null;
  onSeleccionar: (espacio: Espacio) => void;
  onAbrir: (espacio: Espacio) => void;
}

const ESTILO_MAPA = 'https://tiles.openfreemap.org/styles/liberty';

export default function MapaComplejos({
  espacios,
  centro,
  ubicacionUsuario,
  espacioSeleccionado,
  onSeleccionar,
  onAbrir,
}: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const [errorMapa, setErrorMapa] = useState(false);
  const [mapaListo, setMapaListo] = useState(false);

  useEffect(() => {
    if (mapaListo && espacioSeleccionado) {
      cameraRef.current?.easeTo({
        center: [espacioSeleccionado.coordenadas.longitud, espacioSeleccionado.coordenadas.latitud],
        zoom: 14,
        duration: 500,
      });
    }
  }, [mapaListo, espacioSeleccionado]);

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={ESTILO_MAPA}
        attribution
        onWillStartLoadingMap={() => {
          setErrorMapa(false);
          setMapaListo(false);
        }}
        onDidFinishLoadingMap={() => {
          setErrorMapa(false);
          setMapaListo(true);
        }}
        onDidFailLoadingMap={() => setErrorMapa(true)}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [centro.longitud, centro.latitud],
            zoom: 13.5,
          }}
        />
        {espacios.map((espacio) => (
          <Marker
            key={espacio.id}
            id={String(espacio.id)}
            lngLat={[espacio.coordenadas.longitud, espacio.coordenadas.latitud]}
            onPress={() => onSeleccionar(espacio)}
          >
            <View
              style={[
                styles.marker,
                espacio.id === espacioSeleccionado?.id && styles.markerSeleccionado,
              ]}
            >
              <View style={styles.markerCentro} />
            </View>
          </Marker>
        ))}
        {ubicacionUsuario && (
          <Marker
            id="ubicacion-usuario"
            lngLat={[ubicacionUsuario.longitud, ubicacionUsuario.latitud]}
            pointerEvents="none"
          >
            <View style={styles.ubicacionUsuario}>
              <View style={styles.ubicacionUsuarioCentro} />
            </View>
          </Marker>
        )}
      </Map>
      {errorMapa && (
        <View style={styles.errorMapa}>
          <Text style={styles.textoError}>
            No se pudo cargar el mapa. Revisá la conexión a internet e intentá de nuevo.
          </Text>
        </View>
      )}
      {espacioSeleccionado && (
        <View style={styles.ficha}>
          <View style={styles.datosFicha}>
            <Text style={styles.nombre} numberOfLines={1}>
              {espacioSeleccionado.nombre}
            </Text>
            <Text style={styles.complejo} numberOfLines={1}>
              {espacioSeleccionado.complejo}
            </Text>
            <Text style={styles.precio}>
              ${espacioSeleccionado.precioPorHora.toLocaleString('es-AR')} / hora
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={styles.botonFicha}
            onPress={() => onAbrir(espacioSeleccionado)}
          >
            <Text style={styles.textoBoton}>Ver cancha</Text>
          </Pressable>
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
  map: {
    flex: 1,
  },
  marker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  markerSeleccionado: {
    backgroundColor: '#2E7D32',
    transform: [{ scale: 1.15 }],
  },
  markerCentro: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  ubicacionUsuario: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D233',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  ubicacionUsuarioCentro: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1976D2',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  errorMapa: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#332A00',
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  textoError: {
    color: '#FFECB3',
    fontSize: 12,
    textAlign: 'center',
  },
  ficha: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 5,
  },
  datosFicha: {
    flex: 1,
  },
  nombre: {
    color: '#121212',
    fontSize: 14,
    fontWeight: '700',
  },
  complejo: {
    color: '#555555',
    fontSize: 12,
    marginTop: 2,
  },
  precio: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  botonFicha: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1565C0',
  },
  textoBoton: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
