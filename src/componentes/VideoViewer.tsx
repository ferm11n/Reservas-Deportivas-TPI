import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

interface Props {
  videoUrl: string;
  nombreCancha: string;
}

export const VideoViewer: React.FC<Props> = ({ videoUrl, nombreCancha }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.titulo}>📹 Recorrido Virtual — {nombreCancha}</Text>
        <video
          src={videoUrl}
          controls
          style={{ width: '100%', height: 220, borderRadius: 12, backgroundColor: '#000' }}
        />
      </View>
    );
  }

  const player = useVideoPlayer(videoUrl, (playerInstance) => {
    playerInstance.loop = true;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>📹 Recorrido Virtual (30s) — {nombreCancha}</Text>
      <View style={styles.videoWrapper}>
        <VideoView
          style={styles.video}
          player={player}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  titulo: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  videoWrapper: {
    height: 220,
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
