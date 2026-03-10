import {
  View, Text, StyleSheet, TextInput, Pressable, Alert,
  Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, ScrollView, Switch, ActivityIndicator, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '@/lib/api';

const C = {
  bg: '#0B0B1A',
  surface: '#151528',
  surfaceLight: '#1E1E36',
  surfaceLighter: '#2A2A4A',
  accent: '#7C5CFC',
  accentLight: '#9F85FF',
  cyan: '#00D4FF',
  textPrimary: '#EEEEF6',
  textSecondary: '#8B8CA7',
  textMuted: '#5A5B75',
  border: '#252540',
  white: '#FFFFFF',
};

function AnimatedPressable({ onPress, style, children, disabled }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function EditEventScreen() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const data = await api.getEvent(eventId);
      if (data) {
        setTitle(data.title);
        setDescription(data.description || '');
        setLocation(data.location || '');
        setStartDate(new Date(data.start_time));
        if (data.end_time) {
          setEndDate(new Date(data.end_time));
          const startDay = data.start_time.split('T')[0];
          const endDay = data.end_time.split('T')[0];
          setIsMultiDay(startDay !== endDay);
        } else {
          setEndDate(new Date(data.start_time));
        }
      }
    } catch (e) {}
    setLoading(false);
  };

  const handleSave = async () => {
    Keyboard.dismiss();

    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Erreur', 'La fin doit etre apres le debut');
      return;
    }

    setSaving(true);

    try {
      await api.updateEvent(eventId, {
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
      setSaving(false);
    }
  };

  const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const formatTime = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const updateStartDate = (newDate: Date) => {
    setStartDate(newDate);
    if (newDate >= endDate) {
      setEndDate(new Date(newDate.getTime() + 60 * 60 * 1000));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.inner}>
          <View style={s.header}>
            <AnimatedPressable onPress={() => router.back()} style={s.headerBtn}>
              <Text style={s.headerBtnText}>Annuler</Text>
            </AnimatedPressable>
            <Text style={s.headerTitle}>Modifier</Text>
            <AnimatedPressable onPress={handleSave} disabled={saving} style={s.headerBtn}>
              <Text style={[s.headerSaveText, saving && s.headerBtnDisabled]}>
                {saving ? '...' : 'Enregistrer'}
              </Text>
            </AnimatedPressable>
          </View>

          <ScrollView style={s.form} showsVerticalScrollIndicator={false} contentContainerStyle={s.formContent}>
            <View style={s.inputGroup}>
              <Text style={s.label}>Titre</Text>
              <TextInput
                style={s.inputLarge}
                value={title}
                onChangeText={setTitle}
                placeholder="Nom de l'evenement"
                placeholderTextColor={C.textMuted}
              />
            </View>

            <View style={s.switchCard}>
              <View>
                <Text style={s.switchLabel}>Plusieurs jours</Text>
                <Text style={s.switchHint}>Activer pour les evenements sur plusieurs jours</Text>
              </View>
              <Switch
                value={isMultiDay}
                onValueChange={setIsMultiDay}
                trackColor={{ false: C.surfaceLighter, true: C.accent }}
                thumbColor={C.white}
              />
            </View>

            <View style={s.dateCard}>
              <Text style={s.dateCardTitle}>Debut</Text>
              <View style={s.dateRow}>
                <AnimatedPressable style={s.datePicker} onPress={() => setShowStartDatePicker(true)}>
                  <Text style={s.dateIcon}>D</Text>
                  <Text style={s.dateText}>{formatDate(startDate)}</Text>
                </AnimatedPressable>
                <AnimatedPressable style={s.timePicker} onPress={() => setShowStartTimePicker(true)}>
                  <Text style={s.dateIcon}>H</Text>
                  <Text style={s.dateText}>{formatTime(startDate)}</Text>
                </AnimatedPressable>
              </View>
            </View>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="spinner"
                textColor={C.textPrimary}
                onChange={(_, d) => {
                  setShowStartDatePicker(false);
                  if (d) {
                    const newD = new Date(startDate);
                    newD.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                    updateStartDate(newD);
                  }
                }}
              />
            )}
            {showStartTimePicker && (
              <DateTimePicker
                value={startDate}
                mode="time"
                display="spinner"
                textColor={C.textPrimary}
                onChange={(_, d) => {
                  setShowStartTimePicker(false);
                  if (d) {
                    const newD = new Date(startDate);
                    newD.setHours(d.getHours(), d.getMinutes());
                    updateStartDate(newD);
                  }
                }}
              />
            )}

            <View style={s.dateCard}>
              <Text style={s.dateCardTitle}>Fin</Text>
              <View style={s.dateRow}>
                {isMultiDay && (
                  <AnimatedPressable style={s.datePicker} onPress={() => setShowEndDatePicker(true)}>
                    <Text style={s.dateIcon}>D</Text>
                    <Text style={s.dateText}>{formatDate(endDate)}</Text>
                  </AnimatedPressable>
                )}
                <AnimatedPressable style={[s.timePicker, !isMultiDay && s.timePickerFull]} onPress={() => setShowEndTimePicker(true)}>
                  <Text style={s.dateIcon}>H</Text>
                  <Text style={s.dateText}>{formatTime(endDate)}</Text>
                </AnimatedPressable>
              </View>
            </View>

            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="spinner"
                minimumDate={startDate}
                textColor={C.textPrimary}
                onChange={(_, d) => {
                  setShowEndDatePicker(false);
                  if (d) {
                    const newD = new Date(endDate);
                    newD.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                    setEndDate(newD);
                  }
                }}
              />
            )}
            {showEndTimePicker && (
              <DateTimePicker
                value={endDate}
                mode="time"
                display="spinner"
                textColor={C.textPrimary}
                onChange={(_, d) => {
                  setShowEndTimePicker(false);
                  if (d) {
                    const newD = new Date(endDate);
                    newD.setHours(d.getHours(), d.getMinutes());
                    setEndDate(newD);
                  }
                }}
              />
            )}

            <View style={s.inputGroup}>
              <Text style={s.label}>Lieu</Text>
              <TextInput
                style={s.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Ajouter un lieu"
                placeholderTextColor={C.textMuted}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Description</Text>
              <TextInput
                style={[s.input, s.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Ajouter des details"
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  inner: { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerBtn: { minWidth: 80 },
  headerBtnText: { fontSize: 16, color: C.textSecondary },
  headerTitle: { fontSize: 17, fontWeight: '600', color: C.textPrimary },
  headerSaveText: { fontSize: 16, color: C.cyan, fontWeight: '600', textAlign: 'right' },
  headerBtnDisabled: { opacity: 0.5 },

  form: { flex: 1 },
  formContent: { padding: 20, gap: 16 },

  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: C.textSecondary, marginLeft: 4 },
  input: {
    backgroundColor: C.surfaceLight, borderRadius: 14, padding: 16, fontSize: 16,
    color: C.textPrimary, borderWidth: 1, borderColor: C.border,
  },
  inputLarge: {
    backgroundColor: C.surfaceLight, borderRadius: 14, padding: 16, fontSize: 18, fontWeight: '500',
    color: C.textPrimary, borderWidth: 1, borderColor: C.border,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  switchCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border,
  },
  switchLabel: { fontSize: 16, fontWeight: '500', color: C.textPrimary },
  switchHint: { fontSize: 13, color: C.textMuted, marginTop: 2 },

  dateCard: { backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  dateCardTitle: { fontSize: 14, fontWeight: '600', color: C.accentLight, marginBottom: 12 },
  dateRow: { flexDirection: 'row', gap: 12 },
  datePicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceLight, borderRadius: 10, padding: 14, gap: 10,
  },
  timePicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceLight, borderRadius: 10, padding: 14, gap: 10,
  },
  timePickerFull: { flex: 1 },
  dateIcon: { fontSize: 14, color: C.cyan, fontWeight: '700' },
  dateText: { fontSize: 16, color: C.textPrimary, fontWeight: '500' },
});
