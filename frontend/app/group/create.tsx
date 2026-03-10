import {
  View, Text, StyleSheet, TextInput, Pressable, Alert,
  Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getRandomColor } from '@/lib/colors';
import { api } from '@/lib/api';

const C = {
  bg: '#0B0B1A',
  surface: '#151528',
  surfaceLight: '#1E1E36',
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

export default function CreateGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    Keyboard.dismiss();

    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom du groupe est requis');
      return;
    }

    setLoading(true);

    try {
      const group = await api.createGroup(name.trim(), description.trim() || null, getRandomColor());
      router.replace(`/group/${group.id}`);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.inner}
        >
          <View style={s.header}>
            <AnimatedPressable onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backText}>←</Text>
            </AnimatedPressable>
          </View>

          <View style={s.content}>
            <View style={s.iconContainer}>
              <Text style={s.icon}>+</Text>
            </View>
            <Text style={s.title}>Nouveau groupe</Text>
            <Text style={s.subtitle}>Cree un espace pour planifier avec tes amis</Text>

            <View style={s.form}>
              <View style={s.inputGroup}>
                <Text style={s.label}>Nom du groupe</Text>
                <TextInput
                  style={s.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex: Vacances ete 2025"
                  placeholderTextColor={C.textMuted}
                  autoFocus
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Description (optionnel)</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="De quoi parle ce groupe ?"
                  placeholderTextColor={C.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>

          <AnimatedPressable
            style={[s.createButton, loading && s.createButtonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            <Text style={s.createButtonText}>
              {loading ? 'Creation...' : 'Creer le groupe'}
            </Text>
          </AnimatedPressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  backText: { fontSize: 20, color: C.textPrimary },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  iconContainer: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  icon: { fontSize: 28, color: C.white, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700', color: C.textPrimary },
  subtitle: { fontSize: 16, color: C.textSecondary, marginTop: 8, marginBottom: 32 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: C.textSecondary, marginLeft: 4 },
  input: {
    backgroundColor: C.surfaceLight, borderRadius: 14, padding: 16, fontSize: 16,
    color: C.textPrimary, borderWidth: 1, borderColor: C.border,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  createButton: {
    marginHorizontal: 24, marginBottom: 24,
    backgroundColor: C.accent, paddingVertical: 18, borderRadius: 16, alignItems: 'center',
    shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: C.white, fontSize: 17, fontWeight: '600' },
});
