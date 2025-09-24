import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Button, FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useUserInputs } from '@/context/UserInputsContext';
import { useBleScan } from '@/hooks/useBleScan';
import { usePositionSocket } from '@/hooks/usePositionSocket';

export default function MonitorScreen() {
  const router = useRouter();
  const { rut, supervisor, vehicle, team, loading } = useUserInputs();
  const displayName = supervisor?.fullName || '—';
  const { devices, scanning, error } = useBleScan();
  
  usePositionSocket();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ThemedText type="title" style={styles.title}>
        Supervisor/a {displayName}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        RUT: {supervisor?.rut || rut || '—'}
      </ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle" style={{ marginBottom: 4 }}>Equipo</ThemedText>
        <ThemedText>
          Nombre equipo: <ThemedText type="defaultSemiBold">{team?.nombre || '—'}</ThemedText>
        </ThemedText>
        <ThemedText>
          Supervisor ID: {team?.supervisorID ?? '—'} • Vehículo ID: {team?.vehiculoID ?? '—'}
        </ThemedText>
      </ThemedView>

      <View style={{ height: 12 }} />
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle" style={{ marginBottom: 4 }}>Vehículo</ThemedText>
        {vehicle ? (
          <>
            <ThemedText>
              Patente: <ThemedText type="defaultSemiBold">{vehicle.patente}</ThemedText>
            </ThemedText>
            <ThemedText>
              {(vehicle.marca || '—')} {(vehicle.modelo || '')}
            </ThemedText>
            <ThemedText style={{ opacity: 0.6 }}>ID: {vehicle.id}</ThemedText>
          </>
        ) : (
          <ThemedText>{loading ? 'Cargando vehículo…' : 'Sin datos de vehículo'}</ThemedText>
        )}
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
                <Button
                  testID='VISITFORMBUTTON'
                  title='Formulario de visita'
                  color="#4a98c4"
                  onPress={() => router.push((`/visit-form?zoneId=${encodeURIComponent(String((item as any).zoneId ?? ''))}&zoneName=${encodeURIComponent(item.name || '')}&mac=${encodeURIComponent(item.id)}&supervisorId=${encodeURIComponent(supervisor!.id!)}`) as any)}
                />
              </ThemedView>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8, borderBottomWidth: 1, borderBottomColor: "#4a98c4" }} />}
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
