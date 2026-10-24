# ⚽ Reservas Deportivas — Municipalidad de Villaguay

> **Trabajo Integrador Final — Desarrollo para Móviles (2026)**  
> **Tecnicatura Universitaria en Desarrollo Web — Universidad Nacional de Entre Ríos (UNER)**  
> *Construido con React Native, Expo, Expo Router y TypeScript.*

---

## 📌 Sobre el Proyecto

Aplicación móvil desarrollada para la **Dirección de Deportes de la Municipalidad de Villaguay, Entre Ríos**. La solución reemplaza el antiguo sistema de gestión manual por libreta de papel y mensajes de WhatsApp por una plataforma móvil ágil, transparente y robusta. 

Permite consultar en tiempo real la disponibilidad de **11 espacios deportivos municipales** (fútbol 5, fútbol 11, básquet, vóley, tenis y gimnasio cerrado), reservar turnos, consultar el código QR de acceso **sin conexión a internet** y gestionar roles diferenciados para jugadores, encargados de predio y administradores.

---

## ✨ Características Principales

### 👤 1. Módulo del Jugador
- **Catálogo Interactivo:** Listado de las 11 canchas con filtros por deporte y por complejo deportivo (Polideportivo Municipal, Parque Berduc, Gimnasio Cerrado), características técnicas (superficie, iluminación nocturna, techado), precios y reglas.
- **Multimedia:** Recorrido virtual reproducido con `expo-video` desde `assets/videos/videoCancha.mp4` (incluido en el build y disponible sin conexión cuando la API no provee un video); fotos de reportes guardadas en el dispositivo y subidas a `POST /archivos`, y notas de voz grabadas, reproducibles y subidas mediante `expo-audio`.
- **Grilla de Disponibilidad (7 días):** La API publica los turnos y calcula la disponibilidad combinando reservas, fijas y bloqueos.
- **Reservas & Código QR Offline:** Límite de hasta 3 reservas activas simultáneas. Generación de código QR almacenado localmente en SQLite para ingresar al predio sin señal ni datos móviles.
- **Mapa & Ubicación:** Mapa nativo con `@maplibre/maplibre-react-native` y estilos de OpenFreeMap en Android/iOS; `expo-location` permite ver la distancia a cada predio. Web conserva el listado como alternativa.

### 👮 2. Módulo del Encargado (Marcelo)
- **Reingreso Biométrico:** Opción de verificación con huella dactilar o rostro (`expo-local-authentication`).
- **Escáner QR en Puerta:** Lectura en tiempo real con la cámara del dispositivo (`expo-camera`) para validar el ingreso de los jugadores.
- **Feedback Háptico:** Vibración diferenciada (`expo-haptics`) para accesos aprobados (éxito) vs. accesos inválidos, vencidos o de otra cancha (error).
- **Control de Asistencia:** Opción para marcar usuarios presentes o registrar inasistencias (*ausentes*).

### ⚙️ 3. Módulo del Administrador (Director Nahuel Ojeda)
- **Bloqueos por Mantenimiento / Lluvia:** Gestión de franjas horarias o días enteros con un motivo por escrito.
- **Reservas Fijas Semanales:** Carga y gestión de horarios reservados para clubes, escuelas municipales y grupos históricos.
- **Gestión de Tarifas:** Modificación de precios por hora por espacio deportivo.

---

## 🏆 Cumplimiento de los 10 Requisitos Mínimos

| # | Requisito Mínimo | Estado | Implementación Técnica |
|:---:|---|:---:|---|
| **1** | **Pantallas y Navegación** | ✅ | **Expo Router** con navegación basada en archivos (`app/`), pestañas inferiores (Tabs), Stack router y layouts limpios. |
| **2** | **Autenticación & Seguridad** | ✅ | Guardado de Token de sesión en **`expo-secure-store`** y reingreso biométrico con **`expo-local-authentication`**. |
| **3** | **Capa de Servicios y API** | ✅ | Arquitectura asíncrona centralizada en `src/servicios/` con manejo explicito de estados de *carga*, *vacío* y *error*. |
| **4** | **Cámara y Archivos** | ✅ | Escaneo con **`expo-camera`**; fotos seleccionadas con **`expo-image-picker`**, copiadas al directorio de documentos mediante **`expo-file-system`** (`File`, `Directory`, `Paths`) y subidas a la API. |
| **5** | **Ubicación y Mapas** | ✅ | Integración de **`expo-location`** + **MapLibre React Native**. La app sigue funcionando si el usuario deniega la ubicación. |
| **6** | **Notificaciones Locales** | ✅ | **`expo-notifications`** disparadas por eventos reales (recordatorio 2hs antes de la reserva, avisos de suspensión y turnos liberados en cancha favorita). |
| **7** | **Persistencia & Red** | ✅ | Base de datos **`expo-sqlite`** para reservas y QR offline, **`expo-sqlite/kv-store`** para preferencias y **`expo-network`** con banner reactivo de sin conexión. |
| **8** | **Sensores / Háptica** | ✅ | **`expo-haptics`** con respuestas táctiles diferenciadas al escanear QR válidos (*Success*) e inválidos (*Error*). |
| **9** | **Multimedia** | ✅ | **`expo-video`** para recorridos de canchas y **`expo-audio`** para grabar y reproducir observaciones de audio, subidas a la API junto con los reportes. |
| **10** | **Identidad de la Aplicación** | ✅ | Ícono cuadrado de 1024×1024 PNG sin transparencias en `assets/icon.png`, pantalla de presentación (Splash) e identidad configurada en `app.json`. |

