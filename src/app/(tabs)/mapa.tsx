import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Espacio } from '../../tipos';
import { obtenerEspacios } from '../../servicios/reservas';
import { useLocation } from '../../hooks/useLocation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function MapScreen() {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
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
    if (webViewRef.current) {
      const script = `if (window.centrarEn) { window.centrarEn(${espacio.coordenadas.latitud}, ${espacio.coordenadas.longitud}, '${espacio.id}'); } true;`;
      webViewRef.current.injectJavaScript(script);
    }
  };

  // Generación del HTML con Leaflet.js y mosaicos Dark Mode de CartoDB / OpenStreetMap
  const generarLeafletHtml = () => {
    const latCentro = VILLAGUAY_CENTRO.latitud;
    const lngCentro = VILLAGUAY_CENTRO.longitud;

    const markersJs = espacios
      .map(
        (esp) => `
      var m = L.marker([${esp.coordenadas.latitud}, ${esp.coordenadas.longitud}], { icon: greenIcon })
        .addTo(map)
        .bindPopup(\`
          <div style="font-family: system-ui; text-align: center; padding: 4px;">
            <b style="font-size: 14px; color: #121212;">${esp.nombre}</b><br/>
            <span style="font-size: 11px; color: #666;">${esp.complejo}</span><br/>
            <b style="font-size: 13px; color: #2E7D32;">$${esp.precioPorHora.toLocaleString('es-AR')} / hr</b><br/>
            <button onclick="window.ReactNativeWebView.postMessage('NAV:${esp.id}')" style="margin-top:6px; background:#2E7D32; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">Ver Cancha →</button>
          </div>
        \`);
      markersStore['${esp.id}'] = m;
    `
      )
      .join('\n');

    const userMarkerJs = ubicacionUsuario
      ? `L.marker([${ubicacionUsuario.latitud}, ${ubicacionUsuario.longitud}], { icon: userIcon }).addTo(map).bindPopup('<b>Tu Ubicación Actual</b>');`
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #121212; }
          .leaflet-container { background: #121212; }
          .leaflet-tile { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${latCentro}, ${lngCentro}], 14);
          
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'OpenStreetMap',
            maxZoom: 19
          }).addTo(map);

          var greenIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          var userIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          var markersStore = {};
          ${markersJs}
          ${userMarkerJs}

          window.centrarEn = function(lat, lng, id) {
            map.flyTo([lat, lng], 16, { duration: 1.2 });
            if (markersStore[id]) {
              markersStore[id].openPopup();
            }
          };
        </script>
      </body>
      </html>
    `;
  };

  const handleMessage = (event: any) => {
    const data: string = event.nativeEvent.data;
    if (data.startsWith('NAV:')) {
      const espId = data.replace('NAV:', '');
      router.push(`/espacio/${espId}` as any);
    }
  };

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

      {/* Mapa Interactivo con Leaflet Dark Mode */}
      <View style={styles.mapaContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.webFallback}>
            <Ionicons name="map-outline" size={56} color="#4CAF50" />
            <Text style={styles.webTitulo}>Mapa de Complejos Deportivos de Villaguay</Text>
            <Text style={styles.webSub}>
              Seleccioná un predio en el listado inferior para consultar sus canchas y turnos disponibles.
            </Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: generarLeafletHtml() }}
            style={styles.mapa}
            onMessage={handleMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        )}
      </View>

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
  mapaContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  mapa: {
    width: '100%',
    height: '100%',
    backgroundColor: '#121212',
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
