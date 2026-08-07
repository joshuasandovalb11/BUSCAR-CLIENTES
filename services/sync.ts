import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { getDeviceUuid } from '../utils/storage';
import { fetchWithConfig } from './api';
import { limpiarUbicacionesPorIds, obtenerUbicaciones, obtenerUbicacionesAnteriores } from './database';

export const SYNC_RUTAS_TASK = 'sync-rutas-task';
let isSyncing = false;

export const getInicioDeHoyTimestamp = (): number => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
};

export const getLocalYYYYMMDD = (d: Date): string => {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
};

export const forceSyncRutas = async (isManual: boolean = false): Promise<BackgroundTask.BackgroundTaskResult> => {
  if (isSyncing) {
    console.log("⏳ [Sync] Sincronización en curso. Omitiendo llamada concurrente.");
    return BackgroundTask.BackgroundTaskResult.Success;
  }

  isSyncing = true;

  try {
    const deviceId = await getDeviceUuid();
    const inicioDeHoy = getInicioDeHoyTimestamp();

    let allSuccessful = true;

    while (true) {
      const ubicaciones = isManual
        ? (obtenerUbicaciones(500, 0) as any[])
        : (obtenerUbicacionesAnteriores(inicioDeHoy, 500) as any[]);

      if (!ubicaciones || ubicaciones.length === 0) {
        break;
      }

      const registrosPorDia: Record<string, { ids: number[]; events: any[] }> = {};

      for (const u of ubicaciones) {
        const dateStr = getLocalYYYYMMDD(new Date(u.timestamp));

        if (!registrosPorDia[dateStr]) {
          registrosPorDia[dateStr] = { ids: [], events: [] };
        }

        registrosPorDia[dateStr].ids.push(u.id);
        registrosPorDia[dateStr].events.push([
          u.latitud,
          u.longitud,
          u.timestamp,
          u.velocidad,
          1,
        ]);
      }

      const dias = Object.keys(registrosPorDia);
      let loteExitoso = true;

      for (const date of dias) {
        const { ids, events } = registrosPorDia[date];

        const payload = {
          deviceId,
          date,
          columns: ["lat", "lng", "timestamp", "speed", "state"],
          events,
        };

        try {
          const response = await fetchWithConfig('/general/dispositivos/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            limpiarUbicacionesPorIds(ids);
            console.log(`✅ [Sync] Lote Día ${date} sincronizado y purgado (${events.length} puntos).`);
          } else {
            console.warn(`⚠️ [Sync] Servidor HTTP ${response.status} para el día ${date}.`);
            loteExitoso = false;
            break;
          }
        } catch (err) {
          console.error(`❌ [Sync] Fallo de red para el día ${date}:`, err);
          loteExitoso = false;
          break;
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
    console.error("❌ [Sync] Error crítico en sincronización:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  } finally {
    isSyncing = false;
  }
};

TaskManager.defineTask(SYNC_RUTAS_TASK, async () => {
  return await forceSyncRutas(false);
});
