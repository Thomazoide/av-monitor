import { useEffect, useRef, useState } from 'react';
import type { BleError } from 'react-native-ble-plx';
import { BleManager, Device } from 'react-native-ble-plx';

export type ScannedDevice = {
  id: string;
  name?: string | null;
  rssi?: number | null;
};

let unsupportedMsg =
  'Bluetooth no disponible en este entorno. Usa un dispositivo físico y un cliente de desarrollo (expo-dev-client) o una build nativa.';

export function useBleScan() {
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [scanning, setScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<Map<string, ScannedDevice>>(new Map());
  const activeRef = useRef<boolean>(false);
  const managerRef = useRef<BleManager | null>(null);

  useEffect(() => {
    setScanning(true);
    setError(null);
  // Lazy init and guard against missing native module (e.g., Expo Go)
  try {
    managerRef.current = new BleManager();
  } catch (e) {
    setError(unsupportedMsg);
    setScanning(false);
    return;
  }

  // Scan all (null UUIDs) and deduplicate devices
  activeRef.current = true;
  managerRef.current.startDeviceScan(null, { allowDuplicates: false }, (
      err: BleError | null,
      device: Device | null
    ) => {
      if (err) {
        setError(err.message);
        setScanning(false);
    stop();
        return;
      }
      if (device) {
        const entry: ScannedDevice = { id: device.id, name: device.name, rssi: device.rssi };
        if (!seen.current.has(device.id)) {
          seen.current.set(device.id, entry);
          setDevices(Array.from(seen.current.values()));
        } else {
          const prev = seen.current.get(device.id)!;
          if (prev.rssi !== entry.rssi || prev.name !== entry.name) {
            seen.current.set(device.id, { ...prev, ...entry });
            setDevices(Array.from(seen.current.values()));
          }
        }
      }
    });

    return () => {
      stop();
    };
  }, []);

  function stop() {
  if (!activeRef.current) return;
  activeRef.current = false;
  managerRef.current?.stopDeviceScan();
    setScanning(false);
  }

  function start() {
    if (scanning) return;
    seen.current.clear();
    setDevices([]);
    setError(null);
    setScanning(true);
    activeRef.current = true;
    if (!managerRef.current) {
      try {
        managerRef.current = new BleManager();
      } catch (e) {
        setError(unsupportedMsg);
        setScanning(false);
        return;
      }
    }
    managerRef.current.startDeviceScan(null, { allowDuplicates: false }, (
      err: BleError | null,
      device: Device | null
    ) => {
      if (err) {
        setError(err.message);
        stop();
        return;
      }
      if (device) {
        const entry: ScannedDevice = { id: device.id, name: device.name, rssi: device.rssi };
        if (!seen.current.has(device.id)) {
          seen.current.set(device.id, entry);
          setDevices(Array.from(seen.current.values()));
        }
      }
    });
  }

  return { devices, scanning, error, start, stop };
}
