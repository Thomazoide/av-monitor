import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useUserInputs } from '@/context/UserInputsContext';
import { requestAllPermissions } from '@/hooks/usePermissions';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

export default function LandingScreen() {
  const router = useRouter();
  const { patente, rut, setPatente, setRut } = useUserInputs();
  const [localPatente, setLocalPatente] = useState(patente);
  const [localRut, setLocalRut] = useState(rut);

  const [requestingPerms, setRequestingPerms] = useState(false);
  const canContinue = localPatente.trim().length > 0 && localRut.trim().length > 0 && !requestingPerms;

  const handleContinue = async () => {
    setRequestingPerms(true);
    const { location, bluetooth } = await requestAllPermissions();
    setRequestingPerms(false);

    // Proceed even if background isn't granted but foreground is; you can enforce stricter later.
    const ok = location.foreground && bluetooth;
    if (ok) {
      setPatente(localPatente.trim().toUpperCase());
      setRut(localRut.trim());
  router.replace('/(tabs)');
    } else {
      // Minimal UX: keep the user on the screen; you can add a Toast/Alert later.
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.logoWrap}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <ThemedText type="title" style={{ textAlign: 'center', marginTop: 12 }}>
          Municipalidad de Puente Alto
        </ThemedText>
        <ThemedText style={{ textAlign: 'center', opacity: 0.7 }}>
          Supervisión de Áreas Verdes
        </ThemedText>
      </View>

      <View style={styles.form}>
        <ThemedText style={styles.label}>Patente del vehículo</ThemedText>
        <TextInput
          value={localPatente}
          onChangeText={setLocalPatente}
          placeholder="Ej: ABCD12"
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
          maxLength={8}
          accessibilityLabel="Patente del vehículo"
        />

        <ThemedText style={[styles.label, { marginTop: 16 }]}>RUT del supervisor</ThemedText>
        <TextInput
          value={localRut}
          onChangeText={setLocalRut}
          placeholder="Ej: 12.345.678-9"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          style={styles.input}
          accessibilityLabel="RUT del supervisor"
        />
      </View>

      <View style={{ height: 16 }} />
      <Pressable
        onPress={handleContinue}
        disabled={!canContinue}
        style={({ pressed }) => [
          styles.button,
          (!canContinue || pressed) && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canContinue }}
      >
        <ThemedText style={{ textAlign: 'center', color: 'white', fontWeight: '600' }}>
          {requestingPerms ? 'Solicitando permisos…' : 'Continuar'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 96, height: 96 },
  form: { width: '100%', maxWidth: 480 },
  label: { marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  button: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    borderRadius: 12,
    opacity: 1,
  },
});
