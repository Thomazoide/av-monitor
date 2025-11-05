import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useOrders } from '@/context/OrdersContext';
import { useUserInputs } from '@/context/UserInputsContext';
import { WorkOrder } from '@/declarations/payloads';

function formatDateTime(value?: Date | null | string) {
  if (!value) {
    return '';
  }
  try {
    const dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
      return '';
    }
    return dateValue.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value instanceof Date ? value.toLocaleString() : String(value);
  }
}

export default function OrdersScreen() {
  const { team, supervisor } = useUserInputs();
  const { orders, loading, error, fetchOrders } = useOrders();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  useFocusEffect(
    useCallback(() => {
      void fetchOrders();
    }, [fetchOrders]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders(false);
    setRefreshing(false);
  }, [fetchOrders]);

  const renderOrder = ({ item }: { item: WorkOrder }) => {
    const isCompleted = Boolean(item.completada);
    const createdLabel = formatDateTime(item.creada_en as Date | null | string);
    const completedLabel = formatDateTime(item.completada_en as Date | null | string);
    const zoneName = item.zona?.name ?? item.visitForm?.zona?.name ?? null;
    const zoneId = item.zona?.id ?? item.visitForm?.zona?.id ?? item.zonaID ?? null;
    const comments = item.visitForm?.comentarios;

    const description = item.descripcion || item.titulo || `Orden #${item.id}`;

    const supervisorName = item.visitForm?.supervisor?.fullName;
    const superFormImage = item.superForm?.pictureUrl?.trim() || null;
    const reference = item.reference;

    const parseCoordinate = (value: unknown) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
      }
      return null;
    };

    const latitude = parseCoordinate(item.lat);
    const longitude = parseCoordinate(item.lng);
    const hasCoordinates = latitude != null && longitude != null;

    const createdIso = (() => {
      if (item.creada_en instanceof Date) {
        return item.creada_en.toISOString();
      }
      if (typeof item.creada_en === 'string' && item.creada_en) {
        const parsed = new Date(item.creada_en);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
      }
      return null;
    })();

    const completedIso = (() => {
      if (item.completada_en instanceof Date) {
        return item.completada_en.toISOString();
      }
      if (typeof item.completada_en === 'string' && item.completada_en) {
        const parsed = new Date(item.completada_en);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
      }
      return null;
    })();

    const serializedOrder = JSON.stringify({
      ...item,
      creada_en: createdIso,
      completada_en: completedIso,
    });

    const handleOpenMap = async () => {
      if (latitude == null || longitude == null) {
        return;
      }
      const latLng = `${latitude},${longitude}`;
      const label = encodeURIComponent(description);
      const primaryUrl =
        Platform.select({
          ios: `http://maps.apple.com/?ll=${latLng}&q=${label}`,
          android: `geo:${latLng}?q=${latLng}(${label})`,
          default: `https://www.google.com/maps/search/?api=1&query=${latLng}`,
        }) ?? `https://www.google.com/maps/search/?api=1&query=${latLng}`;
      const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${latLng}`;
      try {
        const canOpen = await Linking.canOpenURL(primaryUrl);
        if (canOpen) {
          await Linking.openURL(primaryUrl);
          return;
        }
      } catch {
        // ignored, we will attempt to open the fallback URL
      }
      await Linking.openURL(fallbackUrl);
    };

    return (
      <ThemedView
        style={[styles.card, isCompleted ? styles.cardCompleted : styles.cardActive]}
        lightColor={isCompleted ? '#f2f2f7' : '#e6f4ff'}
        darkColor={isCompleted ? '#2c2c2e' : '#1b313d'}>
        <ThemedText type="defaultSemiBold" style={[styles.description, isCompleted ? styles.textMuted : undefined]}>
          {description}
        </ThemedText>

        <View style={styles.headerRow}>
          {zoneName ? (
            <ThemedText style={[styles.meta, styles.metaBold, isCompleted ? styles.textMuted : undefined]}>
              Zona: {zoneName}
            </ThemedText>
          ) : (
            <View style={styles.flexSpacer} />
          )}
          {item.tipo ? (
            <View style={[styles.typePill, isCompleted ? styles.typePillCompleted : undefined]}>
              <ThemedText
                style={styles.typePillText}
                lightColor={isCompleted ? '#6d6d6d' : '#0a7ea4'}
                darkColor={isCompleted ? '#d1d1d6' : '#89cff0'}>
                {item.tipo}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {comments ? (
          <ThemedText style={[styles.body, isCompleted ? styles.textMuted : undefined]}>
            {comments}
          </ThemedText>
        ) : null}

        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, isCompleted ? styles.statusBadgeCompleted : styles.statusBadgePending]}>
            <ThemedText
              style={styles.statusBadgeText}
              lightColor="#ffffff"
              darkColor="#ffffff">
              {isCompleted ? 'Completada' : 'Pendiente'}
            </ThemedText>
          </View>
        </View>

        {item.estado ? (
          <ThemedText style={[styles.meta, isCompleted ? styles.textMuted : undefined]}>
            Estado: {item.estado}
          </ThemedText>
        ) : null}

        {item.prioridad ? (
          <ThemedText style={[styles.meta, isCompleted ? styles.textMuted : undefined]}>
            Prioridad: {item.prioridad}
          </ThemedText>
        ) : null}

        {reference ? (
          <ThemedText style={[styles.meta, styles.referenceLabel, isCompleted ? styles.textMuted : undefined]}>
            Referencia: {reference}
          </ThemedText>
        ) : null}

        {superFormImage ? (
          <Image
            source={{ uri: superFormImage }}
            style={styles.superFormImage}
            resizeMode="cover"
            accessibilityLabel="Imagen asociada del supervisor"
          />
        ) : null}

        {hasCoordinates ? (
          <Pressable onPress={() => { void handleOpenMap(); }} style={styles.mapButton}>
            <ThemedText style={styles.mapButtonText}>Ver en mapa</ThemedText>
          </Pressable>
        ) : null}

        {!isCompleted ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/visit-form',
                params: {
                  orderId: String(item.id),
                  orderData: serializedOrder,
                  zoneId: zoneId != null ? String(zoneId) : undefined,
                  zoneName: zoneName ?? undefined,
                  supervisorId: supervisor?.id
                    ? String(supervisor.id)
                    : team?.supervisorID
                      ? String(team.supervisorID)
                      : undefined,
                },
              })
            }
            style={styles.completeButton}>
            <ThemedText style={styles.completeButtonText}>Completar orden</ThemedText>
          </Pressable>
        ) : null}

        {createdLabel ? (
          <ThemedText style={[styles.meta, isCompleted ? styles.textMuted : undefined]}>
            Creada: {createdLabel}
          </ThemedText>
        ) : null}

        {isCompleted && completedLabel ? (
          <ThemedText style={[styles.meta, styles.metaCompleted]}>
            Cierre: {completedLabel}
          </ThemedText>
        ) : null}

        {supervisorName ? (
          <ThemedText style={[styles.meta, isCompleted ? styles.textMuted : undefined]}>
            Supervisor asignado: {supervisorName}
          </ThemedText>
        ) : null}

        {item.visitFormID ? (
          <ThemedText style={[styles.meta, isCompleted ? styles.textMuted : undefined]}>
            Formulario asociado: #{item.visitFormID}
          </ThemedText>
        ) : null}
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Órdenes de trabajo</ThemedText>
      {!team?.id ? (
        <View style={styles.center}>
          <ThemedText>Inicia sesión para ver las órdenes asignadas a tu equipo.</ThemedText>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <ThemedText onPress={() => void fetchOrders()} style={styles.retry}>
            Reintentar
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, index) => (item.id != null ? String(item.id) : `orden-${index}`)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={orders.length ? styles.listContent : styles.emptyContent}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <ThemedText>No hay órdenes disponibles.</ThemedText>
            </View>
          )}
          renderItem={renderOrder}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { marginBottom: 16 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  errorText: { color: 'crimson' },
  retry: { marginTop: 8, color: '#0a7ea4', fontWeight: '600' },
  listContent: { paddingBottom: 32 },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },
  separator: { height: 12 },
  card: {
    flex: 1,
    flexDirection: 'column',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  cardActive: {
    borderColor: '#0a7ea4',
  },
  cardCompleted: {
    borderColor: '#c7c7cc',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#d7ecff',
  },
  typePillCompleted: {
    backgroundColor: '#e3e3e8',
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  body: { marginTop: 8, marginBottom: 12, lineHeight: 20 },
  description: {
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 12,
  },
  statusBadgePending: {
    backgroundColor: '#0a7ea4',
  },
  statusBadgeCompleted: {
    backgroundColor: '#8e8e93',
  },
  statusBadgeText: {
    fontWeight: '600',
    fontSize: 13,
  },
  textMuted: {
    opacity: 0.6,
  },
  flexSpacer: {
    flex: 1,
  },
  meta: {
    opacity: 0.75,
    marginBottom: 4,
  },
  metaBold: {
    fontWeight: '600',
  },
  metaCompleted: {
    opacity: 0.6,
  },
  completeButton: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  mapButton: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a7ea4',
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  referenceLabel: {
    marginTop: 4,
  },
  superFormImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#d7ecff',
  },
});
