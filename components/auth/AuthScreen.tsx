// src/components/auth/AuthScreen.tsx
import { Feather, MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  formatPhoneNumber,
  getResponsiveHeight,
  getResponsiveSize,
} from "../../utils/helpers";

interface AuthScreenProps {
  step: 'phone' | 'pin' | 'success';
  userPhoneNumber: string;
  onPhoneNumberChange: (text: string) => void;
  pin: string;
  onPinChange: (text: string) => void;
  onVerifyPhone: () => void;
  onVerifyPin: () => void;
  onResendSms: () => void;
  isLoading: boolean;
  onGoBack: () => void;
  onContinueToForm: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  step,
  userPhoneNumber,
  onPhoneNumberChange,
  pin,
  onPinChange,
  onVerifyPhone,
  onVerifyPin,
  onResendSms,
  isLoading,
  onGoBack,
  onContinueToForm,
}) => {
  const [timer, setTimer] = useState(40);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (pin === "") {
      setOtp(Array(6).fill(""));
    }
  }, [pin]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === 'pin' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (step === 'phone') {
      setTimer(40);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleResend = () => {
    if (timer === 0) {
      setTimer(40);
      onResendSms();
    }
  };

  const renderProgressBar = () => {
    const getBarColor = (barStep: 'phone' | 'pin' | 'success') => {
      if (step === 'success') return "#3B82F6";
      if (step === 'pin' && (barStep === 'phone' || barStep === 'pin')) return "#3B82F6";
      if (step === 'phone' && barStep === 'phone') return "#3B82F6";
      return "#E5E7EB";
    };

    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: getBarColor('phone') }]} />
        <View style={[styles.progressBar, { backgroundColor: getBarColor('pin') }]} />
        <View style={[styles.progressBar, { backgroundColor: getBarColor('success') }]} />
      </View>
    );
  };

  const handleOtpChange = (text: string, index: number) => {
    const cleanText = text.replace(/[^0-9]/g, "");

    if (cleanText.length > 1) {
      const pasted = cleanText.slice(0, 6).split("");
      const newOtp = Array(6).fill("");
      pasted.forEach((char, i) => { newOtp[i] = char; });
      setOtp(newOtp);
      onPinChange(newOtp.join(''));

      if (pasted.length === 6) {
        Keyboard.dismiss();
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanText.slice(-1);

    setOtp(newOtp);
    onPinChange(newOtp.join(''));

    if (cleanText !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      onPinChange(newOtp.join(''));
    }
  };

  const renderPinBoxes = () => {
    return (
      <View style={styles.pinBoxesContainer}>
        {otp.map((digit, index) => {
          const isActive = focusedIndex === index;

          return (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.pinBox,
                styles.pinBoxText,
                isActive && styles.pinBoxActive,
                digit !== "" && !isActive && styles.pinBoxFilled
              ]}
              value={digit}
              onFocus={() => setFocusedIndex(index)}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleOtpKeyPress(e, index)}
              keyboardType="number-pad"
              textContentType={index === 0 ? "oneTimeCode" : "none"}
              maxLength={6}
              editable={!isLoading}
              autoFocus={step === 'pin' && index === 0}
              contextMenuHidden={true}
              caretHidden={true}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: "#F8FAFC" }}
        contentContainerStyle={{ flex: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
      >
        <View style={styles.authContainer}>
          <View style={styles.authCard}>

            {renderProgressBar()}

            {step === 'phone' && (
              <>
                <Text style={styles.authTitle}>Verificación de Empleado</Text>
                <Text style={styles.authSubtitle}>
                  Ingresa tu número de teléfono para acceder.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Teléfono (10 dígitos)"
                  value={formatPhoneNumber(userPhoneNumber)}
                  onChangeText={onPhoneNumberChange}
                  keyboardType="phone-pad"
                  maxLength={12}
                  placeholderTextColor="#9CA3AF"
                  editable={!isLoading}
                  contextMenuHidden={true}
                />
                {isLoading ? (
                  <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
                ) : (
                  <TouchableOpacity style={styles.authButton} onPress={onVerifyPhone}>
                    <Text style={styles.authButtonText}>Continuar</Text>
                    <Feather name="arrow-right" size={16} color={"#FFFFFF"} />
                  </TouchableOpacity>
                )}
              </>
            )}

            {step === 'pin' && (
              <>
                <Text style={styles.authTitle}>Código de Seguridad</Text>
                <Text style={styles.authSubtitle}>
                  Ingresa el código de 6 dígitos enviado al <Text style={{ fontWeight: "bold", color: "#3B82F6" }}>{formatPhoneNumber(userPhoneNumber)}</Text>.
                </Text>

                {renderPinBoxes()}

                {isLoading ? (
                  <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
                ) : (
                  <>
                    <TouchableOpacity style={styles.authButton} onPress={onVerifyPin}>
                      <Text style={styles.authButtonText}>Verificar PIN</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.resendButton, timer > 0 && styles.resendButtonDisabled]}
                      onPress={handleResend}
                      disabled={timer > 0 || isLoading}
                    >
                      <Text style={[styles.resendButtonText, timer > 0 && styles.resendButtonTextDisabled]}>
                        {timer > 0 ? `Reenviar Código en ${timer}s` : "Reenviar Código"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
                      <Text style={styles.backButtonText}>Usar otro número</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            {step === 'success' && (
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <MaterialIcons name="check" size={48} color="#FFFFFF" />
                </View>
                <Text style={styles.authTitle}>¡Dispositivo Vinculado!</Text>
                <Text style={styles.authSubtitle}>
                  Tu teléfono ha quedado registrado exitosamente y puedes comenzar a registrar clientes.
                </Text>
                <TouchableOpacity style={styles.authButton} onPress={onContinueToForm}>
                  <Text style={styles.authButtonText}>Ir al Formulario</Text>
                  <Feather name="arrow-right" size={16} color={"#FFFFFF"} />
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>

  );
};

const styles = StyleSheet.create({
  authContainer: {
    padding: 20,
    paddingVertical: 50,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },
  authCard: {
    width: "100%",
    maxWidth: 400,
    padding: 32,
    alignItems: "center",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  progressBar: {
    height: 6,
    flex: 1,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  authTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: getResponsiveSize(18),
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  authSubtitle: {
    fontFamily: "Roboto_400Regular",
    fontSize: getResponsiveSize(14),
    color: "#6B7280",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 20,
  },
  input: {
    backgroundColor: "#F9FAFB",
    height: getResponsiveHeight(50),
    borderColor: "#D1D5DB",
    borderWidth: 1,
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(16),
    fontSize: getResponsiveSize(14),
    fontFamily: "Roboto_400Regular",
    color: "#111827",
    width: "100%",
    textAlign: "center",
    letterSpacing: 2,
  },
  pinBoxesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 24,
    position: "relative",
  },
  pinBox: {
    width: getResponsiveSize(42),
    height: getResponsiveSize(52),
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  pinBoxActive: {
    borderColor: "#3B82F6",
    borderWidth: 2,
    backgroundColor: "#EFF6FF",
  },
  pinBoxFilled: {
    borderColor: "#4B5563",
    backgroundColor: "#FFFFFF",
  },
  pinBoxText: {
    fontSize: getResponsiveSize(20),
    fontFamily: "Poppins_700Bold",
    color: "#1F2937",
    textAlign: "center",
  },
  successContainer: {
    alignItems: "center",
    width: "100%",
    paddingVertical: 16,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  authButton: {
    marginTop: 16,
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  authButtonText: {
    fontFamily: "Roboto_500Medium",
    color: "#FFFFFF",
    fontSize: getResponsiveHeight(14),
    fontWeight: "600",
  },
  resendButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  resendButtonDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  resendButtonText: {
    fontFamily: "Roboto_500Medium",
    color: "#2563EB",
    fontSize: 14,
  },
  resendButtonTextDisabled: {
    color: "#9CA3AF",
  },
  backButton: {
    marginTop: 20,
    padding: 8,
  },
  backButtonText: {
    fontFamily: "Roboto_400Regular",
    color: "#6B7280",
    fontSize: 14,
  }
});
