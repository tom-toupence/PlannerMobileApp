import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Animated, LayoutAnimation } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/lib/auth-context';
import { MEMBER_COLORS } from '@/lib/colors';
import { api } from '@/lib/api';

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
  gold: '#FFD60A',
  textPrimary: '#EEEEF6',
  textSecondary: '#8B8CA7',
  textMuted: '#5A5B75',
  border: '#252540',
  white: '#FFFFFF',
};

type Group = { id: string; name: string; description: string | null; };

function AnimatedPressable({ onPress, style, children }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  };
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function GroupsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteGroupId, setFavoriteGroupId] = useState<string | null>(null);
  const hasAutoNavigated = useRef(false);
  const hasLoaded = useRef(false);
  const lastFetch = useRef(0);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    try {
      const data = await api.getGroups();
      const favId = data.favoriteGroupId || null;
      setFavoriteGroupId(favId);

      const groupsList = data.groups || [];
      const sorted = [...groupsList].sort((a: Group, b: Group) => {
        if (a.id === favId) return -1;
        if (b.id === favId) return 1;
        return 0;
      });
      setGroups(sorted);
      hasLoaded.current = true;
      lastFetch.current = Date.now();
    } catch (e) {
      if (!hasLoaded.current) setGroups([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  // Auto-navigate to favorite group on first launch
  useEffect(() => {
    if (!loading && favoriteGroupId && groups.length > 0 && !hasAutoNavigated.current) {
      const exists = groups.some(g => g.id === favoriteGroupId);
      if (exists) {
        hasAutoNavigated.current = true;
        router.push(`/group/${favoriteGroupId}`);
      }
    }
  }, [loading, favoriteGroupId, groups]);

  const toggleFavorite = async (groupId: string) => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newFavId = favoriteGroupId === groupId ? null : groupId;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFavoriteGroupId(newFavId);
    // Re-sort groups
    setGroups(prev => [...prev].sort((a, b) => {
      if (a.id === newFavId) return -1;
      if (b.id === newFavId) return 1;
      return 0;
    }));
    await api.updateFavoriteGroup(newFavId);
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchGroups(); }, [fetchGroups]);

  // Initial load
  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // Silent refresh on focus, max once per 30s
  useFocusEffect(useCallback(() => {
    if (hasLoaded.current && Date.now() - lastFetch.current > 30000) {
      fetchGroups();
    }
  }, [fetchGroups]));

  const getGroupColor = (id: string) => {
    const hash = id.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0);
    return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
  };

  const renderGroup = ({ item }: { item: Group }) => {
    const isFav = item.id === favoriteGroupId;
    return (
      <AnimatedPressable style={s.groupCard} onPress={() => router.push(`/group/${item.id}`)}>
        <View style={[s.groupAvatar, { backgroundColor: getGroupColor(item.id) }]}>
          <Text style={s.groupInitial}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={s.groupInfo}>
          <Text style={s.groupName}>{item.name}</Text>
          {item.description && <Text style={s.groupDescription} numberOfLines={1}>{item.description}</Text>}
        </View>
        <Pressable
          onPress={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
          style={s.starBtn}
          hitSlop={8}
        >
          <Text style={[s.starText, isFav && s.starTextActive]}>{isFav ? '\u2605' : '\u2606'}</Text>
        </Pressable>
      </AnimatedPressable>
    );
  };

  if (loading) {
    return <SafeAreaView style={s.loadingContainer}><ActivityIndicator size="large" color={C.accent} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Mes Groupes</Text>
        <Text style={s.subtitle}>{groups.length} groupe{groups.length !== 1 ? 's' : ''}</Text>
      </View>

      {groups.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconContainer}>
            <Text style={s.emptyIcon}>G</Text>
          </View>
          <Text style={s.emptyTitle}>Aucun groupe</Text>
          <Text style={s.emptyText}>Cree ou rejoins un groupe pour planifier des evenements avec tes amis</Text>
        </View>
      ) : (
        <FlatList data={groups} renderItem={renderGroup} keyExtractor={(item) => item.id} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        />
      )}

      <View style={s.actions}>
        <AnimatedPressable style={{ flex: 1 }} onPress={() => router.push('/group/create')}>
          <LinearGradient colors={[C.accent, C.accentDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.actionBtn}>
            <Text style={s.actionBtnLabel}>+ Creer un groupe</Text>
          </LinearGradient>
        </AnimatedPressable>
        <AnimatedPressable style={{ flex: 1 }} onPress={() => router.push('/group/join')}>
          <View style={s.actionBtnOutline}>
            <Text style={s.actionBtnOutlineLabel}>Rejoindre avec un code</Text>
          </View>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: C.textPrimary },
  subtitle: { fontSize: 14, color: C.textMuted, marginTop: 4 },

  list: { paddingHorizontal: 20, gap: 10, paddingBottom: 20 },

  groupCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border,
  },
  groupAvatar: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  groupInitial: { color: C.white, fontSize: 21, fontWeight: '700' },
  groupInfo: { marginLeft: 14, flex: 1 },
  groupName: { fontSize: 17, fontWeight: '600', color: C.textPrimary },
  groupDescription: { fontSize: 14, color: C.textSecondary, marginTop: 2 },

  starBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  starText: { fontSize: 22, color: C.textMuted },
  starTextActive: { color: C.gold },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.surfaceLight, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyIcon: { fontSize: 32, color: C.accentLight, fontWeight: '700' },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: C.textPrimary },
  emptyText: { fontSize: 15, color: C.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 },

  actions: {
    paddingHorizontal: 20, paddingVertical: 14, gap: 10,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
  },
  actionBtn: {
    justifyContent: 'center', alignItems: 'center',
    paddingVertical: 16, borderRadius: 16,
  },
  actionBtnLabel: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  actionBtnOutline: {
    justifyContent: 'center', alignItems: 'center',
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: C.surfaceLight,
  },
  actionBtnOutlineLabel: { color: C.cyan, fontSize: 15, fontWeight: '600' },
});
