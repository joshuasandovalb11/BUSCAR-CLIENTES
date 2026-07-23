import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocation } from '../hooks/useLocation';
import { moderateScale, verticalScale } from '../utils/responsive';

export default function PermisosBloqueados() {
  const router = useRouter();
  const { verificarPermisos } = useLocation();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        const hasPermissions = await verificarPermisos();
        if (hasPermissions) {
          router.replace('/');
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [verificarPermisos, router]);

  const openSettings = () => {
    Linking.openSettings();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="location-sharp" size={moderateScale(80)} color="#007AFF" />
        <Text style={styles.title}>GPS Requerido</Text>

        <Text style={styles.subtitle}>
          Por políticas de logística, esta herramienta requiere que el permiso de ubicación esté configurado en <Text style={{ fontWeight: 'bold' }}>Permitir todo el tiempo</Text>.
        </Text>

        <Text style={styles.instruction}>
          Si el GPS es desactivado o el permiso es revocado, por seguridad la aplicación permanecerá bloqueada hasta que lo restaures.
        </Text>

        <TouchableOpacity style={styles.button} onPress={openSettings}>
          <Text style={styles.buttonText}>Abrir Configuración</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(30)
  },
  title: {
    fontSize: moderateScale(26),
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(15)
  },
  subtitle: {
    fontSize: moderateScale(16),
    color: '#333',
    textAlign: 'center',
    marginBottom: verticalScale(20),
    lineHeight: 24
  },
  instruction: {
    fontSize: moderateScale(14),
    color: '#666',
    textAlign: 'center',
    marginBottom: verticalScale(40),
    lineHeight: 20
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: moderateScale(30),
    paddingVertical: verticalScale(15),
    borderRadius: moderateScale(10),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: moderateScale(16)
  }
});
