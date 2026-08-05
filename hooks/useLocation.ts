import * as Location from "expo-location";
import { startLocationTracking } from "../services/tracking";

export const useLocation = () => {
  const verificarPermisos = async (): Promise<boolean> => {
    const fg = await Location.getForegroundPermissionsAsync();
    const bg = await Location.getBackgroundPermissionsAsync();
    return fg.status === "granted" && bg.status === "granted";
  };

  const inicializarRastreoSilencioso = async () => {
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== "granted") return;

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== "granted") return;

      await startLocationTracking();
    } catch (error) {
      console.error("Error inicializando rastreo silencioso:", error);
    }
  };

  const obtenerUbicacionActual = async (): Promise<Location.LocationObjectCoords | null> => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      throw new Error("PERMISSION_DENIED");
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location.coords;
    } catch {
      throw new Error("LOCATION_ERROR");
    }
  };

  return { obtenerUbicacionActual, inicializarRastreoSilencioso, verificarPermisos };
};
