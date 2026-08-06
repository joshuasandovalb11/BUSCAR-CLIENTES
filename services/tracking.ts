import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { insertarUbicacion } from './database';

export const LOCATION_TRACKING_TASK = 'BACKGROUND_LOCATION_TRACKER';

type EstadoRastreo = 'MOVIMIENTO' | 'ESTACIONARIO';
let estadoActual: EstadoRastreo = 'MOVIMIENTO';
let consecutiveMovingCount = 0;
let consecutiveStationaryCount = 0;
let ultimoTimestampGuardado = 0;
let ultimoHeadingGuardado = 0;
let isStartingTracker = false;

export const procesarUbicacion = (location: Location.LocationObject) => {
  try {
    // 1. Guardián de Inexactitud (Filtro para transporte: 100 metros)
    if ((location.coords.accuracy || 0) > 100) {
      console.log("⚠️ Punto descartado por baja precisión (> 100m)");
      return;
    }

    const { latitude, longitude, speed: rawSpeed, heading } = location.coords;
    const timestamp = location.timestamp;
    const speedKmh = (rawSpeed ?? 0) * 3.6;

    // 2. Máquina de Estados Híbrida
    if (speedKmh <= 4) {
      consecutiveMovingCount = 0;
      consecutiveStationaryCount++;

      // Requiere 10 lecturas estacionarias para declararse en ESTACIONARIO
      if (estadoActual === 'MOVIMIENTO' && consecutiveStationaryCount >= 10) {
        console.log("¡ESTADO ESTACIONARIO DETECTADO!");
        estadoActual = 'ESTACIONARIO';
      }
    } else {
      consecutiveStationaryCount = 0;
      consecutiveMovingCount++;

      if (estadoActual === 'ESTACIONARIO' && consecutiveMovingCount >= 2) {
        console.log("¡ESTADO MOVIMIENTO DETECTADO!");
        estadoActual = 'MOVIMIENTO';
      }
    }

    // 3. Lógica de Guardado para SQLite (Historial de Ruta)
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

    // Guardado Atómico Inicial (El primer punto siempre se guarda)
    if (ultimoTimestampGuardado === 0) debeGuardar = true;

    if (debeGuardar) {
      insertarUbicacion(latitude, longitude, speedKmh, timestamp);
      ultimoTimestampGuardado = timestamp;
      ultimoHeadingGuardado = heading ?? 0;
      console.log("💾 Punto GUARDADO en base de datos SQLite.");
    }
  } catch (err) {
    console.error("Error procesando ubicación nativa:", err);
  }
};

// Registro de la Tarea Nativa de Expo (Corre en segundo plano y sobrevive al swipe)
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }: { data: any; error: any }) => {
  if (error) {
    console.error("❌ Error en tarea de ubicación nativa:", error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      for (const loc of locations) {
        procesarUbicacion(loc);
      }
    }
  }
});

export const startLocationTracking = async () => {
  if (isStartingTracker) {
    return;
  }

  isStartingTracker = true;

  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
    if (hasStarted) {
      console.log("📍 [Tracker Nativo] El rastreo en segundo plano ya estaba iniciado.");
      return;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
      accuracy: Location.Accuracy.Balanced, // Precisión óptima sin sobrecalentamiento de radio GPS
      distanceInterval: 15,                // 15 metros entre puntos
      timeInterval: 10000,                 // 10 segundos en reposo/rectas
      deferredUpdatesInterval: 5000,
      foregroundService: {
        notificationTitle: "Buscando clientes",
        notificationBody: "Optimizando ruta y sincronizando...",
        notificationColor: "#007AFF",
      },
      pausesUpdatesAutomatically: true,    // Permite al GPS suspenderse en reposo absoluto
    });

    console.log("🚀 [Tracker Nativo] Foreground Service iniciado exitosamente.");
  } catch (error) {
    console.error("❌ Error iniciando rastreo nativo:", error);
  } finally {
    isStartingTracker = false;
  }
};

export const stopLocationTracking = async () => {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
      console.log("🛑 [Tracker Nativo] Rastreo detenido exitosamente.");
    }
  } catch (error) {
    console.error("❌ Error deteniendo rastreo nativo:", error);
  }
};

