import { backendURL } from '@/constants/Endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import { io } from 'socket.io-client';

export const LOCATION_TASK_NAME = 'BACKGROUND_VEHICLE_LOCATION_TASK';
const SOCKET_EVENT = 'acatualizar-posicion';

// Tarea de ubicación en segundo plano
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    return;
  }
  // data?.locations es un array de ubicaciones
  // Recuperar info vehículo persistida
  try {
    const raw = await AsyncStorage.getItem('vehicleInfo');
    if (!raw) return;
    const vehicle = JSON.parse(raw);
    if (!vehicle?.id) return;
    const locations: any[] = (data as any)?.locations || [];
    if (locations.length === 0) return;

    const latest = locations[locations.length - 1];
    const { latitude, longitude } = latest.coords || {};
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return;

    const socket = io(`${backendURL}position`, { transports: ['websocket'], forceNew: true, reconnectionAttempts: 1 });
    const payload: any = {
      id: vehicle.id,
      patente: vehicle.patente,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      latitud: latitude,
      longitud: longitude,
      timestamp: Date.now(),
    };
    socket.emit(SOCKET_EVENT, payload);
    setTimeout(() => {
      socket.disconnect();
    }, 1500);
  } catch {
    // ignorar
  }
});
