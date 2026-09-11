import { useState, useEffect } from 'react';
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
  const [cargandoUbicacion, setCargandoUbicacion] = useState(true);

  useEffect(() => {
    obtenerUbicacion();
  }, []);

  const obtenerUbicacion = async () => {
    setCargandoUbicacion(true);
    if (Platform.OS === 'web') {
      setUbicacionUsuario(VILLAGUAY_CENTRO);
      setCargandoUbicacion(false);
      return;
    }

    try {
      const Location = require('expo-location');
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
      setPermisoDenegado(true);
      setUbicacionUsuario(null);
    } finally {
      setCargandoUbicacion(false);
    }
  };

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
    cargandoUbicacion,
    VILLAGUAY_CENTRO,
    obtenerUbicacion,
    calcularDistanciaKm,
  };
};
