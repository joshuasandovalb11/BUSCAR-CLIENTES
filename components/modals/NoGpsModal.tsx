import React from "react";
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale, verticalScale } from "../../utils/responsive";
import { ClienteResponse } from "../../types/cliente";

interface NoGpsModalProps {
  visible: boolean;
  onClose: () => void;
  clienteSinGps: ClienteResponse | null;
}

export default function NoGpsModal({ visible, onClose, clienteSinGps }: NoGpsModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.confirmModal, { paddingBottom: Math.max(insets.bottom + 8, verticalScale(32)) }]}>
          <Text style={styles.confirmIcon}>🛰️</Text>
          <Text style={styles.confirmTitle}>Cliente sin GPS</Text>
          <Text style={styles.confirmMessage}>
            El cliente <Text style={styles.confirmClientName}>{clienteSinGps?.nombre}</Text> no tiene coordenadas GPS registradas.
          </Text>

          {clienteSinGps?.vendedorNombre && (
            <View style={styles.vendedorInfoBox}>
              <Text style={styles.vendedorLabel}>Vendedor Asignado:</Text>
              <Text style={styles.vendedorNombre}>{clienteSinGps.vendedorNombre}</Text>
            </View>
          )}

          <Text style={styles.phoneText}>Comunícate con el vendedor</Text>
          {clienteSinGps?.vendedorTelefono ? (
            <TouchableOpacity style={styles.phoneButton} onPress={() => Linking.openURL(`tel:${clienteSinGps.vendedorTelefono}`)}>
              <Text style={styles.phoneButtonText}>📞 Llamar a {clienteSinGps.vendedorTelefono}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.noPhoneText}>No se encontró un número de teléfono.</Text>
          )}

          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmButtonPrimary, { width: "100%", marginTop: verticalScale(12) }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonTextPrimary}>Entendido</Text>
            </TouchableOpacity>
          </View>
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
  confirmModal: {
    backgroundColor: "white",
    alignItems: "center",
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    padding: moderateScale(24),
    paddingBottom: verticalScale(32),
    width: "100%",
  },
  confirmIcon: {
    fontSize: moderateScale(56),
    marginBottom: verticalScale(16),
  },
  confirmTitle: {
    fontSize: moderateScale(24),
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: verticalScale(12),
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: moderateScale(16),
    color: "#666",
    textAlign: "center",
    marginBottom: verticalScale(28),
    lineHeight: verticalScale(24),
  },
  confirmClientName: {
    fontWeight: "bold",
    color: "#007AFF",
  },
  vendedorInfoBox: {
    backgroundColor: "#f0f0f0",
    paddingVertical: verticalScale(12),
    paddingHorizontal: moderateScale(16),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(16),
    width: "100%",
  },
  vendedorLabel: {
    fontSize: moderateScale(14),
    color: "#666",
    marginBottom: verticalScale(4),
  },
  vendedorNombre: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#1a1a1a",
  },
  phoneText: {
    fontSize: moderateScale(14),
    color: "#666",
    marginBottom: verticalScale(8),
  },
  phoneButton: {
    backgroundColor: "#e8f2ff",
    paddingVertical: verticalScale(12),
    paddingHorizontal: moderateScale(20),
    borderRadius: moderateScale(12),
    width: "100%",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  phoneButtonText: {
    color: "#007AFF",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  noPhoneText: {
    color: "#ff3b30",
    fontSize: moderateScale(14),
    marginBottom: verticalScale(16),
  },
  confirmButtons: {
    flexDirection: "row",
    width: "100%",
    gap: moderateScale(12),
  },
  confirmButton: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(12),
    alignItems: "center",
  },
  confirmButtonPrimary: {
    backgroundColor: "#007AFF",
  },
  confirmButtonTextPrimary: {
    color: "#FFFFFF",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
});
