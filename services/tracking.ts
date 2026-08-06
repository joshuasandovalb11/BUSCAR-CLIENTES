import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { insertarUbicacion } from './database';

export const LOCATION_TRACKING_TASK = 'BACKGROUND_LOCATION_TRACKER';

type EstadoRastreo = 'MOVIMIENTO' | 'ESTACIONARIO';
let estadoActual: EstadoRastreo = 'MOVIMIENTO';
let ultimoTimestampGuardado = 0;
let ultimoLatitudGuardada = 0;
let ultimoLongitudGuardada = 0;
let ultimoHeadingGuardado = 0;
let isStartingTracker = false;

// Fórmula de Haversine para calcular distancia métrica exacta entre dos puntos GPS
export const calcularDistanciaMetros = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Radio de la Tierra en metros
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

    // 1. Guardián de Precisión Satelital
    if (accuracy > 80) {
      console.log("⚠️ Punto descartado por precisión deficiente (> 80m):", accuracy);
      return;
    }

    const { latitude, longitude, speed: rawSpeed, heading } = location.coords;
    const timestamp = location.timestamp;
    const speedKmh = Math.max(0, (rawSpeed ?? 0) * 3.6);

    // 2. Guardado Inicial Atómico (Primer punto del día / arranque)
    if (ultimoTimestampGuardado === 0) {
      insertarUbicacion(latitude, longitude, speedKmh, timestamp);
      ultimoTimestampGuardado = timestamp;
      ultimoLatitudGuardada = latitude;
      ultimoLongitudGuardada = longitude;
      ultimoHeadingGuardado = heading ?? 0;
      console.log("💾 Primer punto guardado como ancla inicial.");
      return;
    }

    // 3. Cálculo de Distancia Geodésica Real desde el último punto guardado
    const distanciaRecorrida = calcularDistanciaMetros(
      ultimoLatitudGuardada,
      ultimoLongitudGuardada,
      latitude,
      longitude
    );

    // Filtro Anti-Rebotes en Interiores:
    // Si la velocidad es baja (< 10 km/h) pero la precisión es dudosa (> 35m) y la distancia es menor a 25m,
    // es un rebote de señal contra paredes o techos.
    if (speedKmh < 10 && accuracy > 35 && distanciaRecorrida < 25) {
      console.log("⚠️ Micro-rebote de interiores ignorado.");
      return;
    }

    // 4. Máquina de Estados Geodésica Inteligente
    // Si la distancia es menor a 25 metros o la velocidad es menor a 6 km/h, estamos en PARADA / CLIENTE
    if (distanciaRecorrida < 25 || speedKmh < 6) {
      estadoActual = 'ESTACIONARIO';
    } else {
      // Si se alejó 25+ metros y la velocidad es >= 6 km/h, estamos en CONDUCCIÓN VEHICULAR REAL
      estadoActual = 'MOVIMIENTO';
    }

    let debeGuardar = false;
    let velocidadAGuardar = speedKmh;

    if (estadoActual === 'ESTACIONARIO') {
      // En Parada / Visita a Cliente / Casa:
      // Heartbeat: 1 punto cada 60 minutos (3,600,000 ms) para confirmar que el dispositivo sigue vivo.
      if (timestamp - ultimoTimestampGuardado >= 3600000) {
        debeGuardar = true;
        velocidadAGuardar = 0.0; // Normalizar velocidad limpia a 0 km/h en reposo
      }
    } else if (estadoActual === 'MOVIMIENTO') {
      // En Movimiento Vehicular Real:
      // a) Cada 30 segundos si recorrió al menos 20 metros
      if (timestamp - ultimoTimestampGuardado >= 30000 && distanciaRecorrida >= 20) {
        debeGuardar = true;
      }
      // b) En giros y curvas pronunciadas (>= 15 grados) si avanzó al menos 15 metros
      else if (speedKmh > 6 && heading !== null && distanciaRecorrida >= 15) {
        const headingDiff = Math.abs(heading - ultimoHeadingGuardado);
        if (headingDiff >= 15 && headingDiff <= 345) {
          debeGuardar = true;
        }
      }
    }

    if (debeGuardar) {
      insertarUbicacion(latitude, longitude, velocidadAGuardar, timestamp);
      ultimoTimestampGuardado = timestamp;
      ultimoLatitudGuardada = latitude;
      ultimoLongitudGuardada = longitude;
      ultimoHeadingGuardado = heading ?? 0;
      console.log(`💾 Punto GUARDADO (${estadoActual}): ${velocidadAGuardar.toFixed(1)} km/h, Dist: ${distanciaRecorrida.toFixed(1)}m`);
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

