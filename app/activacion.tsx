import * as Device from "expo-device";
import { Stack, router } from "expo-router";
import React, { useState } from "react";
import { Keyboard, View } from "react-native";
import { AuthScreen } from "../components/auth/AuthScreen";
import { StatusModal } from "../components/modals/StatusModal";
import { requestSms, resendSms, resetSms, verifyPin } from "../services/api";
import { getDeviceUuid, setSessionToken, setUserInfo } from "../utils/storage";

const APP_ID = 2; // APP_ID definido para Buscar-clientes

export default function ActivacionScreen() {
  const [step, setStep] = useState<'phone' | 'pin' | 'success'>('phone');
  const [userPhoneNumber, setUserPhoneNumber] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [authIsLoading, setAuthIsLoading] = useState(false);
  const [salespersonName, setSalespersonName] = useState("");
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [statusModalContent, setStatusModalContent] = useState({
    title: "",
    message: "",
    isError: false,
  });

  const showErrorModal = (title: string, message: string) => {
    setStatusModalContent({ title, message, isError: true });
    setIsStatusModalVisible(true);
  };

  const handleRequestSms = async () => {
    if (!userPhoneNumber || userPhoneNumber.length !== 10) {
      showErrorModal("Número Inválido", "Por favor, ingresa tu número de teléfono a 10 dígitos.");
      return;
    }

    setAuthIsLoading(true);
    try {
      Keyboard.dismiss();
      try { await resetSms(userPhoneNumber, APP_ID); } catch { /* ignorar si falla el reset */ }
      await requestSms(userPhoneNumber, APP_ID);
      setStep('pin');
    } catch (error: any) {
      showErrorModal("Error", error.message);
    } finally {
      setAuthIsLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    if (!pinCode || pinCode.length !== 6) {
      showErrorModal("PIN Inválido", "El PIN debe tener 6 dígitos.");
      return;
    }

    setAuthIsLoading(true);
    try {
      Keyboard.dismiss();
      const deviceUuid = await getDeviceUuid();
      const deviceModel = Device.modelName || "Desconocido";
      const result = await verifyPin(userPhoneNumber, APP_ID, pinCode, deviceUuid, deviceModel);

      // Guardar sesión y datos de usuario
      await setSessionToken(result.token);

      const sName = result.user?.nombre || "Vendedor";
      await setUserInfo(sName, userPhoneNumber);
      setSalespersonName(sName);

      // Avanzar al paso final de éxito
      setStep('success');
    } catch (error: any) {
      showErrorModal("Error", error.message);
    } finally {
      setAuthIsLoading(false);
    }
  };

  const handleResendSms = async () => {
    try {
      await resendSms(userPhoneNumber, APP_ID);
    } catch (error: any) {
      showErrorModal("Error", error.message);
    }
  };

  const handleGoBack = async () => {
    try {
      if (userPhoneNumber) {
        await resetSms(userPhoneNumber, APP_ID);
      }
    } catch (error) {
      console.log("Error reseteando SMS:", error);
    }
    setStep('phone');
    setPinCode("");
  };

  const handleContinueToForm = () => {
    router.replace("/");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <Stack.Screen options={{ headerShown: false }} />

      <AuthScreen
        step={step}
        userPhoneNumber={userPhoneNumber}
        onPhoneNumberChange={(text) => setUserPhoneNumber(text.replace(/[^0-9]/g, ""))}
        pin={pinCode}
        onPinChange={(text) => setPinCode(text.replace(/[^0-9]/g, ""))}
        onVerifyPhone={handleRequestSms}
        onVerifyPin={handleVerifyPin}
        onResendSms={handleResendSms}
        isLoading={authIsLoading}
        onGoBack={handleGoBack}
        onContinueToForm={handleContinueToForm}
      />

      <StatusModal
        isVisible={isStatusModalVisible}
        title={statusModalContent.title}
        message={statusModalContent.message}
        isError={statusModalContent.isError}
        onClose={() => setIsStatusModalVisible(false)}
      />
    </View>
  );
}
