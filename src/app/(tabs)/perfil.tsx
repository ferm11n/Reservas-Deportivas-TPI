import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Rol } from '../../tipos';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();
  const { usuario, logout, cambiarRol, verificarBiometria } = useAuth();

  const handleProbadaBiometrica = async () => {
    const exito = await verificarBiometria();
    if (exito) {
      Alert.alert('Biometría Verificada', '¡Huella o rostro reconocido correctamente!');
    } else {
      Alert.alert('Atención', 'No se pudo verificar la identidad biométrica.');
    }
  };

  const handleCambiarRol = async (rol: Rol) => {
    await cambiarRol(rol);
    Alert.alert('Rol Actualizado', `Ahora estás operando en el sistema como: ${rol.toUpperCase()}`);
  };

  if (!usuario) {
    return (
      <View style={styles.centrado}>
        <Ionicons name="person-circle-outline" size={64} color="#888" />
        <Text style={styles.tituloSinSesion}>Bienvenido a Reservas Deportivas</Text>
        <Text style={styles.subtituloSinSesion}>
          Iniciá sesión o creá tu cuenta para gestionar tus turnos y acceder al sistema.
        </Text>
        <TouchableOpacity style={styles.botonLogin} onPress={() => router.push('/(auth)/login' as any)}>
          <Text style={styles.textoBotonLogin}>Iniciar Sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botonRegister} onPress={() => router.push('/(auth)/register' as any)}>
          <Text style={styles.textoBotonRegister}>Crear Cuenta Nueva</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tarjeta de Perfil */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{usuario.nombre.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.nombreUsuario}>{usuario.nombre}</Text>
        <Text style={styles.emailUsuario}>{usuario.email}</Text>
        <Text style={styles.telUsuario}>📞 {usuario.telefono}</Text>

        <View style={styles.rolBadge}>
          <Text style={styles.rolBadgeText}>ROL: {usuario.rol.toUpperCase()}</Text>
        </View>
      </View>

      {/* Métricas de Conducta */}
      <View style={styles.metricasRow}>
        <View style={styles.cardMetrica}>
          <Text style={styles.metricaValor}>{usuario.cancelacionesTardias}</Text>
          <Text style={styles.metricaLabel}>Cancelaciones Tardías</Text>
        </View>
        <View style={styles.cardMetrica}>
          <Text style={styles.metricaValor}>{usuario.ausencias}</Text>
          <Text style={styles.metricaLabel}>Inasistencias</Text>
        </View>
      </View>

      {/* Botón Reingreso Biométrico (expo-local-authentication) */}
      <TouchableOpacity style={styles.botonBiometria} onPress={handleProbadaBiometrica}>
        <Ionicons name="finger-print" size={24} color="#4CAF50" />
        <View style={styles.biometriaCol}>
          <Text style={styles.biometriaTitulo}>Probá el Reingreso Biométrico</Text>
          <Text style={styles.biometriaSub}>
            Usa expo-local-authentication (Huella / Rostro)
          </Text>
        </View>
      </TouchableOpacity>

      {/* Módulo Especial del Encargado */}
      {(usuario.rol === 'encargado' || usuario.rol === 'administrador') && (
        <View style={styles.seccionModulo}>
          <Text style={styles.tituloSeccion}>MÓDULO DEL ENCARGADO</Text>
          <TouchableOpacity
            style={styles.botonModuloEncargado}
            onPress={() => router.push('/encargado/escaneo' as any)}
          >
            <Ionicons name="qr-code-outline" size={22} color="#FFF" />
            <Text style={styles.textoBotonModulo}>Escanear QR de Ingreso en la Puerta</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Módulo Especial del Administrador */}
      {usuario.rol === 'administrador' && (
        <View style={styles.seccionModulo}>
          <Text style={styles.tituloSeccion}>MÓDULO DE ADMINISTRACIÓN</Text>
          <TouchableOpacity
            style={styles.botonModuloAdmin}
            onPress={() => router.push('/admin' as any)}
          >
            <Ionicons name="settings-outline" size={22} color="#FFF" />
            <Text style={styles.textoBotonModulo}>Panel Admin (Bloqueos, Fijas, Precios)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Conmutador de Roles para la Defensa Oral */}
      <View style={styles.seccionRoles}>
        <Text style={styles.tituloSeccion}>CAMBIAR ROL (MODO DEFENSA ORAL / PRUEBAS)</Text>
        <View style={styles.rolesRow}>
          {(['jugador', 'encargado', 'administrador'] as Rol[]).map((r) => {
            const activo = usuario.rol === r;
            return (
              <TouchableOpacity
                key={r}
                style={[styles.btnRol, activo && styles.btnRolActivo]}
                onPress={() => handleCambiarRol(r)}
              >
                <Text style={[styles.textRol, activo && styles.textRolActivo]}>
                  {r.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Cerrar Sesión */}
      <TouchableOpacity style={styles.botonLogout} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#FF5252" />
        <Text style={styles.textoLogout}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  nombreUsuario: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  emailUsuario: {
    color: '#AAA',
    fontSize: 14,
    marginTop: 2,
  },
  telUsuario: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  rolBadge: {
    backgroundColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 12,
  },
  rolBadgeText: {
    color: '#66BB6A',
    fontSize: 12,
    fontWeight: '800',
  },
  metricasRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cardMetrica: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  metricaValor: {
    color: '#FFB74D',
    fontSize: 22,
    fontWeight: '800',
  },
  metricaLabel: {
    color: '#AAA',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  botonBiometria: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#2E7D32',
    marginBottom: 20,
  },
  biometriaCol: {
    flex: 1,
  },
  biometriaTitulo: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  biometriaSub: {
    color: '#888',
    fontSize: 12,
  },
  seccionModulo: {
    marginBottom: 20,
  },
  tituloSeccion: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  botonModuloEncargado: {
    backgroundColor: '#1565C0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  botonModuloAdmin: {
    backgroundColor: '#6A1B9A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  textoBotonModulo: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  seccionRoles: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 20,
  },
  rolesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnRol: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    alignItems: 'center',
  },
  btnRolActivo: {
    backgroundColor: '#2E7D32',
  },
  textRol: {
    color: '#AAA',
    fontSize: 11,
    fontWeight: '700',
  },
  textRolActivo: {
    color: '#FFF',
    fontWeight: '800',
  },
  botonLogout: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF525244',
    backgroundColor: '#FF525211',
  },
  textoLogout: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '700',
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tituloSinSesion: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
  },
  subtituloSinSesion: {
    color: '#AAA',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 18,
  },
  botonLogin: {
    width: '100%',
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  textoBotonLogin: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  botonRegister: {
    width: '100%',
    backgroundColor: '#2A2A2A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  textoBotonRegister: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
