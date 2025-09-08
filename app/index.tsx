import * as Location from "expo-location";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function IndexScreen() {
  const [numeroCliente, setNumeroCliente] = useState("");
  const [mensaje, setMensaje] = useState(
    "Ingresa un número de cliente para buscar."
  );
  const [cargando, setCargando] = useState(false);

  const obtenerUbicacionActual = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permiso denegado",
        "La navegación requiere acceso a tu ubicación. Por favor, activa los permisos en la configuración de la aplicación.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Abrir Configuración",
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return null;
    }
    try {
      setMensaje("Obteniendo tu ubicación...");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location.coords;
    } catch (error) {
      Alert.alert(
        "Error de Ubicación",
        "No se pudo obtener la ubicación actual."
      );
      return null;
    }
  };

  const abrirGoogleMapsNavegacion = (
    origen: { latitude: number; longitude: number },
    destino: { latitud: number; longitud: number }
  ) => {
    const url = Platform.select({
      ios: `https://www.google.com/maps/dir/?api=1&origin=${origen.latitude},${origen.longitude}&daddr=${destino.latitud},${destino.longitud}&directionsmode=driving`,
      android: `google.navigation:q=${destino.latitud},${destino.longitud}`,
    });
    if (url) {
      Linking.openURL(url).catch((err) =>
        Alert.alert("Error", "No se pudo abrir Google Maps.")
      );
    }
  };

  const buscarCliente = async () => {
    if (!numeroCliente.trim()) {
      Alert.alert("Error", "Por favor, ingresa un número de cliente.");
      return;
    }
    Keyboard.dismiss();
    setCargando(true);
    setMensaje("Buscando cliente...");
    const URL_API = `https://backend-clientes-neon.vercel.app/api/cliente?id=${numeroCliente}`;
    try {
      const response = await fetch(URL_API);
      const cliente = await response.json();
      if (response.ok) {
        setMensaje(`Cliente encontrado: ${cliente.nombre}`);
        Alert.alert(
          "Cliente Encontrado",
          `¿Deseas iniciar la navegación hacia ${cliente.nombre}?`,
          [
            {
              text: "Cancelar",
              style: "cancel",
              onPress: () => setCargando(false),
            },
            {
              text: "Iniciar Navegación",
              onPress: async () => {
                const ubicacionUsuario = await obtenerUbicacionActual();
                if (ubicacionUsuario) {
                  setMensaje(`Navegando hacia ${cliente.nombre}...`);
                  abrirGoogleMapsNavegacion(ubicacionUsuario, cliente);
                }
                setCargando(false);
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        throw new Error(cliente.message || "Cliente no encontrado");
      }
    } catch (error: any) {
      const errorMessage = error.message || "Verifica tu conexión a internet.";
      setMensaje(errorMessage);
      Alert.alert("Error", errorMessage);
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        style={styles.keyboardContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.container}>
            <Text style={styles.title}>Buscador de Clientes</Text>
            <Text style={styles.statusMessage}>{mensaje}</Text>
            <TextInput
              style={styles.input}
              placeholder="Número de Cliente"
              keyboardType="numeric"
              value={numeroCliente}
              onChangeText={setNumeroCliente}
              editable={!cargando}
            />
            {cargando ? (
              <ActivityIndicator
                size="large"
                color="#007AFF"
                style={{ marginTop: 20 }}
              />
            ) : (
              <TouchableOpacity
                style={styles.button}
                onPress={buscarCliente}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonText}>Buscar y Navegar</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    // color: "#007AFF",
  },
  statusMessage: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    minHeight: 40,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#ffffffff",
    borderColor: "#ccc",
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 18,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 40,
    width: "70%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    alignContent: "center",
    justifyContent: "center",
  },
});
