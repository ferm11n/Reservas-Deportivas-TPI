# Despliegue y entrega

Esta guía describe cómo conectar la aplicación móvil con una API publicada y preparar un APK
instalable. La aplicación y la API son proyectos independientes. La presencia de instrucciones
en este documento no significa que los servicios ya estén desplegados: hay que completar y
verificar cada paso en las cuentas correspondientes.

## Arquitectura

- **Aplicación móvil:** Expo SDK 57, React Native y TypeScript. `src/servicios/api.ts` centraliza
  las solicitudes HTTP con Axios.
- **API:** servicio independiente, documentado en el README de su propio proyecto. La app sólo
  se comunica con la API mediante HTTP/HTTPS; no importa su código.
- **Base y archivos:** el blueprint actual de la API está preparado para PostgreSQL y un almacén
  compatible con S3 de Supabase.
- **Build Android:** el perfil `preview` de `eas.json` genera un APK. La URL de la API se
  incorpora al bundle en tiempo de compilación.

## Desarrollo local

1. Iniciá Docker Desktop y levantá la API desde la carpeta de su proyecto:

   ```powershell
   cd ..\api-reservas-deportivas
   docker compose up
   ```

2. Comprobá la API desde la computadora en `http://localhost:3000/salud` y consultá Swagger en
   `http://localhost:3000/docs`.
3. En el `.env` local de la app, configurá `EXPO_PUBLIC_API_URL` con una dirección alcanzable
   desde el dispositivo. Para un teléfono físico en la misma red, suele ser la IP local de la
   computadora; `localhost` en el teléfono apunta al teléfono mismo.
4. Iniciá la app:

   ```powershell
   npx expo start -c
   ```

MapLibre requiere código nativo, por lo que la app móvil debe probarse con un development build,
no con Expo Go.

## Publicar la API

Antes de desplegar, asegurate de que el proyecto de la API esté en un repositorio Git accesible
para Render y que contenga la implementación y la documentación actualizadas. La API no debe
quedar anidada dentro del proyecto móvil.

1. **Crear Supabase:** crear un proyecto y una base PostgreSQL. Usar la cadena **Session pooler**
   de Supabase en el puerto `5432` como `DB_URL`; no usar la conexión directa ni el pooler de
   transacciones para esta configuración.
2. **Configurar Storage:** crear un bucket y generar las credenciales de S3 Connection. Se
   necesitarán la referencia del proyecto, región, nombre del bucket, `S3_ACCESS_KEY_ID` y
   `S3_SECRET_ACCESS_KEY`.
3. **Crear el servicio de Render:** importar el blueprint `render.yaml` del repositorio de la
   API. Completar en Render las variables secretas `DB_URL`, `SUPABASE_PROYECTO`, `S3_REGION`,
   `S3_BUCKET`, `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY`. El blueprint genera `JWT_SECRETO`.
4. **Revisar el modo de datos:** el blueprint tiene `SEMBRAR_SI_VACIA=true`. En una base nueva
   esto carga datos y cuentas de demo documentados por la API, incluida una cuenta de
   administración con contraseña conocida por quienes tengan el código. No expongas esa
   configuración con datos reales ni con cuentas privilegiadas accesibles públicamente. Para
   producción real, desactivá el seed de demostración y provisioná las cuentas autorizadas con
   credenciales seguras. Si el despliegue es sólo una demo académica, usá datos ficticios y
   asumí que cualquier persona que alcance la API puede intentar ingresar con las credenciales
   publicadas.
5. **Revisar notificaciones:** el blueprint establece `NOTIFICACIONES=expo`. Para enviar push
   remotas hay que configurar las credenciales de plataforma en EAS (FCM v1 para Android y APNs
   para iOS). Si el entorno sólo debe registrar eventos sin enviar push, configurá
   `NOTIFICACIONES=registro`.
6. **Validar el despliegue:** cuando Render indique que el servicio está listo, comprobá
   `https://<host-de-la-api>/salud` y `https://<host-de-la-api>/docs`. Desde el proyecto de la
   API se puede ejecutar:

   ```powershell
   pnpm publicado:probar https://<host-de-la-api>
   ```

   El test comprueba el estado de salud, PostgreSQL, el almacenamiento externo y las imágenes
   servidas por HTTPS.

Los planes, cuotas y condiciones de Render y Supabase pueden cambiar. Confirmalos en los paneles
antes de elegir un plan o publicar datos. El `render.yaml` actual declara el plan `free`; eso no
garantiza que sus límites o disponibilidad sigan iguales. No publiques cadenas de conexión,
claves S3, secretos JWT, credenciales de FCM/APNs ni tokens. No los agregues al repositorio ni
los envíes por chat.

## Generar y verificar el APK

1. En `eas.json`, reemplazá el `EXPO_PUBLIC_API_URL` local del perfil `preview` por la URL HTTPS
   pública validada de la API. No uses `localhost`, una IP privada ni una URL que dependa de la
   computadora anfitriona.
2. Desde el proyecto móvil, iniciá sesión en EAS si hace falta y generá el APK:

   ```powershell
   npx eas-cli login
   npx eas-cli build --platform android --profile preview
   ```

3. Descargá el artefacto cuando termine el build. Instalalo en un teléfono y probá, como mínimo:
   inicio de sesión, catálogo y disponibilidad, creación y cancelación de una reserva, QR,
   cámara/escaneo según el rol, acceso a archivos y recordatorio local.
4. Probá desde una red distinta a la red local de desarrollo para confirmar que el APK llega a
   la API pública.

El APK `development` está destinado al desarrollo con Metro. Para una instalación autónoma de
Android, usá el APK del perfil `preview` y verificá la URL antes de compilar. Cada cambio de URL
requiere generar un build nuevo.

## Notificaciones

- **Notificación local implementada:** al reservar, la app programa un recordatorio para dos
  horas antes del turno, si aún está en el futuro y el usuario concede permiso. No necesita
  Firebase ni una conexión a Internet cuando se muestra.
- **Notificaciones remotas:** la API contempla avisos por suspensión de reservas y liberación de
  turnos favoritos. Su envío efectivo depende de `NOTIFICACIONES=expo`, tokens registrados y
  credenciales válidas de FCM/APNs en EAS. Hasta probarlos en el dispositivo no debe afirmarse
  que la entrega remota funciona.
- La documentación detallada está en `docs/NOTIFICATIONS.md` del proyecto de la API. En Android,
  Expo Go no permite validar push remotas; usá un development build o un APK de release.

## Código fuente y datos

- Entregá el APK final y los enlaces a los repositorios de la app y de la API, o un ZIP con ambos
  proyectos si así lo pide la cátedra.
- Incluí los README, `app.json`, `eas.json` y los archivos necesarios para instalar dependencias.
- Excluí `node_modules`, `.env`, claves y otros archivos secretos. El `.env` local debe mantenerse
  fuera del control de versiones.
- Un dashboard de Power BI es un complemento independiente. Para compartirlo, usá datos
  ficticios o agregados y una fuente de solo lectura limitada; nunca publiques credenciales
  administrativas de Supabase ni acceso irrestricto a la base.
