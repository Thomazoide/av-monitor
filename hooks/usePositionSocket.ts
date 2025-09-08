import { backendURL } from '@/constants/Endpoints';
import { useUserInputs } from '@/context/UserInputsContext';
import { Vehiculo } from "@/declarations/payloads";
import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Emite cada 5s la posición actual usando el evento "acatualizar-posicion" con un Partial<vehiculo>
export function usePositionSocket() {
  const { vehicle } = useUserInputs();
  const socketRef = useRef<Socket | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!vehicle?.id) return; // Requiere vehículo autenticado

    // Inicializar socket solo una vez por vehículo
    const socket = io(`${backendURL}position`, {
      transports: ['websocket'],
      forceNew: false,
    });
    socketRef.current = socket;

    const emitPosition = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const payload: Partial<Vehiculo> = {
            id: vehicle.id,
            patente: vehicle.patente,
            marca: vehicle.marca,
            modelo: vehicle.modelo,
            latitud: loc.coords.latitude,
            longitud: loc.coords.longitude,
            velocidad: loc.coords.speed ?? 0.0,
            timestamp: new Date().toISOString()
        };
        socket.emit('acatualizar-posicion', payload);
      } catch {
        // Silenciar errores de posición para no saturar logs
      }
    };

    // Emitir inmediatamente y luego cada 5s
    emitPosition();
  intervalRef.current = setInterval(emitPosition, 5000) as unknown as number;

    return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
      socket.disconnect();
    };
  }, [vehicle?.id, vehicle?.patente, vehicle?.marca, vehicle?.modelo]);
}
