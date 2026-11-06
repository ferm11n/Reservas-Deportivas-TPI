import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const suscripcionVacia = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * En el servidor no hay esquema del cliente, así que se devuelve 'light' hasta hidratar.
 */
export function useColorScheme() {
  const hidratado = useSyncExternalStore(
    suscripcionVacia,
    () => true,
    () => false,
  );
  const colorScheme = useRNColorScheme();

  return hidratado ? colorScheme : 'light';
}
