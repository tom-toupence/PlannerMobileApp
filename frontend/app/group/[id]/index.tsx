import { View, Text, StyleSheet, Pressable, ScrollView, Alert, RefreshControl, Modal, TextInput, Platform, FlatList, ActivityIndicator, Dimensions, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { MEMBER_COLORS } from '@/lib/colors';


LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'],
  monthNamesShort: ['Janv.', 'Fevr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Aout', 'Sept.', 'Oct.', 'Nov.', 'Dec.'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

const C = {
  bg: '#0B0B1A',
  surface: '#151528',
  surfaceLight: '#1E1E36',
  surfaceLighter: '#2A2A4A',
  accent: '#7C5CFC',
  accentLight: '#9F85FF',
  accentDark: '#5531D9',
  accentGlow: 'rgba(124,92,252,0.3)',
  cyan: '#00D4FF',
  teal: '#00C9A7',
  pink: '#FF6B9D',
  red: '#FF5A5A',
  textPrimary: '#EEEEF6',
  textSecondary: '#8B8CA7',
  textMuted: '#5A5B75',
  border: '#252540',
  white: '#FFFFFF',
};

type Group = { id: string; name: string; background_url?: string | null; };
type Member = { user_id: string; color: string; profile: { display_name: string | null; avatar_url: string | null; }; };
type Event = { id: string; title: string; description: string | null; start_time: string; end_time: string | null; location: string | null; created_by: string; };
type DayEvent = Event & { color: string; isStart: boolean; isEnd: boolean; isContinue: boolean; };
type Message = { id: string; content: string; image_url?: string | null; created_by: string; created_at: string; };

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const formatMessageTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const msgKeyExtractor = (item: Message) => item.id;

const calendarTheme = {
  backgroundColor: 'transparent', calendarBackground: 'transparent',
  monthTextColor: C.textPrimary, textMonthFontSize: 18, textMonthFontWeight: '700' as const,
  arrowColor: C.cyan, textDayHeaderFontSize: 13, textDayHeaderFontWeight: '600' as const,
  textSectionTitleColor: C.textSecondary,
};

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'calendar' | 'chat'>('calendar');
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [sendingImage, setSendingImage] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const hasLoadedData = useRef(false);

  // Reanimated values for send button pulse
  const sendScale = useSharedValue(1);
  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  // Reanimated keyboard animation
  const keyboardOffset = useSharedValue(0);
  const keyboardAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardOffset.value,
  }));

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardOffset.value = withSpring(e.endCoordinates.height - insets.bottom, { damping: 15, stiffness: 150 });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardOffset.value = withSpring(0, { damping: 15, stiffness: 150 });
    });

    return () => { showSub.remove(); hideSub.remove(); };
  }, [insets.bottom]);

  // Data fetching 

  const fetchGroup = useCallback(async () => {
    try {
      const data = await api.getGroup(id);
      if (data) setGroup({ id: data.id, name: data.name, background_url: data.image_url });
    } catch (e) {}
  }, [id]);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await api.getMembers(id);
      if (data && data.length > 0) setMembers(data);
    } catch (e) {}
  }, [id]);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await api.getEvents(id);
      if (data) setEvents(data);
    } catch (e) {}
  }, [id]);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.getMessages(id);
      if (data) {
        setMessages(data.reverse());
      }
    } catch (e) {}
  }, [id]);

  // Memoized member lookup maps - O(1) instead of O(n) per lookup
  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach(m => map.set(m.user_id, m));
    return map;
  }, [members]);

  const getMemberColor = useCallback((userId: string) => memberMap.get(userId)?.color || C.accent, [memberMap]);
  const getMemberName = useCallback((userId: string) => memberMap.get(userId)?.profile.display_name || 'Membre', [memberMap]);
  const getMemberAvatar = useCallback((userId: string) => memberMap.get(userId)?.profile.avatar_url, [memberMap]);

  // Memoized marked dates - only recomputes when events or members change
  const markedDates = useMemo(() => {
    const marks: Record<string, { events: DayEvent[] }> = {};
    events.forEach((event) => {
      const color = memberMap.get(event.created_by)?.color || C.accent;
      const startDate = event.start_time.split('T')[0];
      const endDate = event.end_time ? event.end_time.split('T')[0] : startDate;
      const isMultiDay = startDate !== endDate;
      let currentDate = new Date(startDate);
      const lastDate = new Date(endDate);
      while (currentDate <= lastDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const isStart = dateStr === startDate;
        const isEnd = dateStr === endDate;
        const isContinue = isMultiDay && !isStart && !isEnd;
        if (!marks[dateStr]) marks[dateStr] = { events: [] };
        marks[dateStr].events.push({ ...event, color, isStart: isMultiDay ? isStart : true, isEnd: isMultiDay ? isEnd : true, isContinue });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    return marks;
  }, [events, memberMap]);

  // Load all data once on mount
  useEffect(() => {
    fetchGroup(); fetchMembers(); fetchEvents(); fetchMessages();
  }, []);

  // Supabase Realtime: listen for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `group_id=eq.${id}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        // Don't add if it's our own optimistic message already shown
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          // Remove any temp message from same user at similar time
          const filtered = prev.filter(m => !(m.id.startsWith('temp-') && m.created_by === newMsg.created_by));
          return [newMsg, ...filtered];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchGroup(), fetchMembers(), fetchEvents(), fetchMessages()]);
    setRefreshing(false);
  }, [fetchGroup, fetchMembers, fetchEvents, fetchMessages]);

  // ─── Actions ───

  const shareGroupCode = async () => {
    await Clipboard.setStringAsync(id as string);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Code copie', 'Partage-le avec tes amis.');
  };

  const sendMessage = async () => {
    const text = newMessage.trim();
    const imageUri = pendingImage;
    if (!text && !imageUri) return;

    // Send button pulse animation
    sendScale.value = withSequence(
      withSpring(1.3, { damping: 4, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = { id: tempId, content: text || (imageUri ? 'Photo' : ''), image_url: imageUri || null, created_by: user?.id || '', created_at: new Date().toISOString() };
// Prepend for inverted FlatList
    setMessages(prev => [optimistic, ...prev]);
    setNewMessage('');
    setPendingImage(null);

    if (imageUri) setSendingImage(true);
    try {
      let finalImageUrl: string | null = null;
      if (imageUri) finalImageUrl = await api.upload(imageUri, 'chat');
      await api.sendMessage(id, text || (imageUri ? 'Photo' : ''), finalImageUrl);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || "Impossible d'envoyer");
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSendingImage(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, allowsEditing: false });
    if (!result.canceled && result.assets[0]) {
    setPendingImage(result.assets[0].uri);
    }
  };

  const changeBackground = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, allowsEditing: false });
    if (!result.canceled && result.assets[0]) {
      const localUri = result.assets[0].uri;
      setGroup(prev => prev ? { ...prev, background_url: localUri } : null);
      try {
        const imageUrl = await api.upload(localUri, 'backgrounds');
        await api.updateGroup(id, { image_url: imageUrl });
        setGroup(prev => prev ? { ...prev, background_url: imageUrl } : null);
      } catch (e: any) {
        Alert.alert('Erreur', e.message || 'Impossible de changer le fond');
      }
    }
  };

  // ─── Helpers ───

  const eventsForSelectedDate = useMemo(() => events.filter((e) => {
    const start = e.start_time.split('T')[0];
    const end = e.end_time ? e.end_time.split('T')[0] : start;
    return selectedDate >= start && selectedDate <= end;
  }), [events, selectedDate]);

  const canEdit = selectedEvent?.created_by === user?.id;
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const handleDayPress = (day: any) => { setSelectedDate(day.dateString); setDayModalVisible(true); };
  const handleEventPress = (event: Event) => setSelectedEvent(event);
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    Alert.alert('Supprimer', 'Supprimer cet evenement ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await api.deleteEvent(selectedEvent.id);
          setSelectedEvent(null); fetchEvents();
        } catch (e: any) {
          Alert.alert('Erreur', e.message);
        }
      }},
    ]);
  };

  // ─── Render: Calendar day ───

  const renderDay = useCallback((date: any, state: any) => {
    const dateStr = date?.dateString;
    const dayEvents = markedDates[dateStr]?.events || [];
    const isSelected = dateStr === selectedDate;
    const isToday = dateStr === todayStr;
    const isDisabled = state === 'disabled';
    return (
      <Pressable style={[s.dayContainer, isToday && s.dayToday, isSelected && s.daySelected]} onPress={() => handleDayPress({ dateString: dateStr })}>
        <Text style={[s.dayText, isToday && s.dayTodayText, isSelected && s.dayTextSelected, isDisabled && s.dayDisabled]}>{date?.day}</Text>
        <View style={s.dayEventsContainer}>
          {dayEvents.slice(0, 3).map((evt: DayEvent, i: number) => (
            <View key={`${evt.id}-${i}`} style={[s.eventBar, { backgroundColor: evt.color }, evt.isStart && s.eventBarStart, evt.isEnd && s.eventBarEnd, evt.isContinue && s.eventBarContinue, !evt.isStart && s.eventBarExtendLeft, !evt.isEnd && s.eventBarExtendRight]}>
              {evt.isStart && <Text style={s.eventBarText} numberOfLines={1}>{evt.title}</Text>}
            </View>
          ))}
          {dayEvents.length > 3 && <Text style={s.dayMoreText}>+{dayEvents.length - 3}</Text>}
        </View>
      </Pressable>
    );
  }, [markedDates, selectedDate, todayStr]);

  // ─── Render: Chat message ───

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.created_by === user?.id;
    const avatar = getMemberAvatar(item.created_by);
    const color = getMemberColor(item.created_by);
    const hasText = item.content && item.content !== 'Photo';

    // Message grouping with inverted list:
    // In inverted FlatList, index 0 is newest (bottom visually)
    // prevMsg (visually above) = messages[index + 1]
    // nextMsg (visually below) = messages[index - 1]
    const prevMsg = index < messages.length - 1 ? messages[index + 1] : null;
    const nextMsg = index > 0 ? messages[index - 1] : null;
    const isSameAuthorAsPrev = prevMsg?.created_by === item.created_by &&
      (new Date(item.created_at).getTime() - new Date(prevMsg.created_at).getTime()) < 120000;
    const isSameAuthorAsNext = nextMsg?.created_by === item.created_by &&
      (new Date(nextMsg.created_at).getTime() - new Date(item.created_at).getTime()) < 120000;
    const isGrouped = isSameAuthorAsPrev;
    const isLastInGroup = !isSameAuthorAsNext;

    return (
      <View style={[s.messageRow, isMe && s.messageRowMe, isGrouped && s.messageRowGrouped]}>
        {!isMe && (
          isLastInGroup ? (
            avatar ? <Image source={{ uri: avatar }} style={s.messageAvatar} cachePolicy="disk" /> :
            <View style={[s.messageAvatarPlaceholder, { backgroundColor: color }]}>
              <Text style={s.messageAvatarText}>{getMemberName(item.created_by).charAt(0)}</Text>
            </View>
          ) : <View style={s.messageAvatarSpacer} />
        )}
        <View style={[s.messageBubble, isMe ? s.messageBubbleMe : s.messageBubbleOther]}>
          {!isMe && !isGrouped && <Text style={[s.messageSender, { color }]}>{getMemberName(item.created_by)}</Text>}
          {item.image_url ? (
            <Pressable onPress={() => setViewImageUrl(item.image_url!)}>
              <Image source={{ uri: item.image_url }} style={s.messageImage} contentFit="cover" cachePolicy="disk" />
            </Pressable>
          ) : null}
          {hasText ? <Text style={[s.messageText, isMe && s.messageTextMe]}>{item.content}</Text> : null}
          <Text style={[s.messageTime, isMe && s.messageTimeMe]}>{formatMessageTime(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  // ─── Main render ───

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.headerBackBtn}>
          <Text style={s.headerBackText}>←</Text>
        </Pressable>
        <Pressable onPress={shareGroupCode} style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{group?.name}</Text>
          <Text style={s.headerSubtitle}>{members.length} membre{members.length !== 1 ? 's' : ''}</Text>
        </Pressable>
        {activeTab === 'chat' && (
          <Pressable onPress={changeBackground} style={s.headerActionBtn}>
            <Text style={s.headerActionText}>Fond</Text>
          </Pressable>
        )}
      </View>

      {/* ── Content ── */}
      <View style={{ flex: 1 }}>
        {/* Calendar tab - absolute positioned, always mounted */}
        <View style={[StyleSheet.absoluteFill, { zIndex: activeTab === 'calendar' ? 1 : 0, backgroundColor: C.bg }]} pointerEvents={activeTab === 'calendar' ? 'auto' : 'none'}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
            contentContainerStyle={s.calendarScroll}
          >
            {/* Members */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.membersScroll} style={s.membersSection}>
              {members.map((m) => (
                <View key={m.user_id} style={s.memberChip}>
                  {m.profile.avatar_url ? (
                    <Image source={{ uri: m.profile.avatar_url }} style={[s.memberAvatar, { borderColor: m.color }]} cachePolicy="disk" />
                  ) : (
                    <View style={[s.memberAvatarPlaceholder, { backgroundColor: m.color }]}>
                      <Text style={s.memberAvatarText}>{m.profile.display_name?.charAt(0).toUpperCase() || '?'}</Text>
                    </View>
                  )}
                  <Text style={s.memberName} numberOfLines={1}>{m.user_id === user?.id ? 'Moi' : m.profile.display_name?.split(' ')[0] || 'Membre'}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Calendar */}
            <View style={s.calendarCard}>
              <Calendar dayComponent={({ date, state }) => renderDay(date, state)} theme={calendarTheme} firstDay={1} hideExtraDays />
            </View>

            {/* Add event button */}
            <Pressable style={{ marginHorizontal: 20, marginTop: 20 }} onPress={() => router.push(`/group/${id}/add-event?date=${selectedDate}`)}>
              <LinearGradient colors={[C.accent, C.accentDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.addButton}>
                <Text style={s.addButtonText}>+ Nouvel evenement</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>

        {/* Chat tab - absolute positioned, always mounted */}
        <Animated.View style={[StyleSheet.absoluteFill, keyboardAnimatedStyle, { zIndex: activeTab === 'chat' ? 1 : 0 }]} pointerEvents={activeTab === 'chat' ? 'auto' : 'none'}>
            <View style={{ flex: 1 }}>
              {/* Background image layer */}
              {group?.background_url && (
                <Image source={{ uri: group.background_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
              )}
              <View style={[s.chatOverlay, group?.background_url && s.chatOverlayWithBg]}>
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={msgKeyExtractor}
                  contentContainerStyle={s.messagesList}
                  showsVerticalScrollIndicator={false}
                  inverted={true}
                  keyboardDismissMode="on-drag"
                  keyboardShouldPersistTaps="handled"
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={15}
                  windowSize={11}
                  initialNumToRender={20}
                />

                {/* Pending image preview */}
                {pendingImage && (
                  <View style={s.pendingImageBar}>
                    <Image source={{ uri: pendingImage }} style={s.pendingImageThumb} contentFit="cover" />
                    <Text style={s.pendingImageText}>Photo jointe</Text>
                    <Pressable onPress={() => setPendingImage(null)} style={s.pendingImageRemove}>
                      <Text style={s.pendingImageRemoveText}>x</Text>
                    </Pressable>
                  </View>
                )}

                {/* Input bar */}
                <View style={s.inputBar}>
                  <Pressable style={s.photoBtn} onPress={pickImage} disabled={sendingImage}>
                    <Text style={s.photoBtnText}>+</Text>
                  </Pressable>
                  <TextInput
                    style={s.chatInput}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Message..."
                    placeholderTextColor={C.textMuted}
                    multiline
                  />
                  <Pressable onPress={sendMessage} disabled={sendingImage}>
                    <Animated.View style={sendAnimatedStyle}>
                      <LinearGradient colors={[C.accent, C.accentDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.sendBtn}>
                        {sendingImage ? <ActivityIndicator size="small" color={C.white} /> : <Text style={s.sendBtnText}>→</Text>}
                      </LinearGradient>
                    </Animated.View>
                  </Pressable>
                </View>
              </View>
            </View>
        </Animated.View>
      </View>

      {/* ── Bottom tab bar ── */}
      <View style={[s.bottomTabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable style={s.bottomTab} onPress={() => setActiveTab('calendar')}>
          <View style={[s.bottomTabDot, activeTab === 'calendar' && s.bottomTabDotActive]} />
          <Text style={[s.bottomTabText, activeTab === 'calendar' && s.bottomTabTextActive]}>Calendrier</Text>
        </Pressable>
        <Pressable style={s.bottomTab} onPress={() => setActiveTab('chat')}>
          <View style={[s.bottomTabDot, activeTab === 'chat' && s.bottomTabDotActive]} />
          <Text style={[s.bottomTabText, activeTab === 'chat' && s.bottomTabTextActive]}>Chat</Text>
        </Pressable>
      </View>

      {/* ── Full screen image viewer ── */}
      <Modal visible={!!viewImageUrl} transparent animationType="fade">
        <View style={s.imageViewerOverlay}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          <Pressable style={s.imageViewerContent} onPress={() => setViewImageUrl(null)}>
            {viewImageUrl && (
              <Image source={{ uri: viewImageUrl }} style={s.imageViewerImage} contentFit="contain" />
            )}
          </Pressable>
          <Pressable style={s.imageViewerClose} onPress={() => setViewImageUrl(null)}>
            <Text style={s.imageViewerCloseText}>Fermer</Text>
          </Pressable>
        </View>
      </Modal>

      {/* ── Day detail modal ── */}
      <Modal visible={dayModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <View>
              <Text style={s.modalTitle}>{formatDate(selectedDate)}</Text>
              <Text style={s.modalSubtitle}>{eventsForSelectedDate.length} evenement{eventsForSelectedDate.length !== 1 ? 's' : ''}</Text>
            </View>
            <Pressable onPress={() => { setDayModalVisible(false); setSelectedEvent(null); }} style={s.modalCloseBtn}>
              <Text style={s.modalCloseText}>x</Text>
            </Pressable>
          </View>

          <ScrollView style={s.modalContent} contentContainerStyle={s.modalScrollContent}>
            {eventsForSelectedDate.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyTitle}>Aucun evenement</Text>
                <Text style={s.emptyText}>Ajoute un evenement pour ce jour</Text>
              </View>
            ) : (
              eventsForSelectedDate.map((event) => (
                <Pressable key={event.id} style={[s.eventCard, selectedEvent?.id === event.id && s.eventCardActive]} onPress={() => handleEventPress(event)}>
                  <View style={[s.eventAccent, { backgroundColor: getMemberColor(event.created_by) }]} />
                  <View style={s.eventBody}>
                    <Text style={s.eventTitle}>{event.title}</Text>
                    <View style={s.eventMeta}>
                      <Text style={s.eventTime}>{formatTime(event.start_time)}{event.end_time && ` - ${formatTime(event.end_time)}`}</Text>
                      {event.location && <Text style={s.eventLocation}>{event.location}</Text>}
                    </View>
                    <View style={s.eventFooter}>
                      <View style={[s.creatorDot, { backgroundColor: getMemberColor(event.created_by) }]} />
                      <Text style={s.eventCreator}>{getMemberName(event.created_by)}</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          {selectedEvent && canEdit && (
            <View style={s.actionBar}>
              <Pressable style={s.actionEdit} onPress={() => { setDayModalVisible(false); router.push(`/group/${id}/edit-event?eventId=${selectedEvent.id}`); }}>
                <Text style={s.actionEditText}>Modifier</Text>
              </Pressable>
              <Pressable style={s.actionDelete} onPress={handleDeleteEvent}>
                <Text style={s.actionDeleteText}>Supprimer</Text>
              </Pressable>
            </View>
          )}

          <Pressable style={{ margin: 20 }} onPress={() => { setDayModalVisible(false); router.push(`/group/${id}/add-event?date=${selectedDate}`); }}>
            <LinearGradient colors={[C.teal, '#00A88A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalAddBtn}>
              <Text style={s.modalAddText}>+ Ajouter un evenement</Text>
            </LinearGradient>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, gap: 14,
  },
  headerBackBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.surfaceLight, justifyContent: 'center', alignItems: 'center',
  },
  headerBackText: { fontSize: 18, color: C.textPrimary, fontWeight: '600' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  headerSubtitle: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  headerActionBtn: {
    paddingHorizontal: 14, height: 34, borderRadius: 17,
    backgroundColor: C.surfaceLight, justifyContent: 'center', alignItems: 'center',
  },
  headerActionText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },

  // ── Members ──
  membersSection: { marginBottom: 16 },
  membersScroll: { paddingHorizontal: 20, gap: 16, paddingVertical: 4 },
  memberChip: { alignItems: 'center', width: 60 },
  memberAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2 },
  memberAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { color: C.white, fontSize: 18, fontWeight: '600' },
  memberName: { fontSize: 11, color: C.textSecondary, marginTop: 6, textAlign: 'center', fontWeight: '500' },

  // ── Calendar ──
  calendarScroll: { paddingTop: 20, paddingBottom: 24 },
  calendarCard: {
    marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 24, padding: 10,
    borderWidth: 1, borderColor: C.border,
  },

  // Phase 5: thinner calendar bars
  dayContainer: { width: 46, minHeight: 72, alignItems: 'center', paddingTop: 8, borderRadius: 12, margin: 1, backgroundColor: C.surfaceLight },
  dayToday: { borderWidth: 1.5, borderColor: C.cyan },
  daySelected: { backgroundColor: C.accent },
  dayText: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  dayTodayText: { color: C.cyan, fontWeight: '800' },
  dayTextSelected: { color: C.white },
  dayDisabled: { color: C.textMuted },
  dayEventsContainer: { flex: 1, width: '100%', paddingTop: 4, gap: 1.5 },
  eventBar: { height: 10, justifyContent: 'center', paddingHorizontal: 2 },
  eventBarStart: { borderTopLeftRadius: 2.5, borderBottomLeftRadius: 2.5, marginLeft: 2 },
  eventBarEnd: { borderTopRightRadius: 2.5, borderBottomRightRadius: 2.5, marginRight: 2 },
  eventBarContinue: { borderRadius: 0 },
  eventBarExtendLeft: { marginLeft: -2, paddingLeft: 0 },
  eventBarExtendRight: { marginRight: -2, paddingRight: 0 },
  eventBarText: { fontSize: 7, fontWeight: '700', color: C.white },
  dayMoreText: { fontSize: 9, color: C.accentLight, textAlign: 'center', fontWeight: '600' },

  addButton: { paddingVertical: 16, borderRadius: 18, alignItems: 'center' },
  addButtonText: { fontSize: 16, fontWeight: '700', color: C.white },

  // ── Chat ──
  chatOverlay: { flex: 1, backgroundColor: C.bg },
  chatOverlayWithBg: { backgroundColor: 'rgba(11,11,26,0.4)' },
  messagesList: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowGrouped: { marginBottom: 3 },
  messageAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  messageAvatarPlaceholder: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  messageAvatarSpacer: { width: 30, marginRight: 10 },
  messageAvatarText: { color: C.white, fontSize: 12, fontWeight: '700' },
  messageBubble: { maxWidth: '80%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 22 },
  messageBubbleMe: { backgroundColor: C.accent, borderBottomRightRadius: 6 },
  messageBubbleOther: { backgroundColor: C.surfaceLight, borderBottomLeftRadius: 6 },
  messageSender: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  messageText: { fontSize: 16, color: C.textPrimary, lineHeight: 23 },
  messageTextMe: { color: C.white },
  messageImage: { width: 230, height: 200, borderRadius: 14, marginBottom: 4 },
  messageTime: { fontSize: 10, color: C.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  messageTimeMe: { color: 'rgba(255,255,255,0.55)' },

  pendingImageBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: C.surfaceLight, borderTopWidth: 1, borderTopColor: C.border,
  },
  pendingImageThumb: { width: 52, height: 52, borderRadius: 12 },
  pendingImageText: { flex: 1, marginLeft: 16, fontSize: 14, color: C.accentLight, fontWeight: '500' },
  pendingImageRemove: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceLighter, justifyContent: 'center', alignItems: 'center' },
  pendingImageRemoveText: { fontSize: 16, color: C.textSecondary, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, gap: 10,
  },
  photoBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceLighter, justifyContent: 'center', alignItems: 'center' },
  photoBtnText: { fontSize: 24, color: C.cyan, fontWeight: '300' },
  chatInput: {
    flex: 1, backgroundColor: C.surfaceLight, borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 14, fontSize: 16,
    color: C.textPrimary, maxHeight: 100,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { fontSize: 18, color: C.white, fontWeight: '700' },

  // ── Bottom tab bar ──
  bottomTabBar: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10,
  },
  bottomTab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  bottomTabDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'transparent', marginBottom: 6 },
  bottomTabDotActive: { backgroundColor: C.accent },
  bottomTabText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  bottomTabTextActive: { color: C.accentLight },

  // ── Image viewer ──
  imageViewerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageViewerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  imageViewerImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.75 },
  imageViewerClose: {
    position: 'absolute', bottom: 60,
    paddingHorizontal: 32, paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  imageViewerCloseText: { color: C.white, fontSize: 16, fontWeight: '600' },

  // ── Day modal ──
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, paddingVertical: 20, backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary, textTransform: 'capitalize' },
  modalSubtitle: { fontSize: 14, color: C.textSecondary, marginTop: 4 },
  modalCloseBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 16, color: C.textSecondary, fontWeight: '600' },
  modalContent: { flex: 1 },
  modalScrollContent: { padding: 24 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: C.textSecondary },
  emptyText: { fontSize: 14, color: C.textMuted, marginTop: 8 },

  eventCard: {
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: 18,
    marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.border,
  },
  eventCardActive: { borderColor: C.accent, borderWidth: 2 },
  eventAccent: { width: 5 },
  eventBody: { flex: 1, padding: 18 },
  eventTitle: { fontSize: 17, fontWeight: '600', color: C.textPrimary },
  eventMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  eventTime: { fontSize: 14, color: C.cyan, fontWeight: '500' },
  eventLocation: { fontSize: 14, color: C.textSecondary },
  eventFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  creatorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  eventCreator: { fontSize: 14, color: C.textSecondary, fontWeight: '500' },

  actionBar: {
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14, gap: 12,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
  },
  actionEdit: { flex: 1, backgroundColor: C.accent, paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  actionEditText: { color: C.white, fontWeight: '600', fontSize: 15 },
  actionDelete: { flex: 1, backgroundColor: 'rgba(255,90,90,0.15)', paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  actionDeleteText: { color: C.red, fontWeight: '600', fontSize: 15 },

  modalAddBtn: { paddingVertical: 17, borderRadius: 18, alignItems: 'center' },
  modalAddText: { color: C.white, fontSize: 16, fontWeight: '700' },
});
