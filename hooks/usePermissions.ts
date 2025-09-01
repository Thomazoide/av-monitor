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
    if (Platform.OS === 'web') {
      return { foreground: false, background: false };
    }

    const fg = await Location.requestForegroundPermissionsAsync();
    fgGranted = fg.status === 'granted';

    if (fgGranted) {
      if (Constants.appOwnership === 'expo') {
        bgGranted = false;
      } else {
        const withTimeout = async <T,>(p: Promise<T>, ms = 6000): Promise<T | null> => {
          return new Promise<T | null>((resolve) => {
            let done = false;
            const t = setTimeout(() => {
              if (!done) resolve(null);
            }, ms);
            p.then((v) => {
              done = true;
              clearTimeout(t);
              resolve(v);
            }).catch(() => {
              done = true;
              clearTimeout(t);
              resolve(null);
            });
          });
        };

        const bg = await withTimeout(Location.requestBackgroundPermissionsAsync(), 7000);
        if (bg && (bg as Location.PermissionResponse).status) {
          bgGranted = (bg as Location.PermissionResponse).status === 'granted';
        } else {
          bgGranted = false;
        }
      }
    }
  } catch {
  }

  return { foreground: fgGranted, background: bgGranted };
}

export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      if (Constants.appOwnership === 'expo') {
        return true;
      }
      const api = Number(Platform.Version);
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
        return fineGranted || coarseGranted;
      }
  } catch {
      return false;
    }
  }
  return true;
}

export async function requestAllPermissions() {
  const location = await requestLocationPermissions();
  const bluetooth = await requestBluetoothPermissions();
  return { location, bluetooth };
}
