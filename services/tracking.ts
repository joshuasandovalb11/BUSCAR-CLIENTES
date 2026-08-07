import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { insertarUbicacion, obtenerUltimaUbicacion } from './database';

export const LOCATION_TRACKING_TASK = 'BACKGROUND_LOCATION_TRACKER';

type EstadoRastreo = 'MOVIMIENTO' | 'ESTACIONARIO';
let estadoActual: EstadoRastreo = 'MOVIMIENTO';
let ultimoHeadingGuardado = 0;

export const calcularDistanciaMetros = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const procesarUbicacion = (location: Location.LocationObject) => {
  try {
    const accuracy = location.coords.accuracy || 0;

    if (accuracy > 80) {
      console.log("⚠️ Punto descartado por precisión deficiente (> 80m):", accuracy);
      return;
    }

    const { latitude, longitude, speed: rawSpeed, heading } = location.coords;
    const timestamp = location.timestamp;
    const speedKmh = Math.max(0, (rawSpeed ?? 0) * 3.6);

    const ultimaUbicacionDB = obtenerUltimaUbicacion();

    if (!ultimaUbicacionDB) {
      insertarUbicacion(latitude, longitude, speedKmh, timestamp);
      ultimoHeadingGuardado = heading ?? 0;
      console.log("💾 Primer punto ancla guardado en SQLite.");
      return;
    }

    const distanciaRecorrida = calcularDistanciaMetros(
      ultimaUbicacionDB.latitud,
      ultimaUbicacionDB.longitud,
      latitude,
      longitude
    );

    const tiempoTranscurrido = timestamp - ultimaUbicacionDB.timestamp;

    if (speedKmh < 10 && accuracy > 35 && distanciaRecorrida < 25) {
      console.log("⚠️ Micro-rebote de interiores ignorado.");
      return;
    }

    if (distanciaRecorrida < 25 || speedKmh < 6) {
      estadoActual = 'ESTACIONARIO';
    } else {
      estadoActual = 'MOVIMIENTO';
    }

    let debeGuardar = false;
    let velocidadAGuardar = speedKmh;

    if (estadoActual === 'ESTACIONARIO') {
      if (tiempoTranscurrido >= 3600000) {
        debeGuardar = true;
        velocidadAGuardar = 0.0;
      }
    } else if (estadoActual === 'MOVIMIENTO') {
      if (tiempoTranscurrido >= 30000 && distanciaRecorrida >= 20) {
        debeGuardar = true;
      }
      else if (speedKmh > 6 && heading !== null && distanciaRecorrida >= 15) {
        const headingDiff = Math.abs(heading - ultimoHeadingGuardado);
        if (headingDiff >= 15 && headingDiff <= 345) {
          debeGuardar = true;
        }
      }
    }

    if (debeGuardar) {
      insertarUbicacion(latitude, longitude, velocidadAGuardar, timestamp);
      ultimoHeadingGuardado = heading ?? 0;
      console.log(`💾 Punto GUARDADO (${estadoActual}): ${velocidadAGuardar.toFixed(1)} km/h, Dist: ${distanciaRecorrida.toFixed(1)}m`);
    }
  } catch (err) {
    console.error("Error procesando ubicación nativa:", err);
  }
};

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
  try {
    await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 15,
      timeInterval: 10000,
      deferredUpdatesInterval: 5000,
      foregroundService: {
        notificationTitle: "Buscando clientes",
        notificationBody: "Optimizando ruta y sincronizando...",
        notificationColor: "#007AFF",
      },
      pausesUpdatesAutomatically: false,
    });

    console.log("🚀 [Tracker Nativo] Foreground Service iniciado exitosamente.");
  } catch (error) {
    console.error("❌ Error iniciando rastreo nativo:", error);
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
