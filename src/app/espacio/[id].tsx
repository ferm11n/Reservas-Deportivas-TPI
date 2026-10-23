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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Espacio } from '../../tipos';
import { obtenerEspacioPorId, subirArchivo } from '../../servicios/reservas';
import { VideoViewer } from '../../componentes/VideoViewer';
import { GrabadorObservacionAudio } from '../../componentes/GrabadorObservacionAudio';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { getKVItem, setKVItem } from '../../bd/kvStore';

interface ReporteCancha {
  id: string;
  tipo: 'imagen' | 'audio';
  localUri: string;
  url: string | null;
  nombre: string;
  mime: string;
  creadoEn: string;
}

export default function SpaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [reportes, setReportes] = useState<ReporteCancha[]>([]);

  useEffect(() => {
    if (!id) return;
    let activo = true;
    const cargarDetalle = async () => {
      setCargando(true);
      const res = await obtenerEspacioPorId(id);
      if (activo) {
        if ('datos' in res) {
          setEspacio(res.datos);
        } else {
          Alert.alert('No se pudo cargar la cancha', res.error.mensaje);
        }
        setCargando(false);
      }
    };
    void cargarDetalle();
    return () => {
      activo = false;
    };
  }, [id]);

  useEffect(() => {
    let activo = true;
    const cargarReportes = async () => {
      try {
        const guardados = await getKVItem(`reportes-cancha:${id}`);
        if (activo && guardados) setReportes(JSON.parse(guardados) as ReporteCancha[]);
      } catch (error) {
        console.error('Error leyendo los reportes locales de la cancha:', error);
        Alert.alert('No se pudieron cargar los reportes guardados', 'Los reportes locales no se pudieron leer.');
      }
    };
    if (id) cargarReportes();
    return () => {
      activo = false;
    };
  }, [id]);

  const guardarReportes = async (nuevosReportes: ReporteCancha[]) => {
    await setKVItem(`reportes-cancha:${id}`, JSON.stringify(nuevosReportes));
    setReportes(nuevosReportes);
  };

  const subirReporte = async (reporte: ReporteCancha, reportesActuales = reportes) => {
    const res = await subirArchivo(reporte.localUri, reporte.nombre, reporte.mime);
    if ('error' in res) {
      Alert.alert(
        'Archivo guardado en el dispositivo',
        `No se pudo subir a la API: ${res.error.mensaje}. Podés reintentar cuando vuelva la conexión.`
      );
      return;
    }

    const actualizados = reportesActuales.map((actual) =>
      actual.id === reporte.id ? { ...actual, url: res.datos.url } : actual
    );
    await guardarReportes(actualizados);
    Alert.alert('Reporte subido', 'El archivo quedó guardado en el dispositivo y en la API.');
  };

  const reintentarSubida = async (reporte: ReporteCancha) => {
    await subirReporte(reporte);
  };

  const handleTomarFotoEstado = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se requiere acceso a la galería para seleccionar una foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
        Alert.alert('Formato no compatible', 'Elegí una foto en formato JPG, PNG o WEBP para subirla.');
        return;
      }
      const tamanio = asset.fileSize ?? new File(asset.uri).info().size;
      if (tamanio && tamanio > 5 * 1024 * 1024) {
        Alert.alert('La foto supera el límite', 'La API acepta imágenes de hasta 5 MB. Elegí una foto más liviana.');
        return;
      }
      const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
      const nombre = `foto-${Date.now()}.${extension}`;
      const directorio = new Directory(Paths.document, 'reportes-cancha');
      if (!directorio.exists) directorio.create({ intermediates: true, idempotent: true });
      const archivoLocal = new File(directorio, nombre);
      await new File(asset.uri).copy(archivoLocal);

      const reporte: ReporteCancha = {
        id: `${Date.now()}-${nombre}`,
        tipo: 'imagen',
        localUri: archivoLocal.uri,
        url: null,
        nombre,
        mime,
        creadoEn: new Date().toISOString(),
      };
      const nuevosReportes = [reporte, ...reportes];
      await guardarReportes(nuevosReportes);
      await subirReporte(reporte, nuevosReportes);
    } catch (error) {
      console.error('Error al guardar o subir la foto de la cancha:', error);
      Alert.alert('No se pudo guardar la foto', 'Revisá el acceso a la galería y el almacenamiento del dispositivo.');
    }
  };

  const handleAudioGrabado = async (uri: string) => {
    const nombre = `observacion-${Date.now()}.m4a`;
    const reporte: ReporteCancha = {
      id: `${Date.now()}-${nombre}`,
      tipo: 'audio',
      localUri: uri,
      url: null,
      nombre,
      mime: 'audio/mp4',
      creadoEn: new Date().toISOString(),
    };
    const nuevosReportes = [reporte, ...reportes];
    await guardarReportes(nuevosReportes);
    await subirReporte(reporte, nuevosReportes);
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

      {/* Reporte fotográfico persistido y subido a la API */}
      <View style={styles.seccionFotos}>
        <View style={styles.headerFotos}>
          <Text style={styles.tituloSeccion}>FOTOS DEL ESTADO DE CANCHA</Text>
          <TouchableOpacity style={styles.btnSubirFoto} onPress={handleTomarFotoEstado}>
            <Ionicons name="camera-outline" size={16} color="#FFF" />
            <Text style={styles.textSubirFoto}>Subir Foto</Text>
          </TouchableOpacity>
        </View>

        {reportes.some((reporte) => reporte.tipo === 'imagen') ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollFotos}>
            {reportes.filter((reporte) => reporte.tipo === 'imagen').map((reporte) => (
              <View key={reporte.id} style={styles.fotoReporte}>
                <Image source={{ uri: reporte.localUri }} style={styles.thumbFoto} />
                {reporte.url ? (
                  <Text style={styles.estadoSubida}>Subida</Text>
                ) : (
                  <TouchableOpacity onPress={() => reintentarSubida(reporte)}>
                    <Text style={styles.reintentarSubida}>Reintentar</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.textoSubirObs}>
            Elegí una foto para guardarla en el dispositivo y subirla al servidor.
          </Text>
        )}
      </View>

      <GrabadorObservacionAudio
        key={id}
        audioInicial={reportes.find((reporte) => reporte.tipo === 'audio')?.localUri}
        onAudioGrabado={handleAudioGrabado}
      />
      {reportes.some((reporte) => reporte.tipo === 'audio') && (
        <View style={styles.estadoAudio}>
          <Text style={styles.textoEstadoAudio}>
            {reportes.filter((reporte) => reporte.tipo === 'audio' && reporte.url).length} nota(s) de audio subida(s)
          </Text>
          {reportes.filter((reporte) => reporte.tipo === 'audio' && !reporte.url).map((reporte) => (
            <TouchableOpacity key={reporte.id} onPress={() => reintentarSubida(reporte)}>
              <Text style={styles.textoAudioPendiente}>Reintentar subida de {reporte.nombre}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
  fotoReporte: {
    width: 100,
    alignItems: 'center',
    gap: 4,
  },
  estadoSubida: {
    color: '#66BB6A',
    fontSize: 10,
    fontWeight: '700',
  },
  reintentarSubida: {
    color: '#FFD54F',
    fontSize: 10,
    fontWeight: '700',
  },
  estadoAudio: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 4,
  },
  textoEstadoAudio: {
    color: '#66BB6A',
    fontSize: 12,
  },
  textoAudioPendiente: {
    color: '#FFD54F',
    fontSize: 12,
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
