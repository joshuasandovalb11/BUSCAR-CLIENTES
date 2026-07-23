import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ClienteResponse } from "../../types/cliente";
import { moderateScale, verticalScale } from "../../utils/responsive";

interface ClientConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  clienteActual: string;
  clienteUnico: ClienteResponse | null;
  onVerMapa: () => void;
  onBuscarRuta: () => void;
}

export default function ClientConfirmModal({
  visible,
  onClose,
  clienteActual,
  clienteUnico,
  onVerMapa,
  onBuscarRuta,
}: ClientConfirmModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.confirmModal, { paddingBottom: Math.max(insets.bottom + 8, verticalScale(32)) }]}>
          <Text style={styles.confirmIcon}>📍</Text>
          <Text style={styles.confirmTitle}>Cliente Encontrado</Text>
          <Text style={styles.confirmMessage}>
            ¿Deseas iniciar la navegación hacia{"\n"}
            <Text style={styles.confirmClientName}>{clienteActual}</Text>?
          </Text>

          <View style={styles.confirmButtonsColumn}>
            <TouchableOpacity style={[styles.bigButton, styles.primaryBigButton]} onPress={onBuscarRuta}>
              <MaterialCommunityIcons name="directions" size={20} color="#ffffff" />
              <Text style={styles.primaryBigButtonText}>Buscar Ruta</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.bigButton, styles.secondaryBigButton]} onPress={onVerMapa}>
              <Ionicons name="location-sharp" size={20} color="#007AFF" />
              <Text style={styles.secondaryBigButtonText}>Abrir Mapa</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeLink} onPress={onClose}>
              <Text style={styles.closeLinkText}>Cerrar</Text>
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
  confirmButtonsColumn: {
    width: "100%",
    gap: moderateScale(12),
  },
  bigButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(12),
    gap: moderateScale(8),
  },
  primaryBigButton: {
    backgroundColor: "#007AFF",
  },
  secondaryBigButton: {
    backgroundColor: "#e8f2ff",
  },
  primaryBigButtonText: {
    color: "#ffffff",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  secondaryBigButtonText: {
    color: "#007AFF",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  closeLink: {
    paddingVertical: verticalScale(12),
    alignItems: "center",
    marginTop: verticalScale(8),
  },
  closeLinkText: {
    color: "#666",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
});
