import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const UUID_KEY = 'mdm_device_uuid';
const TOKEN_KEY = 'mdm_session_token';
const USER_INFO_KEY = 'mdm_user_info';

/**
 * Obtiene el UUID físico del dispositivo. 
 * Si es la primera vez que se abre la app, genera uno inborrable y lo guarda en la bóveda de SecureStore.
 */
export const getDeviceUuid = async (): Promise<string> => {
  try {
    let uuid = await SecureStore.getItemAsync(UUID_KEY);
    if (!uuid) {
      if (Platform.OS === 'android') {
        uuid = Application.getAndroidId();
      } else if (Platform.OS === 'ios') {
        uuid = await Application.getIosIdForVendorAsync();
      }

      if (!uuid) {
        uuid = Crypto.randomUUID();
      }

      await SecureStore.setItemAsync(UUID_KEY, uuid);
    }
    return uuid;
  } catch (error) {
    console.error('Error al obtener el Device UUID:', error);
    return Crypto.randomUUID();
  }
};

/**
 * Guarda el token de sesión (JWT) devuelto por la API.
 */
export const setSessionToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error al guardar el token de sesión:', error);
  }
};

/**
 * Obtiene el token de sesión actual para saltarse el Login.
 */
export const getSessionToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error al obtener el token de sesión:', error);
    return null;
  }
};

/**
 * Elimina el token de sesión (Cerrar sesión).
 */
export const clearSessionToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  } catch (error) {
    console.error('Error al borrar el token de sesión:', error);
  }
};

/**
 * Guarda la información básica del usuario.
 */
export const setUserInfo = async (name: string, phone: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify({ name, phone }));
  } catch (error) {
    console.error('Error al guardar info del usuario:', error);
  }
};

/**
 * Obtiene la información básica del usuario.
 */
export const getUserInfo = async (): Promise<{ name: string; phone: string } | null> => {
  try {
    const data = await SecureStore.getItemAsync(USER_INFO_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error al obtener info del usuario:', error);
    return null;
  }
};
