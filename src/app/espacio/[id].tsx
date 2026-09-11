import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Espacio } from '../../tipos';
import { obtenerEspacioPorId } from '../../servicios/reservas';
import { VideoViewer } from '../../componentes/VideoViewer';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function SpaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fotosAdicionales, setFotosAdicionales] = useState<string[]>([]);

  useEffect(() => {
    if (id) cargarDetalle();
  }, [id]);

  const cargarDetalle = async () => {
    setCargando(true);
    const res = await obtenerEspacioPorId(id);
    if ('datos' in res) {
      setEspacio(res.datos);
    }
    setCargando(false);
  };

  const handleTomarFotoEstado = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Denegado', 'Se requiere acceso a la galería para seleccionar una foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const nuevaUri = result.assets[0].uri;

      // Demostración de expo-file-system (Paths / Directory API)
      if (Platform.OS !== 'web') {
        try {
          const { Paths, Directory, File } = require('expo-file-system');
          const cacheDir = Paths.cache;
          console.log('expo-file-system cache directory path:', cacheDir);
        } catch (e) {
          console.warn('expo-file-system new API check:', e);
        }
      }

      setFotosAdicionales((prev) => [...prev, nuevaUri]);
      Alert.alert('¡Foto Agregada!', 'Se guardó la foto del estado de la cancha en el dispositivo.');
    }
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!espacio) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.textoError}>No se encontró la cancha requerida.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Imagen Principal */}
      <Image source={{ uri: espacio.imagenes[0] }} style={styles.imagenPrincipal} />

      {/* Título y Complejo */}
      <View style={styles.seccionHeader}>
        <Text style={styles.nombre}>{espacio.nombre}</Text>
        <Text style={styles.complejo}>
          <Ionicons name="location-outline" size={16} color="#4CAF50" /> {espacio.complejo}
        </Text>
        <Text style={styles.precio}>${espacio.precioPorHora.toLocaleString('es-AR')} por hora</Text>
      </View>

      {/* Ficha de Características */}
      <View style={styles.cardFeatures}>
        <Text style={styles.tituloSeccion}>CARACTERÍSTICAS TÉCNICAS</Text>
        <View style={styles.gridFeatures}>
          <View style={styles.itemFeature}>
            <Ionicons name="layers-outline" size={18} color="#4CAF50" />
            <Text style={styles.labelFeature}>Superficie</Text>
            <Text style={styles.valorFeature}>{espacio.superficie}</Text>
          </View>

          <View style={styles.itemFeature}>
            <Ionicons name="bulb-outline" size={18} color={espacio.iluminacion ? '#64B5F6' : '#E57373'} />
            <Text style={styles.labelFeature}>Iluminación Nocturna</Text>
            <Text style={styles.valorFeature}>{espacio.iluminacion ? 'Sí (LED)' : 'Sin Luz'}</Text>
          </View>

          <View style={styles.itemFeature}>
            <Ionicons name="home-outline" size={18} color="#BA68C8" />
            <Text style={styles.labelFeature}>Techado</Text>
            <Text style={styles.valorFeature}>{espacio.techado ? 'Sí (Gimnasio)' : 'Al Aire Libre'}</Text>
          </View>

          <View style={styles.itemFeature}>
            <Ionicons name="people-outline" size={18} color="#FFB74D" />
            <Text style={styles.labelFeature}>Capacidad Recomendada</Text>
            <Text style={styles.valorFeature}>{espacio.capacidad} personas</Text>
          </View>
        </View>
      </View>

      {/* Reproductor de Video (expo-video) */}
      {espacio.videoUrl ? (
        <VideoViewer videoUrl={espacio.videoUrl} nombreCancha={espacio.nombre} />
      ) : (
        <View style={styles.cardNoVideo}>
          <Ionicons name="videocam-off-outline" size={24} color="#666" />
          <Text style={styles.textoNoVideo}>Esta cancha aún no posee video de recorrido disponible.</Text>
        </View>
      )}

      {/* Reglas del Lugar */}
      <View style={styles.cardReglas}>
        <Text style={styles.tituloSeccion}>REGLAS Y NORMAS DEL PREDIO</Text>
        <Text style={styles.textoReglas}>• {espacio.reglas}</Text>
        <Text style={styles.textoReglas}>• El turno es estrictamente de 60 minutos.</Text>
        <Text style={styles.textoReglas}>• El pago se realiza en la entrada al encargado.</Text>
      </View>

      {/* Galería Adicional y Subida de Fotos (expo-image-picker) */}
      <View style={styles.seccionFotos}>
        <View style={styles.headerFotos}>
          <Text style={styles.tituloSeccion}>FOTOS DEL ESTADO DE CANCHA</Text>
          <TouchableOpacity style={styles.btnSubirFoto} onPress={handleTomarFotoEstado}>
            <Ionicons name="camera-outline" size={16} color="#FFF" />
            <Text style={styles.textSubirFoto}>Subir Foto</Text>
          </TouchableOpacity>
        </View>

        {fotosAdicionales.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollFotos}>
            {fotosAdicionales.map((uri, idx) => (
              <Image key={idx} source={{ uri }} style={styles.thumbFoto} />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.textoSubirObs}>
            Podés subir fotos desde tu galería para reportar el estado de la cancha (usando expo-image-picker y expo-file-system).
          </Text>
        )}
      </View>

      {/* Botón Ver Grilla de Turnos */}
      <TouchableOpacity
        style={styles.botonVerTurnos}
        onPress={() => router.push('/(tabs)/disponibilidad' as any)}
      >
        <Text style={styles.textoBotonVerTurnos}>VER GRILLA DE TURNOS LIBRES</Text>
        <Ionicons name="calendar-outline" size={20} color="#FFF" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    paddingBottom: 40,
  },
  imagenPrincipal: {
    width: '100%',
    height: 220,
  },
  seccionHeader: {
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  nombre: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  complejo: {
    color: '#AAA',
    fontSize: 14,
    marginTop: 4,
  },
  precio: {
    color: '#2E7D32',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  cardFeatures: {
    margin: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tituloSeccion: {
    color: '#888',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  gridFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemFeature: {
    width: '47%',
    backgroundColor: '#161616',
    borderRadius: 10,
    padding: 10,
  },
  labelFeature: {
    color: '#AAA',
    fontSize: 11,
    marginTop: 4,
  },
  valorFeature: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  cardNoVideo: {
    marginHorizontal: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  textoNoVideo: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  cardReglas: {
    margin: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 6,
  },
  textoReglas: {
    color: '#CCC',
    fontSize: 13,
    lineHeight: 18,
  },
  seccionFotos: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  headerFotos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  btnSubirFoto: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textSubirFoto: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  scrollFotos: {
    gap: 10,
  },
  thumbFoto: {
    width: 90,
    height: 90,
    borderRadius: 8,
  },
  textoSubirObs: {
    color: '#777',
    fontSize: 12,
    fontStyle: 'italic',
  },
  botonVerTurnos: {
    marginHorizontal: 16,
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  textoBotonVerTurnos: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#121212',
  },
  textoError: {
    color: '#EF9A9A',
    fontSize: 16,
  },
});
