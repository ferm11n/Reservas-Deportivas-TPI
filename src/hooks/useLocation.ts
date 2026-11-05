import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { Coordenadas } from '../tipos';

// Coordenadas del centro de Villaguay (Plaza 25 de Mayo)
const VILLAGUAY_CENTRO: Coordenadas = {
  latitud: -31.8617,
  longitud: -59.0269,
};

export const useLocation = () => {
  const [ubicacionUsuario, setUbicacionUsuario] = useState<Coordenadas | null>(null);
  const [permisoDenegado, setPermisoDenegado] = useState(false);
  // Distinto de "denegado": el permiso está, pero el GPS falló o está apagado.
  const [errorUbicacion, setErrorUbicacion] = useState(false);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(true);

  const obtenerUbicacion = useCallback(async () => {
    setCargandoUbicacion(true);
    setErrorUbicacion(false);
    if (Platform.OS === 'web') {
      setUbicacionUsuario(VILLAGUAY_CENTRO);
      setCargandoUbicacion(false);
      return;
    }

    try {
      // expo-location es nativo: se carga recién después del guard de plataforma.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Location = require('expo-location') as typeof import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermisoDenegado(true);
        setUbicacionUsuario(null);
        setCargandoUbicacion(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUbicacionUsuario({
        latitud: loc.coords.latitude,
        longitud: loc.coords.longitude,
      });
      setPermisoDenegado(false);
    } catch {
      setErrorUbicacion(true);
      setUbicacionUsuario(null);
    } finally {
      setCargandoUbicacion(false);
    }
  }, []);

  useEffect(() => {
    obtenerUbicacion();
  }, [obtenerUbicacion]);

  /**
   * Fórmula de Haversine para calcular distancia en km entre dos puntos
   */
  const calcularDistanciaKm = (origen: Coordenadas, destino: Coordenadas): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = ((destino.latitud - origen.latitud) * Math.PI) / 180;
    const dLon = ((destino.longitud - origen.longitud) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origen.latitud * Math.PI) / 180) *
        Math.cos((destino.latitud * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  return {
    ubicacionUsuario,
    permisoDenegado,
    errorUbicacion,
    cargandoUbicacion,
    VILLAGUAY_CENTRO,
    obtenerUbicacion,
    calcularDistanciaKm,
  };
};
