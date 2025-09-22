import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function VisitFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ zoneId?: string; zoneName?: string; mac?: string }>();
  const [unusual, setUnusual] = useState('');
  const [needsGrassCut, setNeedsGrassCut] = useState(false);
  const [camping, setCamping] = useState(false);
  const [brokenFurniture, setBrokenFurniture] = useState(false);
  const [trashLevel, setTrashLevel] = useState<'bajo' | 'medio' | 'alto'>('bajo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const zoneName = params.zoneName || 'Zona desconocida';

  const pickPhoto = async () => {
    // 1) Revisar permiso actual; si no está concedido, pedirlo
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitas otorgar permiso de cámara para tomar una foto.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir a configuración', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }
    // 2) Permiso concedido -> mostrar la cámara embebida
    setShowCamera(true);
  };

  const handleCapture = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setShowCamera(false);
      }
    } catch {
      Alert.alert('Error', 'No se pudo capturar la foto.');
    }
  };

  const handleSubmit = async () => {
    // TODO: Integrar con backend si existe endpoint para formularios de visita
    Alert.alert('Formulario enviado', 'Gracias por el reporte.');
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Formulario de visita' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <ThemedText type="title" style={{ marginBottom: 8 }}>{zoneName}</ThemedText>
        {params.zoneId && (
          <ThemedText style={{ opacity: 0.7, marginBottom: 12 }}>ID zona: {params.zoneId}</ThemedText>
        )}

        <ThemedText style={styles.label}>¿Algo fuera de lo común?</ThemedText>
        <TextInput
          value={unusual}
          onChangeText={setUnusual}
          placeholder="Describe lo observado"
          style={styles.input}
          multiline
        />

        <View style={styles.row}>
          <Pressable onPress={() => setNeedsGrassCut(v => !v)} style={[styles.checkbox, needsGrassCut && styles.checkboxChecked]}>
            {needsGrassCut && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
          </Pressable>
          <ThemedText style={{ marginLeft: 8 }}>¿Requiere corte de césped?</ThemedText>
        </View>

        <View style={styles.row}>
          <Pressable onPress={() => setCamping(v => !v)} style={[styles.checkbox, camping && styles.checkboxChecked]}>
            {camping && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
          </Pressable>
          <ThemedText style={{ marginLeft: 8 }}>¿Hay gente acampando?</ThemedText>
        </View>

        <View style={styles.row}>
          <Pressable onPress={() => setBrokenFurniture(v => !v)} style={[styles.checkbox, brokenFurniture && styles.checkboxChecked]}>
            {brokenFurniture && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
          </Pressable>
          <ThemedText style={{ marginLeft: 8 }}>¿Mobiliario urbano dañado?</ThemedText>
        </View>

        <ThemedText style={styles.label}>Nivel de basura</ThemedText>
        <View style={[styles.row, { marginBottom: 12 }]}>
          {(['bajo','medio','alto'] as const).map(level => (
            <Pressable key={level} onPress={() => setTrashLevel(level)} style={[styles.pill, trashLevel === level && styles.pillActive]}>
              <ThemedText style={[styles.pillText, trashLevel === level && { color: 'white' }]}>
                {level.toUpperCase()}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText style={styles.label}>Foto (opcional)</ThemedText>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={{ width: '100%', height: 220, borderRadius: 10, marginBottom: 12 }} />
        ) : null}
        <Pressable onPress={pickPhoto} style={styles.photoButton}>
          <ThemedText style={{ color: 'white', textAlign: 'center' }}>Tomar foto</ThemedText>
        </Pressable>

        {showCamera && (
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <View style={styles.cameraActions}>
              <Pressable onPress={() => setShowCamera(false)} style={[styles.pill, { marginRight: 8 }]}> 
                <ThemedText style={styles.pillText}>Cancelar</ThemedText>
              </Pressable>
              <Pressable onPress={handleCapture} style={[styles.pill, styles.pillActive]}> 
                <ThemedText style={[styles.pillText, { color: 'white' }]}>Capturar</ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        <Pressable onPress={handleSubmit} style={styles.submitButton}>
          <ThemedText style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>Enviar reporte</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { marginTop: 12, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 10, minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#888', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
  checkboxChecked: { backgroundColor: '#0a7ea4', borderColor: '#0a7ea4' },
  checkboxMark: { color: 'white', fontWeight: '900', fontSize: 14, lineHeight: 14 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#0a7ea4', marginRight: 8 },
  pillActive: { backgroundColor: '#0a7ea4' },
  pillText: { color: '#0a7ea4', fontWeight: '600' },
  photoButton: { backgroundColor: '#4a98c4', padding: 12, borderRadius: 10, marginBottom: 12 },
  submitButton: { backgroundColor: '#0a7ea4', padding: 14, borderRadius: 12, marginTop: 8 },
  cameraContainer: { marginTop: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#ccc' },
  camera: { width: '100%', height: 300 },
  cameraActions: { flexDirection: 'row', justifyContent: 'flex-end', padding: 8, backgroundColor: 'white' }
});
