import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sucursal } from "../../types/cliente";
import { moderateScale, verticalScale } from "../../utils/responsive";

interface SucursalModalProps {
  visible: boolean;
  onClose: () => void;
  clienteActual: string;
  sucursales: Sucursal[];
  onVerMapa: (sucursal: Sucursal) => void;
  onBuscarRuta: (sucursal: Sucursal) => void;
}

export default function SucursalModal({
  visible,
  onClose,
  clienteActual,
  sucursales,
  onVerMapa,
  onBuscarRuta,
}: SucursalModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom + 8, verticalScale(24)) }]}>
          <View style={styles.sucursalHeader}>
            <Text style={styles.sucursalIcon}>🗺️</Text>
            <Text style={styles.modalTitle}>Selecciona una Sucursal</Text>
            <Text style={styles.modalSubtitle}>
              Cliente: <Text style={styles.clientSubtitle}>{clienteActual}</Text>
            </Text>
          </View>

          <ScrollView style={styles.sucursalList}>
            {sucursales.map((sucursal, index) => (
              <View key={`${sucursal.numeroSucursal}-${index}`} style={styles.sucursalCard}>
                <View style={styles.sucursalInfo}>
                  <Text style={styles.sucursalNombre}>{sucursal.nombreSucursal || "Ubicación Principal"} </Text>
                  <Text style={styles.sucursalNumero}>Sucursal #{sucursal.numeroSucursal}</Text>
                </View>

                <View style={styles.sucursalActionButtons}>
                  <TouchableOpacity style={[styles.actionButton, styles.mapButton]} onPress={() => onVerMapa(sucursal)}>
                    <Ionicons name="location-sharp" size={20} color="#007AFF" />
                    <Text style={styles.mapButtonText}>Ver Mapa</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionButton, styles.navButton]} onPress={() => onBuscarRuta(sucursal)}>
                    <MaterialCommunityIcons name="directions" size={20} color="#ffffff" />
                    <Text style={styles.navButtonText}>Buscar Ruta</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingHorizontal: moderateScale(24),
    paddingBottom: verticalScale(24),
    maxHeight: "80%",
  },
  sucursalHeader: {
    backgroundColor: "white",
    alignItems: "center",
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingTop: verticalScale(18),
  },
  modalTitle: {
    fontSize: moderateScale(24),
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: verticalScale(8),
    color: "#1a1a1a",
  },
  modalSubtitle: {
    fontSize: moderateScale(16),
    color: "#666",
    textAlign: "center",
    marginBottom: verticalScale(24),
  },
  clientSubtitle: {
    fontSize: moderateScale(16),
    fontWeight: "bold",
    color: "#007AFF",
    textAlign: "center",
    textTransform: "uppercase",
  },
  sucursalList: {
    marginBottom: verticalScale(16),
  },
  sucursalCard: {
    backgroundColor: "#f8f9fa",
    paddingVertical: verticalScale(10),
    paddingHorizontal: moderateScale(16),
    borderRadius: moderateScale(16),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  sucursalInfo: {
    marginBottom: verticalScale(12),
  },
  sucursalNombre: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: verticalScale(4),
  },
  sucursalNumero: {
    fontSize: moderateScale(14),
    color: "#666",
  },
  sucursalActionButtons: {
    flexDirection: "row",
    gap: moderateScale(8),
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    gap: moderateScale(6),
  },
  mapButton: {
    backgroundColor: "#e8f2ff",
  },
  navButton: {
    backgroundColor: "#007AFF",
  },
  mapButtonText: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: moderateScale(14),
  },
  navButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: moderateScale(14),
  },
  sucursalIcon: {
    fontSize: moderateScale(56),
    marginBottom: verticalScale(6),
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(12),
    alignItems: "center",
    marginTop: verticalScale(8),
  },
  cancelButtonText: {
    color: "#666",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
});
