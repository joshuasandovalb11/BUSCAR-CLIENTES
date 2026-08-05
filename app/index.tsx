import React, { useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableWithoutFeedback, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { stopLocationTracking } from "../services/tracking";

import SearchBar from "../components/SearchBar";
import ClientConfirmModal from "../components/modals/ClientConfirmModal";
import ErrorModal from "../components/modals/ErrorModal";
import NoGpsModal from "../components/modals/NoGpsModal";
import PermissionsModal from "../components/modals/PermissionsModal";
import SucursalModal from "../components/modals/SucursalModal";
import { StatusModal } from "../components/modals/StatusModal";
import { clearSessionToken } from "../utils/storage";

import { useLocation } from "../hooks/useLocation";
import { buscarClienteService } from "../services/api";
import { ClienteResponse, Sucursal } from "../types/cliente";
import { abrirGoogleMapsMarcador, abrirGoogleMapsNavegacion } from "../utils/maps";
import { moderateScale, verticalScale } from "../utils/responsive";

export default function IndexScreen() {
  const router = useRouter();
  const { obtenerUbicacionActual } = useLocation();

  // Hidden Debug State
  const [taps, setTaps] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  // Search State
  const [numeroCliente, setNumeroCliente] = useState("");
  const [mensaje, setMensaje] = useState("Ingresa un número de cliente para buscar.");
  const [cargando, setCargando] = useState(false);

  // Modals Visibility
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [permisosModalVisible, setPermisosModalVisible] = useState(false);
  const [modalNoGpsVisible, setModalNoGpsVisible] = useState(false);
  
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [statusModalContent, setStatusModalContent] = useState({
    title: "",
    message: "",
    isError: false,
    action: "",
  });

  // Data State
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [clienteActual, setClienteActual] = useState<string>("");
  const [clienteUnico, setClienteUnico] = useState<ClienteResponse | null>(null);
  const [clienteSinGps, setClienteSinGps] = useState<ClienteResponse | null>(null);
  const [errorMensaje, setErrorMensaje] = useState("");

  const handleHiddenDebugTap = () => {
    const now = Date.now();
    if (now - lastTap > 3000) {
      setTaps(1);
    } else {
      const newTaps = taps + 1;
      setTaps(newTaps);
      if (newTaps >= 7) {
        setTaps(0);
        router.push('/debug');
      }
    }
    setLastTap(now);
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

    try {
      const { cliente, isOk } = await buscarClienteService(numeroCliente);

      const isNoGpsCase = cliente && cliente.nombre && !cliente.latitud && !cliente.multipleSucursales;

      if (isNoGpsCase) {
        setClienteActual(cliente.nombre);
        setMensaje(`Cliente encontrado: ${cliente.nombre}`);
        setClienteSinGps(cliente);
        setModalNoGpsVisible(true);
      } else if (isOk) {
        setClienteActual(cliente.nombre);
        if (cliente.multipleSucursales && cliente.sucursales) {
          setMensaje(`Cliente encontrado: ${cliente.nombre} (${cliente.sucursales.length} sucursales)`);
          setSucursales(cliente.sucursales);
          setModalVisible(true);
        } else if (cliente.latitud && cliente.longitud) {
          setMensaje(`Cliente encontrado: ${cliente.nombre}`);
          setClienteUnico(cliente);
          setConfirmModalVisible(true);
        } else {
          throw new Error("Respuesta de API inesperada.");
        }
      } else {
        throw new Error(cliente.message || "Cliente no encontrado");
      }
    } catch (error: any) {
      if (error.message === "AUTH_ERROR") {
        setStatusModalContent({
          title: "Sesión Expirada",
          message: "Tu sesión ha expirado o el dispositivo fue desvinculado.",
          isError: true,
          action: "LOGOUT"
        });
        setIsStatusModalVisible(true);
      } else {
        const errorMessage = error.message || "Verifica tu conexión a internet.";
        setMensaje("Búsqueda fallida.");
        setErrorMensaje(errorMessage);
        setErrorModalVisible(true);
      }
    } finally {
      setCargando(false);
    }
  };

  const handleVerMapa = (destino: { latitud: number; longitud: number }) => {
    abrirGoogleMapsMarcador(destino).catch(() => {
      setErrorMensaje("No se pudo abrir el mapa.");
      setErrorModalVisible(true);
    });
  };

  const iniciarNavegacion = async (destino: { latitud: number; longitud: number }, nombreDestino: string) => {
    setCargando(true);
    setMensaje(`Navegando hacia ${nombreDestino}...`);

    try {
      const ubicacionUsuario = await obtenerUbicacionActual();
      if (ubicacionUsuario) {
        await abrirGoogleMapsNavegacion(
          { latitude: ubicacionUsuario.latitude, longitude: ubicacionUsuario.longitude },
          destino
        );
      }
    } catch (error: any) {
      if (error.message === "PERMISSION_DENIED") {
        setPermisosModalVisible(true);
      } else {
        setErrorMensaje(error.message === "LOCATION_ERROR" ? "No se pudo obtener la ubicación actual." : "No se pudo abrir Google Maps.");
        setErrorModalVisible(true);
      }
    } finally {
      setCargando(false);
      setMensaje("Ingresa un número de cliente para buscar.");
    }
  };

  const handleBuscarRutaSucursal = (sucursal: Sucursal) => {
    setModalVisible(false);
    const destinoTexto = sucursal.nombreSucursal ? `${sucursal.nombre} - ${sucursal.nombreSucursal}` : sucursal.nombre;
    iniciarNavegacion(sucursal, destinoTexto);
  };

  const handleBuscarRutaClienteUnico = () => {
    setConfirmModalVisible(false);
    if (clienteUnico?.latitud && clienteUnico?.longitud) {
      iniciarNavegacion(
        { latitud: clienteUnico.latitud, longitud: clienteUnico.longitud },
        clienteUnico.nombre
      );
    }
  };

  const handleCloseStatusModal = async () => {
    setIsStatusModalVisible(false);
    if (statusModalContent.action === "LOGOUT") {
      await stopLocationTracking(); // Detener el rastreador nativo
      await clearSessionToken();
      router.replace("/activacion");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "padding"} style={styles.keyboardContainer}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.container}>
            <View style={styles.headerContainer}>
              <TouchableWithoutFeedback onPress={handleHiddenDebugTap}>
                <Text style={styles.title}>Buscador de Clientes</Text>
              </TouchableWithoutFeedback>
              <Text style={styles.statusMessage}>{mensaje}</Text>
            </View>

            <SearchBar
              numeroCliente={numeroCliente}
              setNumeroCliente={setNumeroCliente}
              cargando={cargando}
              onBuscar={buscarCliente}
            />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <SucursalModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setMensaje("Búsqueda cancelada");
        }}
        clienteActual={clienteActual}
        sucursales={sucursales}
        onVerMapa={(sucursal) => handleVerMapa(sucursal)}
        onBuscarRuta={handleBuscarRutaSucursal}
      />

      <ClientConfirmModal
        visible={confirmModalVisible}
        onClose={() => setConfirmModalVisible(false)}
        clienteActual={clienteActual}
        clienteUnico={clienteUnico}
        onVerMapa={() => {
          if (clienteUnico?.latitud && clienteUnico?.longitud) {
            handleVerMapa({ latitud: clienteUnico.latitud, longitud: clienteUnico.longitud });
          }
        }}
        onBuscarRuta={handleBuscarRutaClienteUnico}
      />

      <NoGpsModal
        visible={modalNoGpsVisible}
        onClose={() => setModalNoGpsVisible(false)}
        clienteSinGps={clienteSinGps}
      />

      <ErrorModal
        visible={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        errorMensaje={errorMensaje}
      />

      <PermissionsModal
        visible={permisosModalVisible}
        onClose={() => setPermisosModalVisible(false)}
      />
      <StatusModal
        isVisible={isStatusModalVisible}
        title={statusModalContent.title}
        message={statusModalContent.message}
        isError={statusModalContent.isError}
        onClose={handleCloseStatusModal}
      />
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
    padding: moderateScale(20),
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: verticalScale(40),
  },
  title: {
    fontSize: moderateScale(28),
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: verticalScale(12),
    textAlign: "center",
  },
  statusMessage: {
    fontSize: moderateScale(16),
    color: "#666",
    textAlign: "center",
    minHeight: verticalScale(24),
    paddingHorizontal: moderateScale(20),
  },
});
