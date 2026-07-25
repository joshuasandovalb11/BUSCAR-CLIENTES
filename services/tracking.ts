import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getDeviceUuid } from '../utils/storage';
import { insertarUbicacion } from './database';
import socket from './socket';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';
export const GEOFENCE_TASK = 'background-geofence-task';

export const TRACKING_OPTIONS = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 10,
  deferredUpdatesInterval: 10000,
  deferredUpdatesDistance: 10,
  showsBackgroundLocationIndicator: false,
  foregroundService: {
    notificationTitle: "Buscando clientes",
    notificationBody: "Optimizando la ruta...",
    notificationColor: "#007AFF",
  },
};

type EstadoRastreo = 'MOVIMIENTO' | 'ESTACIONARIO';
let estadoActual: EstadoRastreo = 'MOVIMIENTO';
let consecutiveMovingCount = 0;
let stationaryStartTime: number | null = null;
let ultimoTimestampGuardado = 0;
let ultimoHeadingGuardado = 0;
let geofenceNotSupported = false;

let cachedDeviceId: string | null = null;
(async () => {
  try {
    cachedDeviceId = await getDeviceUuid();
  } catch (e) {
    console.error("Error inicializando caché de Device ID:", e);
  }
})();

const emitirTiempoReal = async (location: Location.LocationObject) => {
  console.log('📡 [Tracker] Coordenada detectada por el GPS del teléfono:', location.coords.latitude, location.coords.longitude);

  if (!cachedDeviceId) {
    console.error('❌ [Tracker] ABORTO: cachedDeviceId es undefined o nulo. No se puede emitir al socket.');
    return;
  }

  const payload = {
    d: cachedDeviceId,
    lt: location.coords.latitude,
    ln: location.coords.longitude,
    sp: Math.round((location.coords.speed ?? 0) * 3.6),
    hd: Math.round(location.coords.heading ?? 0)
  };

  console.log('🚀 [Tracker] Emitiendo payload al Socket:', payload);
  socket.emit('ubicacion_tiempo_real', payload);
};

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;

  const { locations } = data as { locations: Location.LocationObject[] };

  for (const location of locations) {
    // 1. Guardián de Inexactitud (Accuracy Guard)
    if ((location.coords.accuracy || 0) > 30) {
      continue;
    }

    const { latitude, longitude, speed: rawSpeed, heading } = location.coords;
    const timestamp = location.timestamp;
    const speedKmh = (rawSpeed ?? 0) * 3.6;

    try {
      emitirTiempoReal(location).catch(() => { });
    } catch {
    }

    try {
      // 2. Transición de Estados
      if (speedKmh <= 4) {
        consecutiveMovingCount = 0;

        if (estadoActual === 'MOVIMIENTO') {
          if (!stationaryStartTime) {
            stationaryStartTime = timestamp;
          }

          if (timestamp - stationaryStartTime >= 120000) {
            // Pasaron 2 minutos de forma sostenida <= 4 km/h
            console.log("¡ESTADO ESTACIONARIO DETECTADO! Intentando ahorrar batería...");
            estadoActual = 'ESTACIONARIO';
            stationaryStartTime = null;

            if (!geofenceNotSupported) {
              try {
                await Location.startGeofencingAsync(GEOFENCE_TASK, [{
                  identifier: 'stop-geofence',
                  latitude,
                  longitude,
                  radius: 100,
                  notifyOnEnter: false,
                  notifyOnExit: true,
                }]);

                await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
              } catch (err) {
                console.warn("Geofencing falló en background (Bug nativo Android SharedPreferences). Activando Fallback de JS...", err);
                geofenceNotSupported = true;
              }
            }
          }
        }
      } else {
        // Velocidad > 4 km/h
        stationaryStartTime = null;

        if (estadoActual === 'ESTACIONARIO') {
          consecutiveMovingCount++;
          if (consecutiveMovingCount >= 2) {
            console.log("¡ESTADO MOVIMIENTO DETECTADO! Reactivando captura híbrida...");
            estadoActual = 'MOVIMIENTO';
            // Si estuviéramos pausados por la geocerca, la geocerca ya nos habría despertado, pero esto cubre el caso Fallback JS.
          }
        }
      }

      // 3. Lógica de Guardado (Filtro Híbrido)
      let debeGuardar = false;

      if (estadoActual === 'ESTACIONARIO') {
        // Heartbeat: 1 punto cada 60 minutos (3600000 ms)
        if (timestamp - ultimoTimestampGuardado >= 3600000) {
          debeGuardar = true;
        }
      } else if (estadoActual === 'MOVIMIENTO') {
        // Filtro de Tiempo: cada 30 segundos (30000 ms)
        if (timestamp - ultimoTimestampGuardado >= 30000) {
          debeGuardar = true;
        }
        // Filtro de Giro: si la velocidad > 5 km/h y el rumbo cambió >= 15 grados
        else if (speedKmh > 5 && heading !== null) {
          const headingDiff = Math.abs(heading - ultimoHeadingGuardado);
          if (headingDiff >= 15) {
            debeGuardar = true;
          }
        }
      }

      if (debeGuardar) {
        insertarUbicacion(latitude, longitude, speedKmh, timestamp);
        ultimoTimestampGuardado = timestamp;
        ultimoHeadingGuardado = heading ?? 0;
      }

    } catch (e) {
      console.error("Fallo guardando en SQLite:", e);
    }
  }
});

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return;
  const { eventType } = data as { eventType: Location.GeofencingEventType };

  if (eventType === Location.GeofencingEventType.Exit) {
    console.log("¡GEOCERCA ROTA! Reiniciando GPS de alta precisión y cambiando a MOVIMIENTO...");
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, TRACKING_OPTIONS);

      // Forzar el estado a movimiento y reiniciar contadores
      estadoActual = 'MOVIMIENTO';
      consecutiveMovingCount = 2; // Forzar que ya se asuma movimiento
      stationaryStartTime = null;
    } catch (e) {
      console.error("Error al reactivar el GPS:", e);
    }
  }
});
