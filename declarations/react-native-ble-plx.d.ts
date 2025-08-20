declare module 'react-native-ble-plx' {
  export class BleManager {
    startDeviceScan(
      uuids: string[] | null,
      options: { allowDuplicates?: boolean } | null,
      listener: (error: BleError | null, device: Device | null) => void
    ): void;
    stopDeviceScan(): void;
  }
  export interface BleError { message: string }
  export interface Device {
    id: string;
    name?: string | null;
    rssi?: number | null;
  }
}
