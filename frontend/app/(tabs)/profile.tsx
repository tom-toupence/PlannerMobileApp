import { View, Text, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';

const C = {
  bg: '#0B0B1A',
  surface: '#151528',
  surfaceLight: '#1E1E36',
  surfaceLighter: '#2A2A4A',
  accent: '#7C5CFC',
  accentDark: '#5531D9',
  accentLight: '#9F85FF',
  cyan: '#00D4FF',
  teal: '#00C9A7',
  red: '#FF5A5A',
  textPrimary: '#EEEEF6',
  textSecondary: '#8B8CA7',
  textMuted: '#5A5B75',
  border: '#252540',
  white: '#FFFFFF',
};

type Profile = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

function AnimatedPressable({ onPress, style, children, disabled }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  };
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const data = await api.getProfile();
      if (data) { setProfile(data); setEditName(data.display_name || ''); }
    } catch (e) {}
    setLoading(false);
  };

  const handleSaveName = async () => {
    if (!editName.trim()) { Alert.alert('Erreur', 'Le pseudo ne peut pas etre vide'); return; }
    setSaving(true);
    try {
      await api.updateProfile(editName.trim());
      setProfile(prev => prev ? { ...prev, display_name: editName.trim() } : null);
      setEditModalVisible(false);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setSaving(false);
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) { Alert.alert('Permission requise', "Autorise l'acces aux photos."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled && result.assets[0]) await uploadImage(result.assets[0].uri);
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) { Alert.alert('Permission requise', "Autorise l'acces a la camera."); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled && result.assets[0]) await uploadImage(result.assets[0].uri);
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      setProfile(prev => prev ? { ...prev, avatar_url: uri } : null);
      const avatarUrl = await api.upload(uri, 'avatars');
      await api.updateAvatar(avatarUrl);
      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
    } catch (e: any) {
      Alert.alert('Erreur', 'Impossible de charger la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Photo de profil', 'Choisis une option', [
      { text: 'Prendre une photo', onPress: handleTakePhoto },
      { text: 'Galerie', onPress: handlePickImage },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>Profil</Text>

      <View style={s.profileCard}>
        <Pressable onPress={showPhotoOptions} style={s.avatarContainer}>
          {uploadingPhoto ? (
            <View style={s.avatarPlaceholder}><ActivityIndicator color={C.white} /></View>
          ) : profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={s.avatar} contentFit="cover" transition={300} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarText}>{profile?.display_name?.charAt(0).toUpperCase() || '?'}</Text>
            </View>
          )}
          <View style={s.avatarBadge}>
            <Text style={s.avatarBadgeText}>+</Text>
          </View>
        </Pressable>

        <Pressable onPress={() => setEditModalVisible(true)}>
          <Text style={s.displayName}>{profile?.display_name || 'Utilisateur'}</Text>
          <Text style={s.editHint}>Modifier</Text>
        </Pressable>

        <Text style={s.email}>{user?.email}</Text>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Compte</Text>
        <View style={s.menuCard}>
          <AnimatedPressable style={s.menuItem} onPress={() => setEditModalVisible(true)}>
            <View style={s.menuIconCircle}><Text style={s.menuIconText}>A</Text></View>
            <Text style={s.menuText}>Modifier le pseudo</Text>
            <Text style={s.menuChevron}>→</Text>
          </AnimatedPressable>
          <View style={s.menuDivider} />
          <AnimatedPressable style={s.menuItem} onPress={showPhotoOptions}>
            <View style={s.menuIconCircle}><Text style={s.menuIconText}>+</Text></View>
            <Text style={s.menuText}>Changer la photo</Text>
            <Text style={s.menuChevron}>→</Text>
          </AnimatedPressable>
        </View>
      </View>

      <AnimatedPressable style={s.logoutButton} onPress={signOut}>
        <Text style={s.logoutText}>Se deconnecter</Text>
      </AnimatedPressable>

      <Text style={s.version}>Version 1.0.0</Text>

      <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalContainer}>
          <SafeAreaView style={s.modalInner}>
            <View style={s.modalHeader}>
              <Pressable onPress={() => setEditModalVisible(false)}>
                <Text style={s.modalCancel}>Annuler</Text>
              </Pressable>
              <Text style={s.modalTitle}>Modifier le pseudo</Text>
              <Pressable onPress={handleSaveName} disabled={saving}>
                <Text style={[s.modalSave, saving && s.modalSaveDisabled]}>{saving ? '...' : 'OK'}</Text>
              </Pressable>
            </View>
            <View style={s.modalContent}>
              <Text style={s.inputLabel}>Pseudo</Text>
              <TextInput style={s.input} value={editName} onChangeText={setEditName} placeholder="Ton pseudo" placeholderTextColor={C.textMuted} autoFocus autoCapitalize="words" />
              <Text style={s.inputHint}>Ce nom sera visible par les autres membres de tes groupes</Text>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },

  title: { fontSize: 28, fontWeight: '700', color: C.textPrimary, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },

  profileCard: {
    alignItems: 'center', marginHorizontal: 20, padding: 28,
    backgroundColor: C.surface, borderRadius: 24, borderWidth: 1, borderColor: C.border,
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: C.accent },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: C.white, fontSize: 40, fontWeight: '600' },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.cyan, justifyContent: 'center', alignItems: 'center',
  },
  avatarBadgeText: { fontSize: 18, color: C.bg, fontWeight: '700' },

  displayName: { fontSize: 24, fontWeight: '700', color: C.textPrimary, marginTop: 16, textAlign: 'center' },
  editHint: { fontSize: 14, color: C.cyan, textAlign: 'center', marginTop: 4 },
  email: { fontSize: 14, color: C.textMuted, marginTop: 8 },

  section: { marginTop: 28, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: C.textMuted, marginBottom: 12, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },

  menuCard: { backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuIconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surfaceLighter, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuIconText: { fontSize: 16, color: C.accentLight, fontWeight: '600' },
  menuText: { flex: 1, fontSize: 16, color: C.textPrimary },
  menuChevron: { fontSize: 14, color: C.textMuted },
  menuDivider: { height: 1, backgroundColor: C.border, marginLeft: 64 },

  logoutButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 20, marginTop: 'auto', marginBottom: 12, padding: 16,
    backgroundColor: 'rgba(255,90,90,0.12)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,90,90,0.25)',
  },
  logoutText: { color: C.red, fontSize: 16, fontWeight: '600' },

  version: { textAlign: 'center', fontSize: 12, color: C.textMuted, marginBottom: 20 },

  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalInner: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalCancel: { fontSize: 16, color: C.textSecondary },
  modalTitle: { fontSize: 17, fontWeight: '600', color: C.textPrimary },
  modalSave: { fontSize: 16, color: C.cyan, fontWeight: '600' },
  modalSaveDisabled: { opacity: 0.5 },
  modalContent: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: C.textSecondary, marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: C.surfaceLight, borderRadius: 14, padding: 16, fontSize: 18,
    color: C.textPrimary, borderWidth: 1, borderColor: C.border,
  },
  inputHint: { fontSize: 13, color: C.textMuted, marginTop: 8, marginLeft: 4 },
});
