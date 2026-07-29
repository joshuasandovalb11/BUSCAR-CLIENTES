import Constants from "expo-constants";
import { ClienteResponse } from "../types/cliente";
import { getSessionToken } from "../utils/storage";
const APP_SECRET = "TME-Secret-2026";

let cachedApiUrl: string | null = null;

const resolveApiUrl = async (): Promise<string> => {
  if (cachedApiUrl) return cachedApiUrl;

  const prodUrl = process.env.EXPO_PUBLIC_API_URL || 'https://backend-clientes-neon.vercel.app/api';

  if (!__DEV__) {
    cachedApiUrl = prodUrl;
    return cachedApiUrl;
  }

  try {
    let localIp = "localhost";
    const debuggerHost = Constants.expoConfig?.hostUri;
    if (debuggerHost) {
      localIp = debuggerHost.split(':')[0];
    }

    const localUrl = `http://${localIp}:3000/api`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    await fetch(localUrl, { method: "GET", signal: controller.signal });
    clearTimeout(timeoutId);

    console.log(`[API] 🟢 Servidor local detectado. Usando: ${localUrl}`);
    cachedApiUrl = localUrl;
  } catch {
    console.log(`[API] 🔴 Servidor local inalcanzable. Usando Producción: ${prodUrl}`);
    cachedApiUrl = prodUrl;
  }

  return cachedApiUrl;
};

/**
 * Wrapper para fetch con observabilidad y timeout.
 */
export async function fetchWithConfig(endpoint: string, options: RequestInit = {}) {
  const baseUrl = await resolveApiUrl();
  const url = `${baseUrl}${endpoint}`;
  const method = options.method || 'GET';

  console.log(`[API Request] ${method} ${endpoint}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const token = await getSessionToken();

  const headers = {
    ...options.headers,
    "x-app-secret": APP_SECRET,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[API Error] ${response.status} en ${method} ${endpoint} - Status Text: ${response.statusText}`);
    }

    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(`[API Error] Timeout (15000ms) en ${method} ${endpoint}`);
      throw new Error('Tiempo de espera de conexión agotado (Timeout).');
    }
    console.error(`[API Error] Network Error en ${method} ${endpoint} - ${error.message}`);
    throw error;
  }
}

export const buscarClienteService = async (
  numeroCliente: string
): Promise<{ cliente: ClienteResponse; isOk: boolean; status: number }> => {
  const response = await fetchWithConfig(`/cliente?id=${numeroCliente}`);

  if (response.status === 401) {
    throw new Error("AUTH_ERROR");
  }

  const cliente: ClienteResponse = await response.json();
  return { cliente, isOk: response.ok, status: response.status };
};

export const requestSms = async (telefono: string, idApp: number) => {
  const response = await fetchWithConfig(`/request-sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefono, id_app: idApp }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || "Error al solicitar SMS.");
  }
  return result;
};

export const verifyPin = async (telefono: string, idApp: number, pin: string, deviceUuid: string, deviceModel: string) => {
  const response = await fetchWithConfig(`/verify-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefono, id_app: idApp, pin, device_uuid: deviceUuid, device_model: deviceModel }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || "PIN incorrecto o expirado.");
  }
  return result;
};

export const resetSms = async (telefono: string, idApp: number) => {
  const response = await fetchWithConfig(`/reset-sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefono, id_app: idApp }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || "Error al resetear SMS.");
  }
  return result;
};

export const resendSms = async (telefono: string, idApp: number) => {
  const response = await fetchWithConfig(`/resend-sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefono, id_app: idApp }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || "Error al reenviar SMS.");
  }
  return result;
};
