import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { PermissionsAndroid, Platform } from 'react-native';

export type LocationPermissionStatus = {
  foreground: boolean;
  background: boolean;
};

export async function requestLocationPermissions(): Promise<LocationPermissionStatus> {
  let fgGranted = false;
  let bgGranted = false;

  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    fgGranted = fg.status === 'granted';

    if (fgGranted) {
      // Background permission may not be supported or may require user to go to settings.
      const bg = await Location.requestBackgroundPermissionsAsync();
      bgGranted = bg.status === 'granted';
    }
  } catch (e) {
    // noop; return false statuses
  }

  return { foreground: fgGranted, background: bgGranted };
}

export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      // In Expo Go, these permission prompts may not be available in the host manifest.
      if (Constants.appOwnership === 'expo') {
        return true;
      }
      const api = Number(Platform.Version);

      // Safety net to avoid any potential hang on some OEMs
      const withTimeout = async <T,>(p: Promise<T>, ms = 8000, fallback: T): Promise<T> => {
        return new Promise<T>((resolve) => {
          let done = false;
          const t = setTimeout(() => {
            if (!done) resolve(fallback);
          }, ms);
          p.then((v) => {
            done = true;
            clearTimeout(t);
            resolve(v);
          }).catch(() => {
            done = true;
            clearTimeout(t);
            resolve(fallback);
          });
        });
      };
      if (api >= 31) {
        // Request only what we need for scanning/connecting. Do not require ADVERTISE.
        const res = await withTimeout(
          PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]),
          8000,
          {
            [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]: PermissionsAndroid.RESULTS.DENIED,
            [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]: PermissionsAndroid.RESULTS.DENIED,
          } as Record<string, 'granted' | 'denied' | 'never_ask_again'>
        );
        const scanGranted =
          res[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const connectGranted =
          res[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
          PermissionsAndroid.RESULTS.GRANTED;
        return scanGranted && connectGranted;
      } else {
        // On Android < 12, BLE scan often requires (fine/coarse) location permissions.
        const res = await withTimeout(
          PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]),
          8000,
          {
            [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: PermissionsAndroid.RESULTS.DENIED,
            [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]: PermissionsAndroid.RESULTS.DENIED,
          } as Record<string, 'granted' | 'denied' | 'never_ask_again'>
        );
        const fineGranted =
          res[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const coarseGranted =
          res[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;
        // Either is typically sufficient for scanning on older Android.
        return fineGranted || coarseGranted;
      }
    } catch (e) {
      return false;
    }
  }

  // iOS doesn't expose an explicit runtime prompt API for CoreBluetooth.
  // The system will prompt on first use (ensure Info.plist keys are set).
  return true;
}

export async function requestAllPermissions() {
  const [loc, ble] = await Promise.all([
    requestLocationPermissions(),
    requestBluetoothPermissions(),
  ]);
  return { location: loc, bluetooth: ble };
}
