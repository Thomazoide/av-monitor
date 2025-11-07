import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { backendURL } from '@/constants/Endpoints';
import { NIVEL_DE_BASURA, responsePayload, VisitFormData, WorkOrder } from '@/declarations/payloads';

export default function VisitFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    zoneId?: string;
    zoneName?: string;
    mac?: string;
    supervisorId?: string;
    orderId?: string;
    orderData?: string;
  }>();
  const [unusual, setUnusual] = useState('');
  const [needsGrassCut, setNeedsGrassCut] = useState(false);
  const [camping, setCamping] = useState(false);
  const [brokenFurniture, setBrokenFurniture] = useState(false);
  const [trashLevel, setTrashLevel] = useState<NIVEL_DE_BASURA>(NIVEL_DE_BASURA.BAJO);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [sendingForm, setSendingForm] = useState<boolean>(false);

  type SerializableWorkOrder = Omit<WorkOrder, 'creada_en' | 'completada_en'> & {
    creada_en: string | null;
    completada_en: string | null;
  };

  const parsedOrder = useMemo<SerializableWorkOrder | null>(() => {
    if (!params.orderData) {
      return null;
    }
    try {
      const raw = JSON.parse(params.orderData) as SerializableWorkOrder;
      return raw;
    } catch (error) {
      console.warn('No se pudo parsear la orden recibida', error);
      return null;
    }
  }, [params.orderData]);

  const resolvedZoneId = useMemo(() => {
    if (params.zoneId) return params.zoneId;
    if (parsedOrder?.zona?.id != null) return String(parsedOrder.zona.id);
    if (parsedOrder?.zonaID != null) return String(parsedOrder.zonaID);
    return undefined;
  }, [params.zoneId, parsedOrder]);

  const resolvedSupervisorId = useMemo(() => {
    if (params.supervisorId) return params.supervisorId;
    if (parsedOrder?.visitForm?.supervisor_id != null) {
      return String(parsedOrder.visitForm.supervisor_id);
    }
    if (parsedOrder?.equipo?.supervisorID != null) {
      return String(parsedOrder.equipo.supervisorID);
    }
    return undefined;
  }, [params.supervisorId, parsedOrder]);

  const zoneName = useMemo(() => {
    return params.zoneName || parsedOrder?.zona?.name || 'Zona desconocida';
  }, [params.zoneName, parsedOrder]);

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
    setSendingForm(true);
    try {
      if (!resolvedSupervisorId) {
        throw new Error('No se pudo determinar el supervisor asociado.');
      }

      const formData = new FormData();
      formData.append("fecha", (new Date()).toISOString());
      if (resolvedZoneId) {
        formData.append("zona_id", resolvedZoneId);
      }
      formData.append("supervisor_id", resolvedSupervisorId);
      formData.append("comentarios", unusual);
      formData.append("requiere_corte_cesped", needsGrassCut ? "true" : "false");
      formData.append("hay_gente_acampando", camping ? "true" : "false");
      formData.append("mobiliario_danado", brokenFurniture ? "true" : "false");
      formData.append("nivel_de_basura", trashLevel);
      if(photoUri) {
        const filename = `foto_${Date.now()}.jpg`;
        formData.append("foto", {
          uri: photoUri,
          name: filename,
          type: "image/jpeg"
        } as any);
      }
      const response = await fetch( `${backendURL}formularios`, {
        method: "POST",
        body: formData
      } );
      const json: responsePayload<VisitFormData> = await response.json().catch((e) => console.log(`\n\n\nEl error podría estar aqui: ${e}\n\n\n`));
      if(!response.ok || (json && json.error)) throw new Error(json.message);

      const submittedForm = json.data;

      if (params.orderId && parsedOrder) {
        try {
          const nowIso = new Date().toISOString();
          const updatedOrder: SerializableWorkOrder = {
            ...parsedOrder,
            completada: true,
            completada_en: nowIso,
            visitFormID: submittedForm?.id ?? parsedOrder.visitFormID ?? null,
            visitForm: submittedForm ?? parsedOrder.visitForm ?? null,
          };
          updatedOrder.creada_en = updatedOrder.creada_en ?? nowIso;
          updatedOrder.zona = submittedForm?.zona ?? parsedOrder.zona ?? null;

          const orderResponse = await fetch(`${backendURL}ordenes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedOrder),
          });

          if (!orderResponse.ok) {
            const errorText = await orderResponse.text();
            throw new Error(errorText || 'No se pudo actualizar la orden.');
          }
        } catch (orderError) {
          console.warn('No se pudo completar la orden automáticamente', orderError);
          Alert.alert(
            'Formulario enviado',
            'El formulario se registró, pero no se pudo marcar la orden como completada. Intenta nuevamente desde la lista de órdenes.',
            [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ],
          );
          return;
        }
      } else if (params.orderId && !parsedOrder) {
        Alert.alert(
          'Formulario enviado',
          'El formulario se registró, pero faltó información de la orden para completarla automáticamente. Actualízala manualmente.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ],
        );
        return;
      }

      Alert.alert("Formulario enviado", "Gracias por el reporte.", [
        {
          text: "OK", onPress: () => router.back()
        }
      ]);
    } catch(e) {
      console.log(`\n\n\nPordía ser aca el error: ${e}\n\n\n`)
      Alert.alert("Error al enviar el formulario", (e as Error).message, [
        {
          text: "Aceptar",
          onPress: () => router.back()
        }
      ]);
    } finally {
      setSendingForm(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Formulario de visita' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <ThemedText type="title" style={{ marginBottom: 8 }}>{zoneName}</ThemedText>
        {resolvedZoneId && (
          <ThemedText style={{ opacity: 0.7, marginBottom: 12 }}>ID zona: {resolvedZoneId}</ThemedText>
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
          {Object.values(NIVEL_DE_BASURA).map(level => (
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

        <Pressable
          onPress={handleSubmit}
          style={[styles.submitButton, sendingForm && styles.submitButtonDisabled]}
          disabled={sendingForm}
        >
          <ThemedText style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
            {sendingForm ? 'Enviando…' : 'Enviar reporte'}
          </ThemedText>
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
  submitButtonDisabled: { opacity: 0.7 },
  cameraContainer: { marginTop: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#ccc' },
  camera: { width: '100%', height: 300 },
  cameraActions: { flexDirection: 'row', justifyContent: 'flex-end', padding: 8, backgroundColor: 'white' }
});
