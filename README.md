# APP DE MONITOREO ÁREAS VERDES

Aplicación móvil (Expo / React Native) para supervisores municipales encargados del mantenimiento de áreas verdes. Centraliza autenticación, monitoreo presencial por balizas BLE, seguimiento de posición y resolución de órdenes en terreno con registro fotográfico.

## Funcionalidades clave

- **Autenticación real de equipos**: Inicio de sesión contra `${backendURL}equipos/sign-in`, guardando patente/RUT y cargando supervisor, vehículo y equipo asignado.
- **Monitoreo de zonas vía BLE**: Escaneo continuo con `react-native-ble-plx`, validación de beacons con backend y registro de visitas (entrada/salida) para cada zona.
- **Seguimiento de posición**: Emisión periódica en primer y segundo plano vía Socket.IO para que central monitoree la ubicación del equipo.
- **Órdenes de trabajo**: Consumo de `${backendURL}ordenes/equipo/{teamId}` con caché local, distinción visual de pendientes/completadas y notificaciones automáticas cuando llegan nuevas órdenes.
- **Formulario de visita**: Reportes con comentarios, checklist, nivel de basura y foto opcional (Expo Camera), enviados como multipart a `${backendURL}formularios`.
- **Cierre de órdenes**: Desde la pestaña Órdenes se abre el mismo formulario, se captura evidencia y luego se marca la orden como completada (`completada`, `completada_en`, `visitFormID`) mediante POST a `${backendURL}ordenes`.
- **Persistencia y permisos**: Manejo de permisos (cámara, Bluetooth, ubicación), almacenamiento por equipo en `AsyncStorage` y polling cada 15 s para detectar nuevas órdenes en segundo plano.

## Arquitectura

- **Expo Router** con flujo protegido: `UserInputsProvider` impide acceder a tabs sin sesión, `OrdersProvider` comparte la data de órdenes.
- **Contextos**: `UserInputsContext` (credenciales/equipo) y `OrdersContext` (fetch, cache, notificaciones, polling).
- **Hooks**: `useBleScan`, `usePositionSocket`, `useThemeColor`, entre otros, encapsulan acceso a hardware/servicios.
- **UI temática**: `ThemedView`, `ThemedText`, `TabBarBackground`, `IconSymbol` mantienen consistencia en modo claro/oscuro.

## Tecnologías principales

- React Native + Expo 53
- TypeScript
- Expo Router
- Expo Camera / Location / Task Manager / Notifications
- Socket.IO client
- AsyncStorage
- lucide-react-native (iconografía)

## Estructura base

```
app/
  _layout.tsx
  index.tsx          # Tab Home (datos supervisor, BLE, accesos)
  (tabs)/index.tsx   # Lista dispositivos BLE y acción a formulario
  (tabs)/orders.tsx  # Gestión de órdenes y cierre
  visit-form.tsx     # Formulario de visita reutilizable
components/
context/
hooks/
constants/
declarations/
```

## Flujo general

1. Supervisor inicia sesión con patente y RUT.
2. Se cargan datos de equipo/vehículo, se piden permisos y comienza el seguimiento de posición.
3. **Home** muestra contexto del equipo, dispositivos BLE detectados y permite lanzar el formulario manualmente.
4. **Órdenes** lista asignaciones activas, notifica nuevas cada 15 s y permite completar la orden con evidencia en terreno.
5. Al enviar el formulario, se actualiza la orden en backend y se refleja en la lista (aparece en gris como completada).

## Puesta en marcha

1. Instalar dependencias
	```bash
	npm install
	```
2. Ejecutar en modo desarrollo
	```bash
	npx expo start
	```
3. Ajustar el endpoint en `constants/Endpoints.ts` si es necesario.

## Próximos pasos sugeridos

- Añadir pruebas (unitarias + E2E) para contextos y hooks críticos.
- Exponer métricas de visitas/órdenes en dashboards adicionales.
- Soportar adjuntos múltiples o clasificación de fotos directamente desde las órdenes.