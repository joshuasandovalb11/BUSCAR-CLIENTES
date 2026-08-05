import { Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Roboto_400Regular, Roboto_500Medium } from "@expo-google-fonts/roboto";
import * as BackgroundTask from "expo-background-task";
import * as Cellular from "expo-cellular";
import Constants from "expo-constants";
import "expo-dev-client";
import { useFonts } from "expo-font";
import { SplashScreen, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OTAUpdater } from "../components/OTAUpdater";
import { useLocation } from "../hooks/useLocation";
import { initDB } from "../services/database";
import { SYNC_RUTAS_TASK } from "../services/sync";
import { startLocationTracking } from "../services/tracking";
import { clearSessionToken, getSessionToken } from "../utils/storage";

initDB();

BackgroundTask.registerTaskAsync(SYNC_RUTAS_TASK, {
  minimumInterval: 240,
}).catch((err) => console.error("Error registrando sync nocturno:", err));

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    startLocationTracking();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        checkSimPresence();
        startLocationTracking();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

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
  }, [inicializarRastreoSilencioso, router, verificarPermisos]);

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

      <View style={[styles.versionOverlay, { bottom: insets.bottom > 0 ? insets.bottom + 15 : 40 }]} pointerEvents="none">
        <Text style={styles.versionText}>v{Constants.expoConfig?.version || '1.0.0'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    backgroundColor: "#f5f7fa",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  versionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 99,
  },
  versionText: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.3)',
    fontWeight: 'bold',
  }
});