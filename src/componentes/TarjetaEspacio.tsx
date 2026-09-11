import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Espacio, Deporte } from '../tipos';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Props {
  espacio: Espacio;
  deporte?: Deporte;
  esFavorito?: boolean;
  onToggleFavorito?: () => void;
}

export const TarjetaEspacio: React.FC<Props> = ({
  espacio,
  deporte,
  esFavorito = false,
  onToggleFavorito,
}) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => router.push(`/espacio/${espacio.id}` as any)}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: espacio.imagenes[0] || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?q=80&w=800',
          }}
          style={styles.image}
        />
        <View style={[styles.badgeDeporte, { backgroundColor: deporte?.color || '#2E7D32' }]}>
          <Ionicons name={(deporte?.icono as any) || 'football-outline'} size={14} color="#FFF" />
          <Text style={styles.textoDeporte}>{deporte?.nombre || 'Deporte'}</Text>
        </View>

        {onToggleFavorito && (
          <TouchableOpacity style={styles.botonFavorito} onPress={onToggleFavorito}>
            <Ionicons
              name={esFavorito ? 'star' : 'star-outline'}
              size={20}
              color={esFavorito ? '#FFC107' : '#FFFFFF'}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.nombre} numberOfLines={1}>
          {espacio.nombre}
        </Text>
        <Text style={styles.complejo} numberOfLines={1}>
          <Ionicons name="location-outline" size={14} color="#888" /> {espacio.complejo}
        </Text>

        <View style={styles.tagsContainer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{espacio.superficie}</Text>
          </View>

          {espacio.iluminacion ? (
            <View style={[styles.tag, styles.tagLuz]}>
              <Ionicons name="bulb-outline" size={12} color="#1565C0" />
              <Text style={styles.tagTextLuz}>Con Luz</Text>
            </View>
          ) : (
            <View style={[styles.tag, styles.tagSinLuz]}>
              <Ionicons name="moon-outline" size={12} color="#D32F2F" />
              <Text style={styles.tagTextSinLuz}>Sin Luz</Text>
            </View>
          )}

          {espacio.videoUrl && (
            <View style={[styles.tag, styles.tagVideo]}>
              <Ionicons name="videocam-outline" size={12} color="#4A148C" />
              <Text style={styles.tagTextVideo}>Video 30s</Text>
            </View>
          )}
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.precio}>${espacio.precioPorHora.toLocaleString('es-AR')} / hr</Text>
          <View style={styles.botonVer}>
            <Text style={styles.textoBotonVer}>Ver Turnos</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  imageContainer: {
    height: 150,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeDeporte: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  textoDeporte: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  botonFavorito: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 20,
  },
  content: {
    padding: 14,
  },
  nombre: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  complejo: {
    color: '#AAAAAA',
    fontSize: 13,
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    color: '#CCCCCC',
    fontSize: 11,
    fontWeight: '500',
  },
  tagLuz: {
    backgroundColor: '#0D47A133',
    borderColor: '#1565C0',
    borderWidth: 0.5,
  },
  tagTextLuz: {
    color: '#64B5F6',
    fontSize: 11,
    fontWeight: '600',
  },
  tagSinLuz: {
    backgroundColor: '#B71C1C33',
    borderColor: '#D32F2F',
    borderWidth: 0.5,
  },
  tagTextSinLuz: {
    color: '#EF9A9A',
    fontSize: 11,
    fontWeight: '600',
  },
  tagVideo: {
    backgroundColor: '#4A148C33',
    borderColor: '#AB47BC',
    borderWidth: 0.5,
  },
  tagTextVideo: {
    color: '#CE93D8',
    fontSize: 11,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingTop: 10,
    marginTop: 2,
  },
  precio: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '800',
  },
  botonVer: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textoBotonVer: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
