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
      const api = Number(Platform.Version);
      if (api >= 31) {
        const res = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          // Advertise is only needed if you plan to advertise; request defensively.
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        ]);
        return (
          res[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          res[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
          res[PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        // On Android < 12, BLE scan often requires fine location permission.
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return res === PermissionsAndroid.RESULTS.GRANTED;
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
