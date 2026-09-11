import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Espacio } from '../../tipos';
import { obtenerEspacios } from '../../servicios/reservas';
import { useLocation } from '../../hooks/useLocation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function MapScreen() {
  const router = useRouter();
  const { ubicacionUsuario, permisoDenegado, VILLAGUAY_CENTRO, calcularDistanciaKm } = useLocation();

  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioSeleccionado, setEspacioSeleccionado] = useState<Espacio | null>(null);

  useEffect(() => {
    obtenerEspacios().then((res) => {
      if ('datos' in res) setEspacios(res.datos);
    });
  }, []);

  const regionInicial = {
    latitude: VILLAGUAY_CENTRO.latitud,
    longitude: VILLAGUAY_CENTRO.longitud,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <View style={styles.container}>
      {/* Banner de Estado de Permiso de Ubicación */}
      {permisoDenegado && (
        <View style={styles.bannerPermiso}>
          <Ionicons name="location-outline" size={16} color="#FFD54F" />
          <Text style={styles.textoPermiso}>
            Ubicación denegada — Podes explorar los predios en el mapa de Villaguay igualmente.
          </Text>
        </View>
      )}

      {/* Mapa Interactivo / Fallback Web */}
      <View style={styles.mapaContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.webFallback}>
            <Ionicons name="map-outline" size={48} color="#4CAF50" />
            <Text style={styles.webTitulo}>Mapa de Predios de Villaguay</Text>
            <Text style={styles.webSub}>
              Visualizá los 11 espacios deportivos municipales distribuidos en la ciudad.
            </Text>
          </View>
        ) : (
          <MapView style={styles.mapa} initialRegion={regionInicial}>
            {/* Ubicación Actual del Usuario */}
            {ubicacionUsuario && (
              <Marker
                coordinate={{
                  latitude: ubicacionUsuario.latitud,
                  longitude: ubicacionUsuario.longitud,
                }}
                title="Tu Ubicación"
                pinColor="#2196F3"
              />
            )}

            {/* Marcadores de Canchas */}
            {espacios.map((esp) => (
              <Marker
                key={esp.id}
                coordinate={{
                  latitude: esp.coordenadas.latitud,
                  longitude: esp.coordenadas.longitud,
                }}
                title={esp.nombre}
                description={`${esp.complejo} - $${esp.precioPorHora}/hr`}
                onPress={() => setEspacioSeleccionado(esp)}
              >
                <Callout onPress={() => router.push(`/espacio/${esp.id}` as any)}>
                  <View style={styles.calloutBox}>
                    <Text style={styles.calloutTitle}>{esp.nombre}</Text>
                    <Text style={styles.calloutSub}>{esp.complejo}</Text>
                    <Text style={styles.calloutPrecio}>Ver Turnos →</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
        )}
      </View>

      {/* Lista Deslizable Inferior de Predios y Distancias */}
      <View style={styles.listaInferior}>
        <Text style={styles.tituloLista}>Complejos Municipales ({espacios.length} canchas)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollLista}>
          {espacios.map((esp) => {
            const distancia = ubicacionUsuario
              ? calcularDistanciaKm(ubicacionUsuario, esp.coordenadas)
              : null;

            return (
              <TouchableOpacity
                key={esp.id}
                style={[
                  styles.cardPredio,
                  espacioSeleccionado?.id === esp.id && styles.cardPredioActiva,
                ]}
                onPress={() => {
                  setEspacioSeleccionado(esp);
                  router.push(`/espacio/${esp.id}` as any);
                }}
              >
                <Text style={styles.cardNombre} numberOfLines={1}>
                  {esp.nombre}
                </Text>
                <Text style={styles.cardComplejo} numberOfLines={1}>
                  {esp.complejo}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardPrecio}>${esp.precioPorHora.toLocaleString('es-AR')}/hr</Text>
                  {distancia !== null && (
                    <Text style={styles.cardDistancia}>
                      <Ionicons name="navigate-outline" size={11} color="#4CAF50" /> {distancia} km
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  bannerPermiso: {
    backgroundColor: '#332A00',
    borderColor: '#FFD54F',
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textoPermiso: {
    color: '#FFECB3',
    fontSize: 12,
    flex: 1,
  },
  mapaContainer: {
    flex: 1,
  },
  mapa: {
    width: '100%',
    height: '100%',
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1A1A1A',
  },
  webTitulo: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  webSub: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  calloutBox: {
    padding: 6,
    width: 160,
  },
  calloutTitle: {
    fontWeight: '700',
    fontSize: 13,
  },
  calloutSub: {
    fontSize: 11,
    color: '#666',
  },
  calloutPrecio: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '700',
    marginTop: 4,
  },
  listaInferior: {
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingVertical: 12,
  },
  tituloLista: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  scrollLista: {
    paddingHorizontal: 14,
    gap: 10,
  },
  cardPredio: {
    width: 180,
    backgroundColor: '#262626',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardPredioActiva: {
    borderColor: '#4CAF50',
    backgroundColor: '#2E7D3222',
  },
  cardNombre: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cardComplejo: {
    color: '#AAA',
    fontSize: 11,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  cardPrecio: {
    color: '#66BB6A',
    fontSize: 13,
    fontWeight: '800',
  },
  cardDistancia: {
    color: '#4CAF50',
    fontSize: 11,
  },
});
