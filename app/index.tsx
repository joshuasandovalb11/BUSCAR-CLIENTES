import * as Location from "expo-location";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Sucursal {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  numeroSucursal: string;
  nombreSucursal: string;
}

interface ClienteResponse {
  message: string;
  id: string;
  nombre: string;
  latitud?: number;
  longitud?: number;
  multipleSucursales?: boolean;
  sucursales?: Sucursal[];
}

export default function IndexScreen() {
  const [numeroCliente, setNumeroCliente] = useState("");
  const [mensaje, setMensaje] = useState(
    "Ingresa un número de cliente para buscar."
  );
  const [cargando, setCargando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [permisosModalVisible, setPermisosModalVisible] = useState(false);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [clienteActual, setClienteActual] = useState<string>("");
  const [clienteUnico, setClienteUnico] = useState<ClienteResponse | null>(
    null
  );
  const [errorMensaje, setErrorMensaje] = useState("");

  const obtenerUbicacionActual = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      setPermisosModalVisible(true);
      return null;
    }
    try {
      setMensaje("Obteniendo tu ubicación...");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location.coords;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setErrorMensaje("No se pudo obtener la ubicación actual.");
      setErrorModalVisible(true);
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
      default: `https://www.google.com/maps/dir/?api=1&origin=${origen.latitude},${origen.longitude}&destination=${destino.latitud},${destino.longitud}&travelmode=driving`,
    });
    if (url) {
      Linking.openURL(url).catch((err) => {
        setErrorMensaje("No se pudo abrir Google Maps.");
        setErrorModalVisible(true);
        console.error("Failed to open URL:", err);
      });
    }
  };

  const iniciarNavegacionASucursal = async (sucursal: Sucursal) => {
    setModalVisible(false);
    setCargando(true);

    const destinoTexto = sucursal.nombreSucursal
      ? `${sucursal.nombre} - ${sucursal.nombreSucursal}`
      : sucursal.nombre;

    setMensaje(`Navegando hacia ${destinoTexto}...`);

    const ubicacionUsuario = await obtenerUbicacionActual();
    if (ubicacionUsuario) {
      abrirGoogleMapsNavegacion(ubicacionUsuario, sucursal);
    }
    setCargando(false);
  };

  const iniciarNavegacionClienteUnico = async () => {
    setConfirmModalVisible(false);
    if (!clienteUnico) return;

    setCargando(true);
    const ubicacionUsuario = await obtenerUbicacionActual();
    if (ubicacionUsuario) {
      setMensaje(`Navegando hacia ${clienteUnico.nombre}...`);
      abrirGoogleMapsNavegacion(ubicacionUsuario, {
        latitud: clienteUnico.latitud!,
        longitud: clienteUnico.longitud!,
      });
    }
    setCargando(false);
  };

  const buscarCliente = async () => {
    if (!numeroCliente.trim()) {
      setErrorMensaje("Por favor, ingresa un número de cliente.");
      setErrorModalVisible(true);
      return;
    }
    Keyboard.dismiss();
    setCargando(true);
    setMensaje("Buscando cliente...");
    const URL_API = `https://backend-clientes-neon.vercel.app/api/cliente?id=${numeroCliente}`;

    try {
      const response = await fetch(URL_API);
      const cliente: ClienteResponse = await response.json();

      if (response.ok) {
        setClienteActual(cliente.nombre);

        // Caso 1: Cliente con múltiples sucursales
        if (cliente.multipleSucursales && cliente.sucursales) {
          setMensaje(
            `Cliente encontrado: ${cliente.nombre} (${cliente.sucursales.length} sucursales)`
          );
          setSucursales(cliente.sucursales);
          setModalVisible(true);
          setCargando(false);
        }
        // Caso 2: Cliente con una sola ubicación
        else if (cliente.latitud && cliente.longitud) {
          setMensaje(`Cliente encontrado: ${cliente.nombre}`);
          setClienteUnico(cliente);
          setConfirmModalVisible(true);
          setCargando(false);
        } else {
          throw new Error("Cliente encontrado pero sin coordenadas GPS");
        }
      } else {
        throw new Error(cliente.message || "Cliente no encontrado");
      }
    } catch (error: any) {
      const errorMessage = error.message || "Verifica tu conexión a internet.";
      setMensaje(errorMessage);
      setErrorMensaje(errorMessage);
      setErrorModalVisible(true);
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
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Buscador de Clientes</Text>
              <Text style={styles.statusMessage}>{mensaje}</Text>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.input}
                placeholder="Número de Cliente"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={numeroCliente}
                onChangeText={setNumeroCliente}
                editable={!cargando}
              />
              {cargando ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Procesando...</Text>
                </View>
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
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Modal para seleccionar sucursal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Selecciona una Sucursal</Text>
            <Text style={styles.modalSubtitle}>{clienteActual}</Text>

            <ScrollView style={styles.sucursalList}>
              {sucursales.map((sucursal, index) => (
                <TouchableOpacity
                  key={`${sucursal.numeroSucursal}-${index}`}
                  style={styles.sucursalItem}
                  onPress={() => iniciarNavegacionASucursal(sucursal)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sucursalInfo}>
                    {sucursal.nombreSucursal ? (
                      <>
                        <Text style={styles.sucursalNombre}>
                          {sucursal.nombreSucursal}
                        </Text>
                        <Text style={styles.sucursalNumero}>
                          Sucursal #{sucursal.numeroSucursal}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.sucursalNombre}>
                        Ubicación Principal
                      </Text>
                    )}
                  </View>
                  <Text style={styles.sucursalFlecha}>→</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setModalVisible(false);
                setCargando(false);
                setMensaje("Búsqueda cancelada");
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación para cliente único */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmIcon}>📍</Text>
            <Text style={styles.confirmTitle}>Cliente Encontrado</Text>
            <Text style={styles.confirmMessage}>
              ¿Deseas iniciar la navegación hacia{"\n"}
              <Text style={styles.confirmClientName}>{clienteActual}</Text>?
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonSecondary]}
                onPress={() => {
                  setConfirmModalVisible(false);
                  setCargando(false);
                  setMensaje("Navegación cancelada");
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonPrimary]}
                onPress={iniciarNavegacionClienteUnico}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonTextPrimary}>Navegar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de error */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={errorModalVisible}
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.confirmTitle}>Error</Text>
            <Text style={styles.confirmMessage}>{errorMensaje}</Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  styles.confirmButtonPrimary,
                  { width: "100%" },
                ]}
                onPress={() => setErrorModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonTextPrimary}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de permisos de ubicación */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={permisosModalVisible}
        onRequestClose={() => setPermisosModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmIcon}>🔒</Text>
            <Text style={styles.confirmTitle}>Permiso Requerido</Text>
            <Text style={styles.confirmMessage}>
              La navegación requiere acceso a tu ubicación. Por favor, activa
              los permisos en la configuración.
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonSecondary]}
                onPress={() => setPermisosModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonPrimary]}
                onPress={() => {
                  setPermisosModalVisible(false);
                  Linking.openSettings();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonTextPrimary}>
                  Abrir Ajustes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "center",
  },
  statusMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    minHeight: 24,
    paddingHorizontal: 20,
  },
  searchContainer: {
    width: "100%",
    alignItems: "center",
  },
  input: {
    width: "100%",
    height: 56,
    backgroundColor: "#ffffff",
    borderColor: "#e0e0e0",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 18,
    textAlign: "center",
  },
  loadingContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 28,
    marginTop: 24,
    width: "70%",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#1a1a1a",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  sucursalList: {
    marginBottom: 16,
  },
  sucursalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  sucursalInfo: {
    flex: 1,
  },
  sucursalNombre: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  sucursalNumero: {
    fontSize: 14,
    color: "#666",
  },
  sucursalFlecha: {
    fontSize: 24,
    color: "#007AFF",
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmModal: {
    backgroundColor: "white",
    alignItems: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  confirmIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 24,
  },
  confirmClientName: {
    fontWeight: "600",
    color: "#007AFF",
  },
  confirmButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonPrimary: {
    backgroundColor: "#007AFF",
  },
  confirmButtonSecondary: {
    backgroundColor: "#f0f0f0",
  },
  confirmButtonTextPrimary: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonTextSecondary: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
