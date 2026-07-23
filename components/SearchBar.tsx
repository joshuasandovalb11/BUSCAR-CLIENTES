import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { moderateScale, verticalScale } from "../utils/responsive";

interface SearchBarProps {
  numeroCliente: string;
  setNumeroCliente: (val: string) => void;
  cargando: boolean;
  onBuscar: () => void;
}

export default function SearchBar({
  numeroCliente,
  setNumeroCliente,
  cargando,
  onBuscar,
}: SearchBarProps) {
  const handleChange = (text: string) => {
    const soloNumeros = text.replace(/[^0-9]/g, '');
    setNumeroCliente(soloNumeros);
  };

  return (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.input}
        placeholder="Número de Cliente"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={numeroCliente}
        onChangeText={handleChange}
        autoCorrect={false}
        spellCheck={false}
        maxLength={15}
        editable={!cargando}
      />
      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Procesando...</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={onBuscar}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Buscar Cliente</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    width: "100%",
    alignItems: "center",
  },
  input: {
    width: "100%",
    height: verticalScale(56),
    backgroundColor: "#ffffff",
    borderColor: "#e0e0e0",
    borderWidth: 2,
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(20),
    fontSize: moderateScale(18),
    color: "#1a1a1a",
    textAlign: "center",
  },
  loadingContainer: {
    marginTop: verticalScale(30),
    alignItems: "center",
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(16),
    color: "#666",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: verticalScale(16),
    paddingHorizontal: moderateScale(40),
    borderRadius: moderateScale(28),
    marginTop: verticalScale(24),
    width: "80%",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: verticalScale(4),
    },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(8),
    elevation: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(18),
    fontWeight: "bold",
  },
});
