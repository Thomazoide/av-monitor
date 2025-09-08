import { LOCATION_TASK_NAME } from '@/background/locationTask';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

export async function startBackgroundTracking() {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) return;
    const vehicleInfo = await AsyncStorage.getItem('vehicleInfo');
    if (!vehicleInfo) return; // no vehicle => no tracking
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 0,
      showsBackgroundLocationIndicator: false,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: 'Monitoreo activo',
        notificationBody: 'Enviando ubicación del vehículo',
        notificationColor: '#0a7ea4'
      }
    });
  } catch {
    // ignore
  }
}
