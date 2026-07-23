import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getResponsiveSize } from "../../utils/helpers";

interface StatusModalProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  isError: boolean;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  isVisible,
  onClose,
  title,
  message,
  isError,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalText}>{message}</Text>
          <TouchableOpacity
            style={[
              styles.modalButton,
              isError ? styles.modalButtonError : styles.modalButtonConfirm,
              { flex: 0, width: "100%" },
            ]}
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>Aceptar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: getResponsiveSize(20),
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(24),
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: getResponsiveSize(18),
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: getResponsiveSize(12),
  },
  modalText: {
    fontSize: getResponsiveSize(14),
    color: "#4B5563",
    textAlign: "center",
    marginBottom: getResponsiveSize(24),
  },
  modalButton: {
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(14),
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonConfirm: { backgroundColor: "#3B82F6" },
  modalButtonError: { backgroundColor: "#EF4444" },
  modalButtonText: {
    fontSize: getResponsiveSize(14),
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "600",
  },
});
