import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import BackgroundService from 'react-native-background-actions';
import { getDeviceUuid } from '../utils/storage';
import { insertarUbicacion } from './database';
import socket, { connectSocketWithAuth } from './socket';

type EstadoRastreo = 'MOVIMIENTO' | 'ESTACIONARIO';
let estadoActual: EstadoRastreo = 'MOVIMIENTO';
let consecutiveMovingCount = 0;
let consecutiveStationaryCount = 0;
let ultimoTimestampGuardado = 0;
let ultimoHeadingGuardado = 0;

let cachedDeviceId: string | null = null;

(async () => {
  try {
    cachedDeviceId = await getDeviceUuid();
  } catch (e) {
    console.error("Error inicializando caché de Device ID:", e);
  }
})();

const emitirTiempoReal = async (location: Location.LocationObject) => {
  console.log('📡 [Tracker] Coordenada detectada en vivo:', location.coords.latitude, location.coords.longitude);

  if (!cachedDeviceId) return;

  let batteryLevel = -1;
  try {
    batteryLevel = await Battery.getBatteryLevelAsync();
  } catch (e) {
    console.warn("⚠️ No se pudo leer la batería:", e);
  }

  const payload = {
    d: cachedDeviceId,
    lt: location.coords.latitude,
    ln: location.coords.longitude,
    sp: Math.round((location.coords.speed ?? 0) * 3.6),
    hd: Math.round(location.coords.heading ?? 0),
    ...(batteryLevel >= 0 ? { bt: Math.round(batteryLevel * 100) } : {})
  };

  socket.emit('ubicacion_tiempo_real', payload);
};

const procesarUbicacion = (location: Location.LocationObject) => {
  // 1. Guardián de Inexactitud (Filtro relajado para transporte: 100 metros)
  if ((location.coords.accuracy || 0) > 100) {
    console.log("⚠️ Punto descartado por baja precisión (> 100m)");
    return;
  }

  const { latitude, longitude, speed: rawSpeed, heading } = location.coords;
  const timestamp = location.timestamp;
  const speedKmh = (rawSpeed ?? 0) * 3.6;

  // Emitir al instante para el Socket (visualizador de supervisores)
  try {
    emitirTiempoReal(location).catch(() => { });
  } catch {}

  // 2. Máquina de Estados Híbrida (Puramente basada en telemetría en vivo)
  if (speedKmh <= 4) {
    consecutiveMovingCount = 0;
    consecutiveStationaryCount++;

    // Requiere 10 lecturas estacionarias (~20 segundos quietos) para declararse en ESTACIONARIO
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
};

const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), time));

const zombieTask = async (taskDataArguments: any) => {
  console.log("🧟 [Zombie Tracker] Servicio Nativo Persistente Iniciado.");
  
  // 1. Asegurar conexión a Sockets (Porque en Headless JS la UI no carga y el layout no se ejecuta)
  await connectSocketWithAuth();

  let locationSubscription: Location.LocationSubscription | null = null;

  try {
    // Iniciamos la captura en PRIMER PLANO directamente dentro del hilo Zombie
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High, // Alta precisión
        distanceInterval: 5,              // Pide un punto nuevo cada 5 metros
        timeInterval: 2000,               // O pide un punto cada 2 segundos si estamos quietos
      },
      (location) => {
        procesarUbicacion(location);
      }
    );
    console.log("✅ Watcher de GPS anclado exitosamente al hilo Zombie.");
  } catch (e) {
    console.error("Error arrancando GPS Watcher desde zombie:", e);
  }

  // Mantiene vivo el puente JS infinitamente (incluso si deslizan la app)
  while (BackgroundService.isRunning()) {
      await sleep(10000); // Duerme 10 segundos para no ahogar el CPU del dispositivo
  }

  // Limpieza si el usuario cierra sesión y apaga el BackgroundService desde index.tsx
  if (locationSubscription) {
    locationSubscription.remove();
    console.log("🛑 Watcher de GPS destruido exitosamente.");
  }
};

export const initPersistentTracker = async () => {
  const options = {
      taskName: 'RastreoGPS',
      taskTitle: 'Buscando clientes',
      taskDesc: 'Optimizando ruta y sincronizando...',
      taskIcon: {
          name: 'ic_launcher', // Usa el ícono nativo de Android
          type: 'mipmap',
      },
      color: '#007AFF', // Azul corporativo
      parameters: { delay: 10000 },
  };

  try {
    if (!BackgroundService.isRunning()) {
      await BackgroundService.start(zombieTask, options);
    }
  } catch (error) {
    console.error("Error inicializando BackgroundService:", error);
  }
};

