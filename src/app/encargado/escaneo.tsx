import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Espacio, Reserva } from '../../tipos';
import { marcarAusente, obtenerEspacios, obtenerReservasDeTodos, registrarIngreso } from '../../servicios/reservas';
import { fechaLocal } from '../../servicios/api';
import { useHaptics } from '../../hooks/useHaptics';
import { Ionicons } from '@expo/vector-icons';

export default function AttendantScanScreen() {
  const { vibrarExito, vibrarError } = useHaptics();
  const [permission, requestPermission] = useCameraPermissions();

  const [escaneando, setEscaneando] = useState(true);
  const [qrManual, setQrManual] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [cargandoEspacios, setCargandoEspacios] = useState(true);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const fecha = fechaLocal();

  const [resultadoUltimoScan, setResultadoUltimoScan] = useState<{
    exito: boolean;
    titulo: string;
    mensaje: string;
  } | null>(null);

  useEffect(() => {
    cargarEspacios();
  }, []);

  useEffect(() => {
    if (espacioId) cargarReservas();
  }, [espacioId]);

  const cargarEspacios = async () => {
    const res = await obtenerEspacios();
    if ('datos' in res) {
      setEspacios(res.datos);
      setEspacioId(res.datos[0]?.id || '');
    } else {
      Alert.alert('No se pudieron cargar las canchas', res.error.mensaje);
    }
    setCargandoEspacios(false);
  };

  const cargarReservas = async () => {
    const res = await obtenerReservasDeTodos({ fecha, espacioId });
    if ('datos' in res) setReservas(res.datos);
    else Alert.alert('No se pudieron cargar las reservas', res.error.mensaje);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (!escaneando || procesando) return;
    setEscaneando(false);
    procesarCodigo(data);
  };

  const procesarCodigo = async (codigo: string) => {
    setProcesando(true);
    setResultadoUltimoScan(null);

    if (!espacioId) {
      setProcesando(false);
      Alert.alert('Seleccioná una cancha', 'Elegí el espacio donde se valida el ingreso.');
      return;
    }
    const res = await registrarIngreso(codigo, espacioId);
    setProcesando(false);

    if ('error' in res) {
      await vibrarError();
      setResultadoUltimoScan({
        exito: false,
        titulo: '❌ INGRESO DENEGADO',
        mensaje: res.error.mensaje,
      });
    } else {
      await vibrarExito();
      setResultadoUltimoScan({
        exito: true,
        titulo: '✅ INGRESO VALIDADO CORRECTAMENTE',
        mensaje: `Reserva ${res.datos.id} — Jugador presente registrado a las ${new Date().toLocaleTimeString()}.`,
      });
      cargarReservas();
    }
  };

  if (cargandoEspacios) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (Platform.OS !== 'web' && !permission.granted) {
    return (
      <View style={styles.centrado}>
        <Ionicons name="camera-outline" size={56} color="#FFD54F" />
        <Text style={styles.tituloBiometria}>Permiso de Cámara Requerido</Text>
        <Text style={styles.subBiometria}>
          Necesitamos acceso a la cámara del teléfono para escanear los códigos QR de las reservas.
        </Text>
        <TouchableOpacity style={styles.botonReintentarBio} onPress={requestPermission}>
          <Text style={styles.textoBotonBio}>Conceder Permiso de Cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.selectorEspacio}>
        <Text style={styles.labelManual}>CANCHA DE INGRESO — {fecha}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listaEspacios}>
          {espacios.map((espacio) => (
            <TouchableOpacity
              key={espacio.id}
              style={[styles.chipEspacio, espacio.id === espacioId && styles.chipEspacioActivo]}
              onPress={() => setEspacioId(espacio.id)}
            >
              <Text style={[styles.textoChipEspacio, espacio.id === espacioId && styles.textoChipEspacioActivo]}>
                {espacio.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Vista de Cámara o Simulación Web */}
      <View style={styles.cameraWrapper}>
        {Platform.OS === 'web' ? (
          <View style={styles.webCameraSim}>
            <Ionicons name="qr-code-outline" size={64} color="#4CAF50" />
            <Text style={styles.webCamText}>Modo Simulación de Escáner QR</Text>
          </View>
        ) : (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={escaneando ? handleBarcodeScanned : undefined}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
            <View style={styles.overlayFrame}>
              <View style={styles.squareMarker} />
            </View>
          </>
        )}
      </View>

      {/* Cartel de Resultado del Escaneo */}
      {resultadoUltimoScan && (
        <View
          style={[
            styles.boxResultado,
            resultadoUltimoScan.exito ? styles.boxExito : styles.boxError,
          ]}
        >
          <Text style={styles.tituloResultado}>{resultadoUltimoScan.titulo}</Text>
          <Text style={styles.mensajeResultado}>{resultadoUltimoScan.mensaje}</Text>
          <TouchableOpacity
            style={styles.botonReiniciarScan}
            onPress={() => {
              setResultadoUltimoScan(null);
              setEscaneando(true);
            }}
          >
            <Text style={styles.textoBotonReiniciar}>Escanear Otro Código QR</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ingreso Manual de Código QR (Pruebas / Teclado) */}
      <View style={styles.formManual}>
        <Text style={styles.labelManual}>Ingresar / Probar Código QR Manualmente:</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputQr}
            placeholder="ej: VGY-1180-0219-19"
            placeholderTextColor="#666"
            value={qrManual}
            onChangeText={setQrManual}
          />
          <TouchableOpacity
            style={styles.btnEscanearManual}
            disabled={procesando || !qrManual}
            onPress={() => procesarCodigo(qrManual)}
          >
            {procesando ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.textoBtnManual}>Validar</Text>
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.btnSimularInvalido}
          onPress={() => procesarCodigo('VGY-INVALID-999')}
        >
          <Text style={styles.textSimularInvalido}>Probá QR Inválido (Feedback de Error)</Text>
        </TouchableOpacity>
        <Text style={styles.labelManual}>RESERVAS DEL DÍA</Text>
        <ScrollView style={styles.listaReservas}>
          {reservas
            .filter((reserva) => reserva.estado === 'confirmada')
            .map((reserva) => (
              <View key={reserva.id} style={styles.reservaFila}>
                <Text style={styles.reservaId}>{reserva.codigoQr} · {reserva.turnoId}</Text>
                <TouchableOpacity
                  style={styles.botonAusente}
                  onPress={() => {
                    Alert.alert('Marcar como ausente', '¿Confirmás que la persona no se presentó?', [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Marcar ausente',
                        style: 'destructive',
                        onPress: async () => {
                          const resultado = await marcarAusente(reserva.id);
                          if ('error' in resultado) {
                            Alert.alert('No se pudo marcar ausente', resultado.error.mensaje);
                            return;
                          }
                          await cargarReservas();
                          Alert.alert('Ausencia registrada', 'La reserva quedó marcada como ausente.');
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={styles.textoBotonAusente}>Ausente</Text>
                </TouchableOpacity>
              </View>
            ))}
          {reservas.filter((reserva) => reserva.estado === 'confirmada').length === 0 && (
            <Text style={styles.textoSinReservas}>No hay reservas confirmadas para esta cancha hoy.</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  cameraWrapper: {
    height: 300,
    width: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  selectorEspacio: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1E1E1E',
    gap: 8,
  },
  listaEspacios: {
    gap: 8,
  },
  chipEspacio: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipEspacioActivo: {
    backgroundColor: '#2E7D32',
  },
  textoChipEspacio: {
    color: '#CCC',
    fontSize: 12,
  },
  textoChipEspacioActivo: {
    color: '#FFF',
    fontWeight: '700',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  overlayFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  squareMarker: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  webCameraSim: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  webCamText: {
    color: '#AAA',
    fontSize: 14,
    marginTop: 8,
  },
  boxResultado: {
    margin: 14,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  boxExito: {
    backgroundColor: '#1B5E20',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  boxError: {
    backgroundColor: '#B71C1C',
    borderColor: '#EF5350',
    borderWidth: 1,
  },
  tituloResultado: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  mensajeResultado: {
    color: '#EEE',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  botonReiniciarScan: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  textoBotonReiniciar: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  formManual: {
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    gap: 8,
    flex: 1,
  },
  listaReservas: {
    maxHeight: 150,
  },
  reservaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  reservaId: {
    color: '#DDD',
    fontSize: 11,
    flex: 1,
  },
  botonAusente: {
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  textoBotonAusente: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  textoSinReservas: {
    color: '#888',
    fontSize: 12,
    paddingVertical: 8,
  },
  labelManual: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputQr: {
    flex: 1,
    backgroundColor: '#121212',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
    color: '#FFF',
    fontSize: 14,
  },
  btnEscanearManual: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  textoBtnManual: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  btnSimularInvalido: {
    backgroundColor: '#C6282833',
    borderColor: '#EF5350',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  textSimularInvalido: {
    color: '#FF8A80',
    fontSize: 12,
    fontWeight: '700',
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#121212',
  },
  tituloBiometria: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  subBiometria: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
  },
  botonReintentarBio: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  textoBotonBio: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
