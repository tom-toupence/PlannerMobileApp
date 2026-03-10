import { View, Text, StyleSheet, TextInput, Pressable, Alert, Animated } from 'react-native';
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

export default function JoinGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) {
      Alert.alert('Erreur', 'Entre le code du groupe');
      return;
    }

    setLoading(true);

    try {
      const result = await api.joinGroup(code.trim(), getRandomColor());
      router.replace(`/group/${result.group_id || code.trim()}`);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Groupe non trouve');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <AnimatedPressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </AnimatedPressable>
      </View>

      <View style={s.content}>
        <View style={s.iconContainer}>
          <Text style={s.icon}>J</Text>
        </View>
        <Text style={s.title}>Rejoindre</Text>
        <Text style={s.subtitle}>Entre le code d'invitation pour rejoindre un groupe</Text>

        <View style={s.form}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Code du groupe</Text>
            <TextInput
              style={s.input}
              value={code}
              onChangeText={setCode}
              placeholder="Colle le code ici"
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={s.hint}>
            Demande le code a un membre du groupe
          </Text>
        </View>
      </View>

      <AnimatedPressable
        style={[s.joinButton, loading && s.joinButtonDisabled]}
        onPress={handleJoin}
        disabled={loading}
      >
        <Text style={s.joinButtonText}>
          {loading ? 'Connexion...' : 'Rejoindre le groupe'}
        </Text>
      </AnimatedPressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
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
    backgroundColor: C.cyan, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: C.cyan, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  icon: { fontSize: 28, color: C.bg, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700', color: C.textPrimary },
  subtitle: { fontSize: 16, color: C.textSecondary, marginTop: 8, marginBottom: 32, lineHeight: 24 },
  form: { gap: 12 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: C.textSecondary, marginLeft: 4 },
  input: {
    backgroundColor: C.surfaceLight, borderRadius: 14, padding: 16, fontSize: 16,
    color: C.textPrimary, borderWidth: 1, borderColor: C.border,
  },
  hint: { fontSize: 14, color: C.textMuted, marginLeft: 4 },
  joinButton: {
    marginHorizontal: 24, marginBottom: 24,
    backgroundColor: C.accent, paddingVertical: 18, borderRadius: 16, alignItems: 'center',
    shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  joinButtonDisabled: { opacity: 0.6 },
  joinButtonText: { color: C.white, fontSize: 17, fontWeight: '600' },
});
