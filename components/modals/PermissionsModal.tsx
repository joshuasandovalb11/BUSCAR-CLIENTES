import React from "react";
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale, verticalScale } from "../../utils/responsive";

interface PermissionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PermissionsModal({ visible, onClose }: PermissionsModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.confirmModal, { paddingBottom: Math.max(insets.bottom + 8, verticalScale(32)) }]}>
          <Text style={styles.confirmIcon}>📍</Text>
          <Text style={styles.confirmTitle}>Permiso Requerido</Text>
          <Text style={styles.confirmMessage}>
            La navegación requiere acceso a tu ubicación. Por favor, activa los permisos en la configuración.
          </Text>

          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmButtonSecondary]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonTextSecondary}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmButtonPrimary]}
              onPress={() => {
                onClose();
                Linking.openSettings();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonTextPrimary}>Abrir Ajustes</Text>
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
  confirmButtonSecondary: {
    backgroundColor: "#f0f0f0",
  },
  confirmButtonTextPrimary: {
    color: "#FFFFFF",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  confirmButtonTextSecondary: {
    color: "#666",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
});
