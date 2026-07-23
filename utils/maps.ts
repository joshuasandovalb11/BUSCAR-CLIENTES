import { Linking, Platform } from "react-native";

export const abrirGoogleMapsNavegacion = (
  origen: { latitude: number; longitude: number },
  destino: { latitud: number; longitud: number }
) => {
  const url = Platform.select({
    ios: `https://www.google.com/maps/dir/?api=1&origin=${origen.latitude},${origen.longitude}&destination=${destino.latitud},${destino.longitud}&travelmode=driving`,
    android: `google.navigation:q=${destino.latitud},${destino.longitud}`,
    default: `https://www.google.com/maps/dir/?api=1&origin=${origen.latitude},${origen.longitude}&destination=${destino.latitud},${destino.longitud}&travelmode=driving`,
  });

  if (url) {
    return Linking.openURL(url);
  }
  return Promise.reject(new Error("No se pudo generar la URL."));
};

export const abrirGoogleMapsMarcador = (destino: {
  latitud: number;
  longitud: number;
}) => {
  const url = Platform.select({
    ios: `maps://?q=${destino.latitud},${destino.longitud}`,
    android: `geo:0,0?q=${destino.latitud},${destino.longitud}`,
    default: `https://www.google.com/maps/search/?api=1&query=${destino.latitud},${destino.longitud}`,
  });

  if (url) {
    return Linking.openURL(url);
  }
  return Promise.reject(new Error("No se pudo generar la URL."));
};