---

## 🛠️ Tecnologías y Librerías

- **Framework:** [React Native](https://reactnative.dev/) + [Expo SDK 57](https://expo.dev/)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Navegación:** [Expo Router v57](https://docs.expo.dev/router/introduction/)
- **Mapas nativos:** [MapLibre React Native](https://maplibre.org/maplibre-react-native/) con estilos de [OpenFreeMap](https://openfreemap.org/)
- **Estilos:** `StyleSheet` de React Native (Modo Oscuro de alto contraste para uso nocturno y a la intemperie)
- **Persistencia Nativa:** `expo-sqlite`, `expo-sqlite/kv-store`, `expo-secure-store`
- **Capacidades del Dispositivo:** `expo-camera`, `expo-image-picker`, `expo-file-system`, `expo-location`, `expo-notifications`, `expo-haptics`, `expo-local-authentication`, `expo-video`, `expo-audio`, `expo-network`

---

## 📁 Estructura del Proyecto

```text
Reservas-Deportivas-TPI/
├── app/                        # Pantallas y Rutas de Expo Router
│   ├── (auth)/                 # Login y Registro de usuarios
│   ├── (tabs)/                 # Navegación principal por Pestañas
│   │   ├── index.tsx           # Catálogo de Canchas con filtros
│   │   ├── disponibilidad.tsx  # Grilla de Turnos (7 días)
│   │   ├── mis-reservas.tsx    # Mis Reservas & Código QR Offline
│   │   ├── mapa.tsx            # Mapa de predios con expo-location
│   │   └── perfil.tsx          # Mi Cuenta y Biometría
│   ├── espacio/[id].tsx        # Detalle de cancha, video expo-video, fotos
│   ├── reserva/[id].tsx        # Detalle de reserva + QR offline + cancelar
│   ├── encargado/escaneo.tsx   # Módulo del Encargado (Cámara QR + Háptica)
│   └── admin/index.tsx         # Panel de Administración (Bloqueos, Fijas, Precios)
├── src/
│   ├── tipos/                  # Modelos e interfaces TypeScript (Espacio, Reserva, Turno...)
│   ├── mocks/                  # Datos iniciales simulados (Casos limpios y casos bordes)
│   ├── servicios/              # Capa de servicios asíncrona (reservas.ts, auth.ts)
│   ├── bd/                     # Modulos SQLite, KV-Store y SecureStore
│   ├── context/                # AuthContext y NetworkContext
│   ├── hooks/                  # Custom Hooks (useHaptics, useNotifications, useLocation)
│   └── componentes/            # Componentes UI reutilizables (Grilla, Cards, QrViewer...)
├── assets/                     # Ícono PNG 1024x1024 sin transparencia, Splash Screen
├── app.json                    # Identidad de la app y permisos nativos de Android/iOS
├── eas.json                    # Configuración de EAS Build (perfil preview para APK)
└── README.md                   # Documentación oficial del proyecto
```

---

## 🚀 Instalación y Ejecución Local

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone https://github.com/usuario/Reservas-Deportivas-TPI.git
cd Reservas-Deportivas-TPI
npm install
```

### API (Docker)

La API se ejecuta como servicio aparte. Con Docker Desktop abierto, iniciá una segunda terminal en la carpeta vecina `api-reservas-deportivas`:

```powershell
cd ..\api-reservas-deportivas
docker compose up
```

La app se configura mediante `.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.36:3000
```

Reemplazá `192.168.1.36` por la dirección IPv4 que muestra `ipconfig` si es diferente. El teléfono y la computadora deben usar la misma red; comprobá desde el teléfono que `http://<IP-DE-LA-PC>:3000/salud` responda. No uses `localhost` desde el teléfono. La app incluye `.env.example` como referencia y `.env` no se versiona.

Para probar cuentas de demo, la contraseña es `villaguay2026`. Las cuentas de jugador, encargado y administrador están disponibles en la pantalla de ingreso. Las notificaciones push de la API todavía responden 501; las notificaciones locales de la app siguen disponibles.

### 2. Iniciar el servidor de desarrollo
```bash
npx expo start -c
```

### 3. Probar en el dispositivo
- **Android/iOS:** MapLibre incluye código nativo y no está incluido en Expo Go. Generá e instalá un development build con `npx eas-cli build --profile development --platform android` (o `ios`) y luego iniciá Metro con `npx expo start --dev-client`. También podés compilar localmente con `npx expo run:android` o `npx expo run:ios`.
- **En la Web:** Presionar `w` en la consola o ejecutar `npx expo start --web`.

---

## 📦 Compilación del Build Instalable (APK)

Para generar el archivo **`.apk`** independiente requerido por la consigna (sin Metro y sin computadora):

```bash
# 1. Iniciar sesión en Expo CLI (si es necesario)
npx eas-cli login

# 2. Generar el APK de release con perfil preview
npx eas-cli build --platform android --profile preview
```

Al finalizar la compilación en la nube de Expo, obtendrás el enlace directo para instalar el APK en cualquier dispositivo Android.

---

## 🎓 Créditos

Desarrollado para la materia **Desarrollo para Móviles** (2do Cuatrimestre 2026).  
**Tecnicatura Universitaria en Desarrollo Web — UNER**.
