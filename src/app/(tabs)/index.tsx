import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Espacio, Deporte } from '../../tipos';
import { obtenerEspacios, obtenerDeportes } from '../../servicios/reservas';
import { TarjetaEspacio } from '../../componentes/TarjetaEspacio';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function CatalogScreen() {
  const { usuario, actualizarUsuario } = useAuth();

  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const [deporteSeleccionado, setDeporteSeleccionado] = useState<string | null>(null);
  const [complejoSeleccionado, setComplejoSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const resEsp = await obtenerEspacios();
      const resDep = await obtenerDeportes();

      if ('error' in resEsp) {
        setError(resEsp.error.mensaje);
      } else {
        setEspacios(resEsp.datos);
      }

      if ('datos' in resDep) {
        setDeportes(resDep.datos);
      }
    } catch {
      setError('No se pudieron cargar las canchas. Comprobá tu conexión.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  const onRefresh = () => {
    setRefrescando(true);
    cargarDatos();
  };

  const toggleFavorito = (espacioId: string) => {
    if (!usuario) return;
    const yaFav = usuario.espaciosFavoritos.includes(espacioId);
    const nuevosFavs = yaFav
      ? usuario.espaciosFavoritos.filter((id) => id !== espacioId)
      : [...usuario.espaciosFavoritos, espacioId];

    actualizarUsuario({ ...usuario, espaciosFavoritos: nuevosFavs });
  };

  const espaciosFiltrados = espacios.filter((esp) => {
    const matchDeporte = !deporteSeleccionado || esp.deporteId === deporteSeleccionado;
    const matchComplejo = !complejoSeleccionado || esp.complejo === complejoSeleccionado;
    const matchBusqueda =
      !busqueda ||
      esp.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      esp.complejo.toLowerCase().includes(busqueda.toLowerCase());
    return matchDeporte && matchComplejo && matchBusqueda;
  });

  const complejosDisponibles = Array.from(new Set(espacios.map((e) => e.complejo)));

  return (
    <View style={styles.container}>
      {/* Buscador */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#888" />
        <TextInput
          placeholder="Buscar cancha o complejo..."
          placeholderTextColor="#888"
          style={styles.searchInput}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <Ionicons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros por Deporte */}
      <View style={styles.filtrosWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, nombre: 'Todos', icono: 'grid-outline', color: '#4CAF50' }, ...deportes]}
          keyExtractor={(item) => item.id || 'todos'}
          renderItem={({ item }) => {
            const activo = deporteSeleccionado === item.id;
            return (
              <TouchableOpacity
                style={[styles.chipDeporte, activo && { backgroundColor: item.color || '#4CAF50' }]}
                onPress={() => setDeporteSeleccionado(item.id)}
              >
                <Ionicons name={(item.icono as any) || 'football-outline'} size={14} color="#FFF" />
                <Text style={styles.chipText}>{item.nombre}</Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.filtrosList}
        />
      </View>

      {/* Filtros por Complejo */}
      <View style={styles.complejosWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...complejosDisponibles]}
          keyExtractor={(item) => item || 'todos-complejos'}
          renderItem={({ item }) => {
            const activo = complejoSeleccionado === item;
            return (
              <TouchableOpacity
                style={[styles.chipComplejo, activo && styles.chipComplejoActivo]}
                onPress={() => setComplejoSeleccionado(item)}
              >
                <Text style={[styles.chipComplejoText, activo && styles.chipComplejoTextActivo]}>
                  {item || 'Todos los predios'}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.filtrosList}
        />
      </View>

      {/* Estado de Carga */}
      {cargando && !refrescando && (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.textoCargando}>Cargando canchas de Villaguay...</Text>
        </View>
      )}

      {/* Estado de Error */}
      {error && !cargando && (
        <View style={styles.centrado}>
          <Ionicons name="alert-circle-outline" size={48} color="#D32F2F" />
          <Text style={styles.textoError}>{error}</Text>
          <TouchableOpacity style={styles.botonReintentar} onPress={cargarDatos}>
            <Text style={styles.textoBotonReintentar}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de Canchas */}
      {!cargando && !error && (
        <FlatList
          data={espaciosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const dep = deportes.find((d) => d.id === item.deporteId);
            const esFav = usuario?.espaciosFavoritos.includes(item.id) || false;
            return (
              <TarjetaEspacio
                espacio={item}
                deporte={dep}
                esFavorito={esFav}
                onToggleFavorito={usuario ? () => toggleFavorito(item.id) : undefined}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor="#4CAF50" />
          }
          ListEmptyComponent={
            <View style={styles.centrado}>
              <Ionicons name="search-outline" size={48} color="#666" />
              <Text style={styles.textoVacio}>No se encontraron canchas con los filtros seleccionados.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
  },
  filtrosWrapper: {
    marginBottom: 6,
  },
  complejosWrapper: {
    marginBottom: 10,
  },
  filtrosList: {
    paddingHorizontal: 14,
    gap: 8,
  },
  chipDeporte: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  chipComplejo: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  chipComplejoActivo: {
    borderColor: '#4CAF50',
    backgroundColor: '#2E7D3222',
  },
  chipComplejoText: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
  },
  chipComplejoTextActivo: {
    color: '#4CAF50',
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  textoCargando: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 10,
  },
  textoError: {
    color: '#EF9A9A',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  textoVacio: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  botonReintentar: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  textoBotonReintentar: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
