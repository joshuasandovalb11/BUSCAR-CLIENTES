import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { contarUbicaciones, limpiarUbicaciones, obtenerUbicaciones } from '../services/database';
import { forceSyncRutas } from '../services/sync';

export default function DebugScreen() {
  const router = useRouter();

  // States
  const [totalCount, setTotalCount] = useState(0);
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [loadingSync, setLoadingSync] = useState(false);

  // Paginación
  const [offset, setOffset] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const LIMIT = 100;

  const cargarDatos = useCallback((isRefresh = false) => {
    try {
      const count = contarUbicaciones();
      setTotalCount(count);

      const currentOffset = isRefresh ? 0 : offset;
      const nuevosRegistros = obtenerUbicaciones(LIMIT, currentOffset);

      if (isRefresh) {
        setUbicaciones(nuevosRegistros);
        setOffset(nuevosRegistros.length);
      } else {
        if (nuevosRegistros.length > 0) {
          setUbicaciones(prev => [...prev, ...nuevosRegistros]);
          setOffset(prev => prev + nuevosRegistros.length);
        }
      }
    } catch (e) {
      console.error("Error cargando DB:", e);
    }
  }, [offset]);

  useEffect(() => {
    cargarDatos(true);
  }, [cargarDatos]);

  const handleLoadMore = () => {
    if (ubicaciones.length < totalCount && !isFetchingMore) {
      setIsFetchingMore(true);
      cargarDatos(false);
      setIsFetchingMore(false);
    }
  };

  const handleForzarSincronizacion = async () => {
    setLoadingSync(true);
    try {
      const result = await forceSyncRutas();
      cargarDatos(true);
      Alert.alert("Sincronización Terminada", `Resultado: ${result === 1 ? 'SUCCESS (Puntos borrados)' : 'FAILED (Ver consola)'}`);
    } catch {
      Alert.alert("Error Fatal", "El proceso de sincronización crasheó.");
    } finally {
      setLoadingSync(false);
    }
  };

  const handlePurgar = () => {
    Alert.alert(
      "Alerta Roja",
      "¿Estás seguro de vaciar toda la tabla de ubicaciones locales? Esta acción es irreversible.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Purgar",
          style: "destructive",
          onPress: () => {
            limpiarUbicaciones();
            cargarDatos(true);
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.coordText}>Lat: {item.latitud.toFixed(6)}</Text>
        <Text style={styles.coordText}>, </Text>
        <Text style={styles.coordText}>Lng: {item.longitud.toFixed(6)}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.detailText}>Vel: {item.velocidad.toFixed(1)} km/h</Text>
        <Text style={styles.detailText}>{new Date(item.timestamp).toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshButton} onPress={() => cargarDatos(true)}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.metricsContainer}>
        <Text style={styles.metricLabel}>Registros Almacenados</Text>
        <Text style={styles.metricValue}>{totalCount}</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btnAction, styles.btnSync, loadingSync && styles.btnDisabled]}
          onPress={handleForzarSincronizacion}
          disabled={loadingSync}
        >
          {loadingSync ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Forzar Sync</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btnAction, styles.btnPurge]} onPress={handlePurgar}>
          <Text style={styles.btnText}>Purgar SQLite</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={ubicaciones}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <Text style={styles.emptyText}>La base de datos está limpia.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#1E1E1E',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    marginLeft: 5,
    fontSize: 16,
    color: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 5,
  },
  metricsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#2D2D2D',
  },
  metricLabel: {
    fontSize: 14,
    color: '#A0A0A0',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00FF00',
  },
  actionRow: {
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-around',
    backgroundColor: '#1E1E1E',
  },
  btnAction: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  btnSync: {
    backgroundColor: '#007AFF',
  },
  btnPurge: {
    backgroundColor: '#FF3B30',
  },
  btnDisabled: {
    backgroundColor: '#555',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  listContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: '#2D2D2D',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderColor: '#00FF00',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 5,
  },
  coordText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailText: {
    color: '#A0A0A0',
    fontSize: 13,
  },
  emptyText: {
    color: '#A0A0A0',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  }
});
