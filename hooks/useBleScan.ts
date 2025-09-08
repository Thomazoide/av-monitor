import { backendURL } from '@/constants/Endpoints';
import { useUserInputs } from '@/context/UserInputsContext';
import { Record } from '@/declarations/payloads';
import { useEffect, useRef, useState } from 'react';
import type { BleError } from 'react-native-ble-plx';
import { BleManager, Device } from 'react-native-ble-plx';

export type ScannedDevice = {
  id: string;
  name?: string | null; // Will hold zone name when validated
  rssi?: number | null;
};

type ValidationResult = { zoneId: number; zoneName: string } | null;
type ActiveVisit = {
  zoneId: number;
  zoneName: string;
  arrival: number; // epoch ms
  lastSeen: number; // epoch ms
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
  const validating = useRef<Set<string>>(new Set()); // indica si la MAC encontrada se está validando
  const activeVisitsRef = useRef<Map<string, ActiveVisit>>(new Map()); // mac -> active visit
  const intervalRef = useRef<any>(null);
  const { rut, supervisor } = useUserInputs();

  useEffect(() => {
    setScanning(true);
    setError(null);
    try {
      managerRef.current = new BleManager();
    } catch (e) {
      setError((e as Error).message || unsupportedMsg);
      setScanning(false);
      return;
    }

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
        const mac = device.id?.toUpperCase();
        if (!mac || validating.current.has(mac)) return;
        if (seen.current.has(mac)) {
          // Update RSSI only
          const prev = seen.current.get(mac)!;
          if (prev.rssi !== device.rssi) {
            seen.current.set(mac, { ...prev, rssi: device.rssi });
            setDevices(Array.from(seen.current.values()));
          }
          // Update lastSeen for any active visit
          const v = activeVisitsRef.current.get(mac);
          if (v) {
            v.lastSeen = Date.now();
            activeVisitsRef.current.set(mac, v);
          }
          return;
        }
        // Validate against backend before adding to UI
        validating.current.add(mac);
        validateMac(mac)
          .then((res) => {
            if (!activeRef.current) return;
            if (res) {
              const entry: ScannedDevice = { id: mac, name: res.zoneName, rssi: device.rssi };
              seen.current.set(mac, entry);
              setDevices(Array.from(seen.current.values()));
              const now = Date.now();
              activeVisitsRef.current.set(mac, {
                zoneId: res.zoneId,
                zoneName: res.zoneName,
                arrival: now,
                lastSeen: now,
              });
            }
          })
          .catch(() => {
            // Ignore unknowns or errors; do not surface in UI
          })
          .finally(() => {
            validating.current.delete(mac);
          });
      }
    });

    return () => {
      // Inline cleanup equivalent to stop() to avoid adding it as a dependency
      if (activeRef.current) {
        activeRef.current = false;
        managerRef.current?.stopDeviceScan();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      const now = Date.now();
      activeVisitsRef.current.forEach((visit, mac) => {
        const record = buildRecord(visit.zoneId, visit.arrival, visit.lastSeen || now, rut);
        postRegistro(record).finally(() => {
          activeVisitsRef.current.delete(mac);
        });
      });
      setScanning(false);
    };
  }, []);

  function stop() {
    if (!activeRef.current) return;
    activeRef.current = false;
    managerRef.current?.stopDeviceScan();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Flush any active visits as ended now
    const now = Date.now();
    activeVisitsRef.current.forEach((visit, mac) => {
      const record = buildRecord(visit.zoneId, visit.arrival, visit.lastSeen || now, rut);
      postRegistro(record).finally(() => {
        activeVisitsRef.current.delete(mac);
      });
    });
    setScanning(false);
  }

  function start() {
    if (scanning) return;
    seen.current.clear();
    setDevices([]);
    setError(null);
    setScanning(true);
    activeRef.current = true;
    validating.current.clear();
    activeVisitsRef.current.clear();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!managerRef.current) {
      try {
        managerRef.current = new BleManager();
      } catch {
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
        const mac = device.id?.toUpperCase();
        if (!mac || validating.current.has(mac)) return;
        if (seen.current.has(mac)) {
          const v = activeVisitsRef.current.get(mac);
          if (v) {
            v.lastSeen = Date.now();
            activeVisitsRef.current.set(mac, v);
          }
          return;
        }
        validating.current.add(mac);
        validateMac(mac)
          .then((res) => {
            if (!activeRef.current) return;
            if (res) {
              const entry: ScannedDevice = { id: mac, name: res.zoneName, rssi: device.rssi };
              seen.current.set(mac, entry);
              setDevices(Array.from(seen.current.values()));
              const now = Date.now();
              activeVisitsRef.current.set(mac, {
                zoneId: res.zoneId,
                zoneName: res.zoneName,
                arrival: now,
                lastSeen: now,
              });
            }
          })
          .catch(() => {})
          .finally(() => {
            validating.current.delete(mac);
          });
      }
    });

    // watcher: if a validated beacon hasn't been seen recently, close the visit and POST
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeoutMs = 15000; // 15s without updates => considered out of range
      activeVisitsRef.current.forEach((visit, mac) => {
        if (now - visit.lastSeen > timeoutMs) {
          const record = buildRecord(visit.zoneId, visit.arrival, visit.lastSeen, rut);
          postRegistro(record).finally(() => {
            activeVisitsRef.current.delete(mac);
            seen.current.delete(mac);
            setDevices(Array.from(seen.current.values()));
          });
        }
      });
    }, 5000);
  }

  async function validateMac(mac: string): Promise<ValidationResult> {
    try {
      const res = await fetch(`${backendURL}beacons/find-by-mac`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.data && data.data.zona && data.data.zona.name) {
        return { zoneId: data.data.zona.id as number, zoneName: data.data.zona.name as string };
      }
      return null;
    } catch {
      return null;
    }
  }

  function buildRecord(zoneId: number, arrivalMs: number, leaveMs: number, rutStr: string): Partial<Record> {
    const fecha = formatDate(new Date(arrivalMs));
    const hora_llegada = formatTime(new Date(arrivalMs));
    const hora_salida = formatTime(new Date(leaveMs));
    const supervisor_id = supervisor!.id;
    return { fecha, id_zona: zoneId, hora_llegada, hora_salida, supervisor_id } as const;
  }

  async function postRegistro(body: ReturnType<typeof buildRecord>) {
    try {
      await fetch(`${backendURL}registros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // Optionally queue for retry
    }
  }

  function formatDate(d: Date) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}-${mm}-${yyyy}`;
  }

  function formatTime(d: Date) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
  }

  function parseRutToNumber(rutStr: string): number {
    if (!rutStr) return 0;
    const digits = rutStr.replace(/[^0-9]/g, '');
    if (!digits) return 0;
    // Commonly RUT includes DV at end; drop last digit as DV
    const core = digits.length > 7 ? digits.slice(0, -1) : digits;
    const n = parseInt(core, 10);
    return Number.isFinite(n) ? n : 0;
  }

  return { devices, scanning, error, start, stop };
}
