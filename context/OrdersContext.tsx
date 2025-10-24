import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { backendURL } from '@/constants/Endpoints';
import { responsePayload, WorkOrder } from '@/declarations/payloads';

import { useUserInputs } from './UserInputsContext';

const STORAGE_PREFIX = 'work-orders-cache';

const globalForOrders = globalThis as typeof globalThis & {
  __ordersNotificationHandlerSet?: boolean;
};

if ((Platform.OS === 'ios' || Platform.OS === 'android') && !globalForOrders.__ordersNotificationHandlerSet) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  globalForOrders.__ordersNotificationHandlerSet = true;
}

function normalizeOrder(order: WorkOrder): WorkOrder {
  const createdAt = order.creada_en ? new Date(order.creada_en) : new Date();
  const completedAt = order.completada_en ? new Date(order.completada_en) : null;

  return {
    ...order,
    descripcion: order.descripcion ?? order.titulo ?? '',
    completada: Boolean(order.completada),
    creada_en: createdAt,
    completada_en: completedAt,
  };
}

function serializeOrder(order: WorkOrder) {
  return {
    ...order,
    creada_en: order.creada_en instanceof Date ? order.creada_en.toISOString() : order.creada_en,
    completada_en: order.completada_en instanceof Date ? order.completada_en.toISOString() : order.completada_en,
  };
}

export type OrdersContextType = {
  orders: WorkOrder[];
  loading: boolean;
  error: string | null;
  notificationsEnabled: boolean;
  fetchOrders: (showLoader?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
};

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { team } = useUserInputs();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const previousOrdersRef = useRef<WorkOrder[]>([]);
  const hasFetchedOnceRef = useRef(false);
  const storageKey = team?.id ? `${STORAGE_PREFIX}-${team.id}` : null;

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('orders', {
            name: 'Órdenes',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
        const existing = await Notifications.getPermissionsAsync();
        let status = existing.status;
        if (status !== 'granted') {
          const requested = await Notifications.requestPermissionsAsync();
          status = requested.status;
        }
        if (isMounted && status === 'granted') {
          setNotificationsEnabled(true);
        }
      } catch (notificationError) {
        console.warn('No se pudieron obtener permisos de notificación', notificationError);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCachedOrders = async () => {
      hasFetchedOnceRef.current = false;
      if (!storageKey) {
        previousOrdersRef.current = [];
        setOrders([]);
        return;
      }
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (!stored) {
          previousOrdersRef.current = [];
          if (!cancelled) {
            setOrders([]);
          }
          return;
        }
        const parsed = JSON.parse(stored) as WorkOrder[];
        const normalized = parsed.map(normalizeOrder);
        if (!cancelled) {
          previousOrdersRef.current = normalized;
          setOrders(normalized);
        }
      } catch (storageError) {
        console.warn('No se pudieron cargar las órdenes guardadas', storageError);
      }
    };

    loadCachedOrders();

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const fetchOrders = useCallback(
    async (showLoader = true) => {
      if (!team?.id) {
        if (showLoader) {
          setLoading(false);
        }
        setOrders([]);
        previousOrdersRef.current = [];
        hasFetchedOnceRef.current = false;
        setError(null);
        return;
      }
      if (showLoader) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch(`${backendURL}ordenes/equipo/${team.id}`);
        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }
        const body: responsePayload<WorkOrder[]> = await res.json();
        if (body.error) {
          throw new Error(body.message || 'Error desconocido');
        }
        const normalized = (body.data ?? [])
          .map(normalizeOrder)
          .sort((a, b) => {
            const dateA = a.creada_en instanceof Date ? a.creada_en.getTime() : new Date(a.creada_en || 0).getTime();
            const dateB = b.creada_en instanceof Date ? b.creada_en.getTime() : new Date(b.creada_en || 0).getTime();
            return dateB - dateA;
          });
        const previous = previousOrdersRef.current;
        const newAssignments = normalized.filter(
          (order) => !previous.some((prev) => prev.id === order.id),
        );

        setOrders(normalized);
        previousOrdersRef.current = normalized;

        if (storageKey) {
          try {
            const serializable = normalized.map(serializeOrder);
            await AsyncStorage.setItem(storageKey, JSON.stringify(serializable));
          } catch (storageError) {
            console.warn('No se pudieron guardar las órdenes en caché', storageError);
          }
        }

        const pendingNewAssignments = newAssignments.filter((order) => !order.completada);
        if (
          notificationsEnabled &&
          pendingNewAssignments.length &&
          Platform.OS !== 'web' &&
          hasFetchedOnceRef.current
        ) {
          const bodyText =
            pendingNewAssignments.length === 1
              ? pendingNewAssignments[0].descripcion || 'Tienes una nueva orden asignada.'
              : `Tienes ${pendingNewAssignments.length} nuevas órdenes asignadas.`;
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Nueva orden de trabajo',
                body: bodyText,
              },
              trigger: null,
            });
          } catch (notificationError) {
            console.warn('No se pudo programar la notificación', notificationError);
          }
        }
        hasFetchedOnceRef.current = true;
      } catch (fetchError) {
        setError((fetchError as Error).message);
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [team?.id, notificationsEnabled, storageKey],
  );

  useEffect(() => {
    void fetchOrders(false);
  }, [fetchOrders]);

  const refresh = useCallback(async () => {
    await fetchOrders(false);
  }, [fetchOrders]);

  const value = useMemo(
    () => ({ orders, loading, error, notificationsEnabled, fetchOrders, refresh }),
    [orders, loading, error, notificationsEnabled, fetchOrders, refresh],
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within OrdersProvider');
  }
  return context;
}
