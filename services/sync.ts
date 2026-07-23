import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { limpiarUbicacionesPorIds, obtenerUbicaciones } from './database';

export const SYNC_RUTAS_TASK = 'sync-rutas-task';

export const forceSyncRutas = async (): Promise<BackgroundTask.BackgroundTaskResult> => {
  try {
    const boveda = await AsyncStorage.getItem('@boveda_activacion');
    let deviceId = 'DESCONOCIDO';
    if (boveda) {
      const data = JSON.parse(boveda);
      deviceId = data.id_dispositivo;
    }

    let allSuccessful = true;

    while (true) {
      const ubicaciones = obtenerUbicaciones(500, 0) as any[];

      if (!ubicaciones || ubicaciones.length === 0) {
        break;
      }

      const registrosPorDia: Record<string, { ids: number[], events: any[] }> = {};

      ubicaciones.forEach(u => {
        const dateStr = new Date(u.timestamp).toISOString().split('T')[0];

        if (!registrosPorDia[dateStr]) {
          registrosPorDia[dateStr] = { ids: [], events: [] };
        }

        registrosPorDia[dateStr].ids.push(u.id);
        registrosPorDia[dateStr].events.push([
          u.latitud,
          u.longitud,
          u.timestamp,
          u.velocidad,
          1
        ]);
      });

      const dias = Object.keys(registrosPorDia);
      let loteExitoso = true;

      for (const date of dias) {
        const { ids, events } = registrosPorDia[date];

        const payload = {
          deviceId,
          date,
          columns: ["lat", "lng", "timestamp", "speed", "state"],
          events
        };

        try {
          const response = await fetch('https://backend-clientes-neon.vercel.app/api/general/dispositivos/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            limpiarUbicacionesPorIds(ids);
            console.log(`Lote Día ${date} sincronizado y purgado exitosamente (${events.length} puntos).`);
          } else {
            console.warn(`Servidor retornó HTTP ${response.status} para el día ${date}.`);
            loteExitoso = false;
          }
        } catch (err) {
          console.error(`Fallo de red al sincronizar el lote del día ${date}:`, err);
          loteExitoso = false;
        }
      }

      if (!loteExitoso) {
        allSuccessful = false;
        break;
      }
    }

    return allSuccessful
      ? BackgroundTask.BackgroundTaskResult.Success
      : BackgroundTask.BackgroundTaskResult.Failed;
  } catch (error) {
    console.error("Error crítico en sincronización Multi-Day:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
};

TaskManager.defineTask(SYNC_RUTAS_TASK, forceSyncRutas);
