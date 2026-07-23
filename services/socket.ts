import NetInfo from '@react-native-community/netinfo';
import { io } from 'socket.io-client';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://200.94.8.242:3001';

// Inicializamos el socket con los límites exigidos
const socket = io(WS_URL, {
  reconnectionAttempts: 3, // Límite para no drenar batería
  reconnectionDelayMax: 10000,
  transports: ['websocket'], // Forzar websockets nativos
});

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
        socket.connect();
        setTimeout(() => { isReconnecting = false; }, 2000); // Cooldown de 2s
      }
    } else {
      console.log('NetInfo: ZONA MUERTA. Pausando Socket para proteger batería.');
      socket.disconnect();
    }
  }, 1000); // 1 segundo de Debounce
});

export default socket;
