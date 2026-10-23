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
import { registrarUsuario } from '../../servicios/auth';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const router = useRouter();
  const { actualizarUsuario } = useAuth();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleRegister = async () => {
    if (!nombre.trim() || !email.trim() || !telefono.trim() || !contrasena) {
      Alert.alert('Campos incompletos', 'Por favor completá todos los campos.');
      return;
    }

    setCargando(true);
    const res = await registrarUsuario(nombre, email, contrasena, telefono);
    setCargando(false);

    if ('error' in res) {
      Alert.alert('Error al Registrarse', res.error.mensaje);
    } else {
      actualizarUsuario(res.datos.usuario, res.datos.token);
      Alert.alert('¡Cuenta Creada!', 'Tu cuenta ha sido creada exitosamente.');
      router.replace('/(tabs)' as any);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Crear Cuenta Nueva</Text>
      <Text style={styles.subtitulo}>Registrate para reservar canchas deportivas en Villaguay</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Nombre y Apellido</Text>
        <TextInput
          style={styles.input}
          placeholder="Juan Pérez"
          placeholderTextColor="#666"
          value={nombre}
          onChangeText={setNombre}
        />

        <Text style={styles.label}>Correo Electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="juan@mail.com"
          placeholderTextColor="#666"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Teléfono de Contacto</Text>
        <TextInput
          style={styles.input}
          placeholder="3455-154433"
          placeholderTextColor="#666"
          keyboardType="phone-pad"
          value={telefono}
          onChangeText={setTelefono}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor="#666"
          autoCapitalize="none"
          secureTextEntry
          value={contrasena}
          onChangeText={setContrasena}
        />

        <TouchableOpacity
          style={[styles.botonSubmit, cargando && styles.botonDeshabilitado]}
          disabled={cargando}
          onPress={handleRegister}
        >
          {cargando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.textoBotonSubmit}>CREAR MI CUENTA</Text>
          )}
        </TouchableOpacity>
      </View>
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
  titulo: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitulo: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 24,
  },
  form: {
    gap: 12,
  },
  label: {
    color: '#CCC',
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
    marginTop: 14,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoBotonSubmit: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
