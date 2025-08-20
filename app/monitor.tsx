import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useUserInputs } from '@/context/UserInputsContext';
import { useBleScan } from '@/hooks/useBleScan';

// BLE scanning handled by useBleScan hook

function getMockVehicleData(patente: string) {
  const brands = ['Toyota', 'Nissan', 'Hyundai', 'Chevrolet', 'Kia'];
  const models = ['Hilux', 'Versa', 'Accent', 'Sail', 'Rio'];
  const colors = ['Blanco', 'Gris', 'Rojo', 'Azul', 'Negro'];
  const hash = patente.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    patente,
    brand: brands[hash % brands.length],
    model: models[hash % models.length],
    color: colors[hash % colors.length],
    year: 2018 + (hash % 7),
  };
}

export default function MonitorScreen() {
  const { rut, patente } = useUserInputs();
  const displayName = useMemo(() => {
    // If RUT contains letters, treat as a name; otherwise, show placeholder.
    return /[A-Za-z]/.test(rut) ? rut : 'Nombre Apellido';
  }, [rut]);

  const vehicle = useMemo(() => getMockVehicleData(patente || 'SIN-PATENTE'), [patente]);
  const { devices, scanning, error } = useBleScan();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ThemedText type="title" style={styles.title}>
        Supervisor {displayName}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        RUT: {rut || '—'}
      </ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle" style={{ marginBottom: 4 }}>Vehículo</ThemedText>
        <ThemedText>
          Patente: <ThemedText type="defaultSemiBold">{vehicle.patente}</ThemedText>
        </ThemedText>
        <ThemedText>
          {vehicle.brand} {vehicle.model} • {vehicle.color} • {vehicle.year}
        </ThemedText>
      </ThemedView>

      <View style={{ height: 12 }} />
      <ThemedView style={[styles.card, styles.row]}>
        <IconSymbol name="mappin.and.ellipse" color="#0a7ea4" size={22} style={{ marginRight: 8 }} />
        <ThemedText>Compartiendo la ubicación con la central…</ThemedText>
      </ThemedView>

      <View style={{ height: 12 }} />
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle" style={{ marginBottom: 8 }}>Dispositivos BLE cercanos</ThemedText>
        {error ? (
          <ThemedText style={{ color: 'crimson' }}>Error al escanear: {error}</ThemedText>
        ) : devices.length === 0 ? (
          <ThemedText>{scanning ? 'Escaneando dispositivos cercanos…' : 'No se detectaron dispositivos.'}</ThemedText>
        ) : (
          <FlatList
            data={devices}
            keyExtractor={(d) => d.id}
            renderItem={({ item }) => (
              <ThemedView style={styles.deviceRow}>
                <ThemedText type="defaultSemiBold">{item.name || 'Dispositivo sin nombre'}</ThemedText>
                <ThemedText style={{ opacity: 0.6 }}>RSSI: {item.rssi ?? '—'}</ThemedText>
                <ThemedText style={{ opacity: 0.6 }}>ID: {item.id}</ThemedText>
              </ThemedView>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { textAlign: 'left', marginBottom: 2 },
  subtitle: { opacity: 0.7, marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'white',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  deviceRow: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 10,
    backgroundColor: 'white',
  },
});
