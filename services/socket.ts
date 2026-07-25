import NetInfo from '@react-native-community/netinfo';
import { io } from 'socket.io-client';

import { getSessionToken } from '../utils/storage';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://200.94.8.242:3001';

// Inicializamos el socket SIN autoconectar para poder inyectar el Token
const socket = io(WS_URL, {
  autoConnect: false,
  reconnectionAttempts: 3, // Límite para no drenar batería
  reconnectionDelayMax: 10000,
  transports: ['websocket'], // Forzar websockets nativos
});

// Función para conectar de forma segura con el JWT
export const connectSocketWithAuth = async () => {
  try {
    const token = await getSessionToken();
    if (token) {
      socket.auth = { token };
      socket.connect();
    } else {
      console.warn("Socket.IO: No hay token de sesión. Conexión rechazada.");
    }
  } catch (e) {
    console.error("Socket.IO: Error inyectando token:", e);
  }
};

// Logs de depuración para observabilidad en terminal de Expo
socket.on('connect', () => {
  console.log('Socket.IO: Conexión establecida exitosamente con', WS_URL);
});

socket.on('connect_error', (error) => {
  console.error('Socket.IO: Error de conexión:', error.message);
});

socket.on('disconnect', (reason) => {
  console.warn('Socket.IO: Desconectado. Razón:', reason);
});

let isReconnecting = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

NetInfo.addEventListener((state) => {
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    if (state.isConnected && state.isInternetReachable) {
      if (socket.disconnected && !isReconnecting) {
        console.log('NetInfo: Red detectada. Reiniciando Socket de forma segura...');
        isReconnecting = true;
        connectSocketWithAuth();
        setTimeout(() => { isReconnecting = false; }, 2000); // Cooldown de 2s
      }
    } else {
      console.log('NetInfo: ZONA MUERTA. Pausando Socket para proteger batería.');
      socket.disconnect();
    }
  }, 1000); // 1 segundo de Debounce
});

export default socket;
