/* eslint-disable react-hooks/exhaustive-deps */
import { getSessionToken, clearSessionToken } from "../utils/storage";
import * as Cellular from "expo-cellular";
import * as BackgroundTask from "expo-background-task";
import "expo-dev-client";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, StyleSheet, View, AppState } from "react-native";
import { OTAUpdater } from "../components/OTAUpdater";
import { useFonts } from "expo-font";
import { Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Roboto_400Regular, Roboto_500Medium } from "@expo-google-fonts/roboto";
import * as SplashScreen from "expo-splash-screen";

import { useLocation } from "../hooks/useLocation";
import { initDB } from "../services/database";
import { SYNC_RUTAS_TASK } from "../services/sync";
import "../services/tracking";

initDB();

BackgroundTask.registerTaskAsync(SYNC_RUTAS_TASK, {
  minimumInterval: 240,
}).catch((err) => console.error("Error registrando sync nocturno:", err));

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const appState = useRef(AppState.currentState);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { inicializarRastreoSilencioso, verificarPermisos } = useLocation();

  useEffect(() => {
    const checkSimPresence = async () => {
      try {
        const token = await getSessionToken();
        if (!token) return;

        const carrier = await Cellular.getCarrierNameAsync();
        const mcc = await Cellular.getMobileCountryCodeAsync();

        if (!mcc && !carrier) {
          console.warn('⚠️ [Seguridad] SIM no detectada. Expulsando usuario.');
          await clearSessionToken();
          router.replace("/activacion");
        }
      } catch (e) {
        console.error('Error comprobando la SIM:', e);
      }
    };

    checkSimPresence();

    const intervalId = setInterval(() => {
      if (appState.current === 'active') {
        checkSimPresence();
      }
    }, 5000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        checkSimPresence();
      }
      appState.current = nextAppState;
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Roboto_400Regular,
    Roboto_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const checkAuthAndPermissions = async () => {
      try {
        const token = await getSessionToken();
        if (!token) {
          setTimeout(() => router.replace("/activacion"), 50);
          return;
        }

        await inicializarRastreoSilencioso();

        const permisosCompletos = await verificarPermisos();
        if (!permisosCompletos) {
          setTimeout(() => router.replace("/permisos"), 50);
        }
      } catch (error) {
        console.error("Error validando acceso", error);
        setTimeout(() => router.replace("/activacion"), 50);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthAndPermissions();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <OTAUpdater />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="activacion" options={{ headerShown: false }} />
        <Stack.Screen name="permisos" options={{ headerShown: false }} />
        <Stack.Screen name="debug" options={{ headerShown: false }} />
      </Stack>

      {isCheckingAuth && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    backgroundColor: "#f5f7fa",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  }
});