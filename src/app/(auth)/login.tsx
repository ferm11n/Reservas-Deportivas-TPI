import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { iniciarSesion } from '../../servicios/auth';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const { actualizarUsuario } = useAuth();

  const [email, setEmail] = useState('emiliano@mail.com');
  const [clave, setClave] = useState('villaguay2026');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!email || !clave) {
      Alert.alert('Campos incompletos', 'Por favor ingresá tu correo y contraseña.');
      return;
    }

    setCargando(true);
    const res = await iniciarSesion(email, clave);
    setCargando(false);

    if ('error' in res) {
      Alert.alert('Error al Ingresar', res.error.mensaje);
    } else {
      actualizarUsuario(res.datos.usuario, res.datos.token);
      router.replace('/(tabs)' as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="football" size={48} color="#4CAF50" />
        <Text style={styles.titulo}>Reservas Deportivas</Text>
        <Text style={styles.subtitulo}>Municipalidad de Villaguay</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Correo Electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="ejemplo@mail.com"
          placeholderTextColor="#666"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#666"
          secureTextEntry
          value={clave}
          onChangeText={setClave}
        />

        <TouchableOpacity
          style={[styles.botonSubmit, cargando && styles.botonDeshabilitado]}
          disabled={cargando}
          onPress={handleLogin}
        >
          {cargando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.textoBotonSubmit}>INGRESAR A LA APP</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.quickAccess}>
        <Text style={styles.quickTitle}>ACCESO RÁPIDO PARA DEFENSA / PRUEBAS:</Text>
        <TouchableOpacity
          style={styles.chipAcceso}
          onPress={() => {
            setEmail('emiliano@mail.com');
            setClave('villaguay2026');
          }}
        >
          <Text style={styles.chipText}>Jugador (emiliano@mail.com)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chipAcceso}
          onPress={() => {
            setEmail('marcelo@villaguay.demo.ar');
            setClave('villaguay2026');
          }}
        >
          <Text style={styles.chipText}>Encargado (marcelo@villaguay.demo.ar)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chipAcceso}
          onPress={() => {
            setEmail('nahuel@villaguay.demo.ar');
            setClave('villaguay2026');
          }}
        >
          <Text style={styles.chipText}>Administrador (nahuel@villaguay.demo.ar)</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.footerLink}
        onPress={() => router.push('/(auth)/register' as any)}
      >
        <Text style={styles.footerText}>
          ¿No tenés cuenta? <Text style={styles.linkBold}>Registrate acá</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  titulo: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitulo: {
    color: '#888888',
    fontSize: 13,
    marginTop: 2,
  },
  form: {
    gap: 12,
  },
  label: {
    color: '#CCCCCC',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 14,
  },
  botonSubmit: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoBotonSubmit: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  quickAccess: {
    marginTop: 24,
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  quickTitle: {
    color: '#66BB6A',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  chipAcceso: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  chipText: {
    color: '#CCC',
    fontSize: 12,
  },
  footerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#888',
    fontSize: 13,
  },
  linkBold: {
    color: '#4CAF50',
    fontWeight: '700',
  },
});
