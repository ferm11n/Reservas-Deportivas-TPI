import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface Props {
  codigoQr: string;
  size?: number;
}

export const QrViewer: React.FC<Props> = ({ codigoQr, size = 180 }) => {
  return (
    <View style={styles.card}>
      <View style={styles.qrWrapper}>
        <QRCode
          value={codigoQr}
          size={size}
          backgroundColor="#FFFFFF"
          color="#000000"
        />
      </View>
      <Text style={styles.codigoTexto}>{codigoQr}</Text>
      <Text style={styles.subtexto}>
        Mostráselo al encargado al ingresar al predio
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  qrWrapper: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  codigoTexto: {
    color: '#1E1E1E',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 14,
  },
  subtexto: {
    color: '#666666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
