import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  audioInicial?: string;
  onAudioGrabado: (uri: string) => Promise<void>;
}

export const GrabadorObservacionAudio: React.FC<Props> = ({ audioInicial, onAudioGrabado }) => {
  const opcionesGrabacion = useMemo(
    () => ({ ...RecordingPresets.HIGH_QUALITY, directory: 'document' as const }),
    []
  );
  const grabador = useAudioRecorder(opcionesGrabacion);
  const estadoGrabador = useAudioRecorderState(grabador);
  const reproductor = useAudioPlayer(null);
  const estadoReproductor = useAudioPlayerStatus(reproductor);
  const [grabacionUri, setGrabacionUri] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const audioUri = grabacionUri ?? audioInicial ?? null;

  useEffect(() => {
    if (audioUri) {
      reproductor.replace(audioUri);
    } else {
      reproductor.pause();
    }
  }, [audioUri, reproductor]);

  const alternarGrabacion = async () => {
    try {
      if (estadoGrabador.isRecording) {
        await grabador.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        const uri = grabador.uri;
        if (!uri) {
          Alert.alert('No se guardó el audio', 'La grabación terminó sin generar un archivo.');
          return;
        }
        setGrabacionUri(uri);
        setSubiendo(true);
        try {
          await onAudioGrabado(uri);
        } finally {
          setSubiendo(false);
        }
        return;
      }

      const permiso = await AudioModule.requestRecordingPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert('Permiso de micrófono denegado', 'Habilitá el micrófono para grabar una observación.');
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await grabador.prepareToRecordAsync();
      grabador.record();
    } catch (error) {
      console.error('Error al grabar o subir la observación de audio:', error);
      Alert.alert('No se pudo completar la grabación', 'Revisá el permiso del micrófono y la conexión con la API.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>OBSERVACIÓN DE AUDIO</Text>
      <Text style={styles.descripcion}>Grabá una nota breve sobre el estado de la cancha.</Text>
      <View style={styles.botones}>
        <TouchableOpacity
          style={[styles.boton, estadoGrabador.isRecording && styles.botonGrabando]}
          onPress={alternarGrabacion}
          disabled={subiendo}
        >
          {subiendo ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Ionicons name={estadoGrabador.isRecording ? 'stop' : 'mic-outline'} size={18} color="#FFF" />
          )}
          <Text style={styles.textoBoton}>
            {subiendo ? 'Subiendo…' : estadoGrabador.isRecording ? 'Detener y subir' : 'Grabar nota'}
          </Text>
        </TouchableOpacity>
        {audioUri && !estadoGrabador.isRecording && (
          <TouchableOpacity
            style={styles.botonReproducir}
            onPress={() => (estadoReproductor.playing ? reproductor.pause() : reproductor.play())}
          >
            <Ionicons name={estadoReproductor.playing ? 'pause' : 'play'} size={18} color="#FFF" />
            <Text style={styles.textoBoton}>{estadoReproductor.playing ? 'Pausar' : 'Reproducir'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {estadoGrabador.isRecording && (
        <Text style={styles.estado}>Grabando… {Math.floor(estadoGrabador.durationMillis / 1000)} s</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  titulo: {
    color: '#888',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  descripcion: {
    color: '#AAA',
    fontSize: 12,
  },
  botones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  boton: {
    backgroundColor: '#B71C1C',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  botonGrabando: {
    backgroundColor: '#7F1D1D',
  },
  botonReproducir: {
    backgroundColor: '#1565C0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textoBoton: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  estado: {
    color: '#FF8A80',
    fontSize: 12,
  },
});
