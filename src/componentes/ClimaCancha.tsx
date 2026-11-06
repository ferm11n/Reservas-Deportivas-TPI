import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  techado: boolean;
  latitud?: number;
  longitud?: number;
}

interface ClimaData {
  temperatura: number;
  probLluvia: number;
  esLluvia: boolean;
}

export const ClimaCancha: React.FC<Props> = ({
  techado,
  latitud = -31.8642,
  longitud = -59.0281,
}) => {
  const [clima, setClima] = useState<ClimaData | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    const consultarClima = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitud}&longitude=${longitud}&current=temperature_2m,precipitation&daily=precipitation_probability_max&timezone=America%2FArgentina%2FBuenos_Aires`;
        const respuesta = await fetch(url);
        const data = await respuesta.json();

        if (activo && data.current) {
          const prob = data.daily?.precipitation_probability_max?.[0] ?? 0;
          const precipitacion = data.current.precipitation ?? 0;

          setClima({
            temperatura: Math.round(data.current.temperature_2m),
            probLluvia: prob,
            esLluvia: precipitacion > 0 || prob > 40,
          });
        }
      } catch {
        // En caso de fallo de red silencioso no bloquea la pantalla
      } finally {
        if (activo) setCargando(false);
      }
    };

    void consultarClima();

    return () => {
      activo = false;
    };
  }, [latitud, longitud]);

  if (cargando) {
    return (
      <View style={styles.cargandoBox}>
        <ActivityIndicator size="small" color="#4CAF50" />
        <Text style={styles.textoCargando}>Consultando pronostico en Villaguay...</Text>
      </View>
    );
  }

  if (!clima) return null;

  return (
    <View style={[styles.container, clima.esLluvia && !techado ? styles.alertaLluvia : styles.climaNormal]}>
      <View style={styles.filaHeader}>
        <Ionicons
          name={clima.esLluvia ? 'rainy-outline' : 'sunny-outline'}
          size={20}
          color={clima.esLluvia ? '#FFB74D' : '#81C784'}
        />
        <Text style={styles.tempText}>
          {clima.temperatura}°C en Villaguay — Probabilidad de lluvia: {clima.probLluvia}%
        </Text>
      </View>

      {!techado ? (
        <Text style={styles.subtextoAlerta}>
          {clima.probLluvia > 30
            ? 'Cancha descubierta: Por reglamento municipal la actividad se suspende en caso de lluvia para proteger el suelo.'
            : 'Cancha descubierta: Condiciones optimas para jugar al aire libre.'}
        </Text>
      ) : (
        <Text style={styles.subtextoTechado}>
          Cancha techada: El turno no se suspende por mal clima.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
  },
  climaNormal: {
    backgroundColor: '#1E281E',
    borderColor: '#2E7D32',
  },
  alertaLluvia: {
    backgroundColor: '#2E2214',
    borderColor: '#E65100',
  },
  cargandoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  textoCargando: {
    color: '#888',
    fontSize: 12,
  },
  filaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tempText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  subtextoAlerta: {
    color: '#FFB74D',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  subtextoTechado: {
    color: '#81C784',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
});