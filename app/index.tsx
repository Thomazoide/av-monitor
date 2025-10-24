import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useUserInputs } from '@/context/UserInputsContext';
import { requestAllPermissions } from '@/hooks/usePermissions';
import { startBackgroundTracking } from '@/services/backgroundTracking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';

export default function LandingScreen() {
  const router = useRouter();
  const { patente, rut, signIn, loading, error } = useUserInputs();
  const [localPatente, setLocalPatente] = useState(patente);
  const [localRut, setLocalRut] = useState(rut);

  const [requestingPerms, setRequestingPerms] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const canContinue = localPatente.trim().length > 0 && localRut.trim().length > 0 && !requestingPerms && !loading;

  // Cargar credenciales recordadas
  useEffect(() => {
    (async () => {
      try {
        const flag = await AsyncStorage.getItem('rememberCredentialsFlag');
        if (flag === '1') setRemember(true);
        const raw = await AsyncStorage.getItem('rememberCredentials');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.patente) setLocalPatente(parsed.patente);
          if (parsed?.rut) setLocalRut(parsed.rut);
        }
      } catch {}
    })();
  }, []);

  const handleContinue = async () => {
    setAuthError(null);
    // 1. Autenticación contra backend
    const okAuth = await signIn(localRut.trim(), localPatente.trim().toUpperCase());
    if (!okAuth) {
      setAuthError('Credenciales inválidas o error de servidor');
      return;
    }
    // 2. Permisos
    setRequestingPerms(true);
    const { location, bluetooth } = await requestAllPermissions();
    setRequestingPerms(false);
    const ok = location.foreground && location.background && bluetooth;
    if (!ok) {
      Alert.alert(
        'Permisos necesarios',
        'Los permisos de ubicación (incluida en segundo plano) y de Bluetooth son necesarios para el funcionamiento de la aplicación.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a Configuración', onPress: () => { Linking.openSettings(); } },
        ]
      );
      return;
    }
    // 3. Guardar / limpiar credenciales
    try {
      if (remember) {
        await AsyncStorage.setItem('rememberCredentials', JSON.stringify({ patente: localPatente.trim().toUpperCase(), rut: localRut.trim() }));
        await AsyncStorage.setItem('rememberCredentialsFlag', '1');
      } else {
        await AsyncStorage.removeItem('rememberCredentials');
        await AsyncStorage.removeItem('rememberCredentialsFlag');
      }
    } catch {}

    // 4. Iniciar tracking en segundo plano
    await startBackgroundTracking();
    // 5. Navegar
  router.replace('/(tabs)');
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

      <View style={styles.rememberRow}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: remember }}
          onPress={async () => {
            const next = !remember;
            setRemember(next);
            try {
              if (next) {
                await AsyncStorage.setItem('rememberCredentialsFlag', '1');
                // If user toggles on after escribir, ensure we persist current inputs too
                if (localPatente && localRut) {
                  await AsyncStorage.setItem('rememberCredentials', JSON.stringify({ patente: localPatente.trim().toUpperCase(), rut: localRut.trim() }));
                }
              } else {
                await AsyncStorage.removeItem('rememberCredentialsFlag');
                await AsyncStorage.removeItem('rememberCredentials');
              }
            } catch {}
          }}
          style={({ pressed }) => [styles.checkbox, remember && styles.checkboxChecked, pressed && { opacity: 0.7 }]}
        >
          {remember && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
        </Pressable>
        <Pressable onPress={async () => {
          const next = !remember;
          setRemember(next);
          try {
            if (next) {
              await AsyncStorage.setItem('rememberCredentialsFlag', '1');
              if (localPatente && localRut) {
                await AsyncStorage.setItem('rememberCredentials', JSON.stringify({ patente: localPatente.trim().toUpperCase(), rut: localRut.trim() }));
              }
            } else {
              await AsyncStorage.removeItem('rememberCredentialsFlag');
              await AsyncStorage.removeItem('rememberCredentials');
            }
          } catch {}
        }} style={{ flexShrink: 1 }}>
          <ThemedText style={{ marginLeft: 8 }}>Recordar mis datos</ThemedText>
        </Pressable>
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
          placeholder="RUT sin puntos y con guión"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          style={styles.input}
          accessibilityLabel="RUT del supervisor"
        />
        {(error || authError) && (
          <ThemedText style={{ color: 'crimson', marginTop: 8 }}>
            {authError || error}
          </ThemedText>
        )}
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
          {loading
            ? 'Validando credenciales…'
            : requestingPerms
            ? 'Solicitando permisos…'
            : 'Continuar'}
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
  rememberRow: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white'
  },
  checkboxChecked: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4'
  },
  checkboxMark: {
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 14,
  }
});
