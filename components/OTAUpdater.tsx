import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View, Platform, AppState, AppStateStatus } from 'react-native';

interface UpdateManifest {
  version: string;
  versionCode: number;
  isMandatory: boolean;
  notes: string;
  downloadUrl: string;
}

export const OTAUpdater = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [manifest, setManifest] = useState<UpdateManifest | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const checkUpdate = async () => {
    if (Platform.OS !== 'android') return; // Sideloading nativo solo funciona en Android

    try {
      const response = await fetch('http://toolsdemexico.net:3001/updates/v2/buscar-clientes/android/android/estable/manifest');
      if (!response.ok) return; // Si da 404, no hay actualización

      const data: UpdateManifest = await response.json();
      const currentVersionCode = parseInt(Application.nativeBuildVersion || '1', 10);

      if (data.versionCode > currentVersionCode) {
        setManifest(data);
        setIsVisible(true);
      }
    } catch (e) {
      console.warn('OTA Check Failed', e);
    }
  };

  useEffect(() => {
    // Revisar al iniciar
    checkUpdate();

    // Revisar al regresar del background
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkUpdate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDownloadAndInstall = async () => {
    if (!manifest) return;

    setIsDownloading(true);
    setErrorMsg("");
    setDownloadProgress(0);

    const fileUri = `${FileSystem.documentDirectory}update.apk`;

    const downloadResumable = FileSystem.createDownloadResumable(
      manifest.downloadUrl,
      fileUri,
      {},
      (downloadProgressInfo) => {
        const progress = (downloadProgressInfo.totalBytesWritten / downloadProgressInfo.totalBytesExpectedToWrite) * 100;
        setDownloadProgress(progress);
      }
    );

    try {
      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri) {
        // Para Android 7.0+ forzar cambio a content:// 
        const contentUri = await FileSystem.getContentUriAsync(result.uri);
        
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: 'application/vnd.android.package-archive',
        });
        
        // Regresamos el estado a falso para que puedan re-intentar si cancelaron la instalación en la ventana nativa
        setIsDownloading(false);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Error al descargar la actualización. Intenta de nuevo.");
      setIsDownloading(false);
    }
  };

  const handleCancel = () => {
    if (!manifest?.isMandatory) {
      setIsVisible(false);
    }
  };

  if (!manifest) return null;

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Actualización Disponible</Text>
          <Text style={styles.version}>Versión {manifest.version}</Text>
          
          <Text style={styles.notes}>{manifest.notes}</Text>

          {isDownloading ? (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>Descargando... {Math.round(downloadProgress)}%</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} />
              </View>
              <ActivityIndicator size="small" color="#3B82F6" style={{ marginTop: 12 }} />
            </View>
          ) : (
            <View style={styles.buttonsContainer}>
              <TouchableOpacity style={styles.updateButton} onPress={handleDownloadAndInstall}>
                <Text style={styles.updateButtonText}>Descargar e Instalar</Text>
              </TouchableOpacity>
              
              {!manifest.isMandatory && (
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>Más tarde</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {errorMsg !== "" && <Text style={styles.errorText}>{errorMsg}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  version: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  notes: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginBottom: 8,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  buttonsContainer: {
    gap: 12,
  },
  updateButton: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 12,
    color: '#EF4444',
    textAlign: 'center',
    fontSize: 14,
  },
});
