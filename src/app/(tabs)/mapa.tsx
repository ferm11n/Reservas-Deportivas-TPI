import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Coordenadas, Espacio } from '../../tipos';
import MapaComplejos from '../../componentes/MapaComplejos';
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
      if ('datos' in res) {
        setEspacios(res.datos);
        if (res.datos.length > 0) {
          setEspacioSeleccionado(res.datos[0]);
        }
      }
    });
  }, []);

  const centrarEnPredio = (espacio: Espacio) => {
    setEspacioSeleccionado(espacio);
  };

  const centro: Coordenadas = VILLAGUAY_CENTRO;

  return (
    <View style={styles.container}>
      {/* Banner de Estado de Permiso de Ubicación */}
      {permisoDenegado && (
        <View style={styles.bannerPermiso}>
          <Ionicons name="location-outline" size={16} color="#FFD54F" />
          <Text style={styles.textoPermiso}>
            Ubicación denegada — Podés explorar los predios en el mapa igualmente.
          </Text>
        </View>
      )}

      {/* Mapa nativo en iOS y Android; el listado sigue disponible en web. */}
      <MapaComplejos
        espacios={espacios}
        centro={centro}
        ubicacionUsuario={ubicacionUsuario}
        espacioSeleccionado={espacioSeleccionado}
        onSeleccionar={centrarEnPredio}
        onAbrir={(espacio) => router.push(`/espacio/${espacio.id}` as any)}
      />

      {/* Lista Deslizable Inferior de Predios y Distancias en km */}
      <View style={styles.listaInferior}>
        <Text style={styles.tituloLista}>COMPLEJOS MUNICIPALES ({espacios.length} ESPACIOS)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollLista}>
          {espacios.map((esp) => {
            const esSeleccionado = espacioSeleccionado?.id === esp.id;
            const distancia = ubicacionUsuario
              ? calcularDistanciaKm(ubicacionUsuario, esp.coordenadas)
              : null;

            return (
              <TouchableOpacity
                key={esp.id}
                style={[styles.cardPredio, esSeleccionado && styles.cardPredioActiva]}
                onPress={() => centrarEnPredio(esp)}
              >
                <Text style={styles.cardNombre} numberOfLines={1}>
                  {esp.nombre}
                </Text>
                <Text style={styles.cardComplejo} numberOfLines={1}>
                  {esp.complejo}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardPrecio}>${esp.precioPorHora.toLocaleString('es-AR')}/hr</Text>
                  {distancia !== null ? (
                    <Text style={styles.cardDistancia}>
                      <Ionicons name="navigate-outline" size={11} color="#4CAF50" /> {distancia} km
                    </Text>
                  ) : (
                    <Text style={styles.cardVerFicha}>Ver Ficha →</Text>
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
  listaInferior: {
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingVertical: 12,
  },
  tituloLista: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  scrollLista: {
    paddingHorizontal: 14,
    gap: 10,
  },
  cardPredio: {
    width: 190,
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardPredioActiva: {
    borderColor: '#4CAF50',
    borderWidth: 2,
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
    marginTop: 10,
  },
  cardPrecio: {
    color: '#66BB6A',
    fontSize: 13,
    fontWeight: '800',
  },
  cardDistancia: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
  },
  cardVerFicha: {
    color: '#4FC3F7',
    fontSize: 11,
    fontWeight: '600',
  },
});
