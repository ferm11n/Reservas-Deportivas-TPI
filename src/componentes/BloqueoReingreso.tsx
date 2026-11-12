import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { reingresarConClave } from '../servicios/auth';

interface Props {
  alDesbloquear: () => void;
}

export const BloqueoReingreso: React.FC<Props> = ({ alDesbloquear }) => {
  const { usuario, verificarBiometria, actualizarUsuario, logout } = useAuth();
  const [modoClave, setModoClave] = useState(false);
  const [clave, setClave] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [esError, setEsError] = useState(false);
  const [cargando, setCargando] = useState(true);
  const yaIntento = useRef(false);

  useEffect(() => {
    if (yaIntento.current) return;
    yaIntento.current = true;
    let activo = true;

    void verificarBiometria().then((res) => {
      if (!activo) return;
      setCargando(false);
      if (res.exito) {
        alDesbloquear();
        return;
      }
      // Si el dispositivo no tiene sensor o huellas cargadas, pasa directo a la clave.
      setModoClave(!res.disponible);
      setMensaje(res.mensaje);
      setEsError(false);
    });

    return () => {
      activo = false;
    };
  }, [alDesbloquear, verificarBiometria]);

  const handleReintentarHuella = async () => {
    setCargando(true);
    setEsError(false);
    const res = await verificarBiometria();
    setCargando(false);

    if (res.exito) {
      alDesbloquear();
      return;
    }
    if (!res.disponible) setModoClave(true);
    setMensaje(res.mensaje);
    setEsError(res.disponible);
  };

  const handleConfirmarClave = async () => {
    if (!clave) {
      setMensaje('Ingresá tu contraseña para continuar.');
      setEsError(true);
      return;
    }

    setCargando(true);
    setEsError(false);
    const res = await reingresarConClave(clave);
    setCargando(false);

    if ('error' in res) {
      setMensaje(res.error.mensaje);
      setEsError(true);
      return;
    }

    setClave('');
    actualizarUsuario(res.datos.usuario, res.datos.token);
    alDesbloquear();
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Ionicons
          name={modoClave ? 'key-outline' : 'finger-print'}
          size={56}
          color="#4CAF50"
        />
        <Text style={styles.titulo}>Confirmá tu identidad</Text>
        <Text style={styles.subtitulo}>
          {modoClave
            ? 'Este dispositivo no tiene biometría disponible. Ingresá tu contraseña para continuar.'
            : 'Usá tu huella o rostro para seguir con tu sesión guardada.'}
        </Text>

        {usuario && (
          <Text style={styles.cuenta}>
            {usuario.nombre} ({usuario.email})
          </Text>
        )}

        {mensaje && (
          <Text style={[styles.mensaje, esError && styles.mensajeError]}>{mensaje}</Text>
        )}

        {modoClave ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#666"
              secureTextEntry
              value={clave}
              onChangeText={setClave}
              editable={!cargando}
            />
            <TouchableOpacity
              style={[styles.botonPrimario, cargando && styles.botonDeshabilitado]}
              disabled={cargando}
              onPress={handleConfirmarClave}
            >
              {cargando ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.textoBoton}>CONFIRMAR CON CONTRASEÑA</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.accionesBio}>
            <TouchableOpacity
              style={[styles.botonPrimario, cargando && styles.botonDeshabilitado]}
              disabled={cargando}
              onPress={handleReintentarHuella}
            >
              {cargando ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.textoBoton}>USAR HUELLA / ROSTRO</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonSecundario}
              disabled={cargando}
              onPress={() => {
                setModoClave(true);
                setEsError(false);
                setMensaje(null);
              }}
            >
              <Text style={styles.textoSecundario}>Ingresar con contraseña</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.botonLogout} disabled={cargando} onPress={logout}>
          <Text style={styles.textoLogout}>Cerrar sesión / Cambiar de cuenta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  titulo: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  subtitulo: {
    color: '#AAAAAA',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  cuenta: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  mensaje: {
    color: '#FFD54F',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  mensajeError: {
    color: '#FF8A80',
  },
  form: {
    width: '100%',
    marginTop: 18,
    gap: 12,
  },
  accionesBio: {
    width: '100%',
    marginTop: 18,
    gap: 10,
  },
  input: {
    backgroundColor: '#121212',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
  },
  botonPrimario: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoBoton: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  botonSecundario: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  textoSecundario: {
    color: '#AAAAAA',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  botonLogout: {
    marginTop: 18,
    paddingVertical: 6,
  },
  textoLogout: {
    color: '#FF8A80',
    fontSize: 13,
    fontWeight: '600',
  },
});
