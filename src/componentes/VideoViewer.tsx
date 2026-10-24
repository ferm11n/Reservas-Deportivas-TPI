import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

interface Props {
  videoUrl?: string | null;
  nombreCancha: string;
}

const VIDEO_RECORRIDO_LOCAL = require('../../assets/videos/videoCancha.mp4');

export const VideoViewer: React.FC<Props> = ({ videoUrl, nombreCancha }) => {
  const player = useVideoPlayer(videoUrl || VIDEO_RECORRIDO_LOCAL, (playerInstance) => {
    playerInstance.loop = true;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>📹 Recorrido Virtual — {nombreCancha}</Text>
      <View style={styles.videoWrapper}>
        <VideoView
          style={styles.video}
          player={player}
          nativeControls
          contentFit="contain"
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
