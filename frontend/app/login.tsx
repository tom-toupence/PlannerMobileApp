import { View, Text, StyleSheet, Pressable, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

WebBrowser.maybeCompleteAuthSession();

const C = {
  bg: '#0B0B1A',
  surface: '#151528',
  surfaceLight: '#1E1E36',
  accent: '#7C5CFC',
  accentDark: '#5531D9',
  accentLight: '#9F85FF',
  cyan: '#00D4FF',
  textPrimary: '#EEEEF6',
  textSecondary: '#8B8CA7',
  textMuted: '#5A5B75',
  border: '#252540',
  white: '#FFFFFF',
};

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

export default function LoginScreen() {
  const router = useRouter();
  const redirectUrl = AuthSession.makeRedirectUri();

  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl } });
      if (error) { Alert.alert('Erreur OAuth', error.message); return; }
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success' && result.url) {
          const hashParams = result.url.split('#')[1];
          if (hashParams) {
            const params = new URLSearchParams(hashParams);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            if (accessToken && refreshToken) {
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              if (sessionError) Alert.alert('Erreur Session', sessionError.message);
              else if (sessionData.user) {
                const meta = sessionData.user.user_metadata;
                // Fire and forgets
                api.createProfileIfNeeded(
                  meta?.full_name || meta?.name || null,
                  meta?.avatar_url || meta?.picture || null,
                ).catch(() => {});
                router.replace('/(tabs)');
              }
            }
          }
        }
      }
    } catch (e: any) { Alert.alert('Exception', e.message); }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <LinearGradient colors={[C.accent, C.accentDark]} style={s.logoContainer}>
          <Text style={s.logo}>P</Text>
        </LinearGradient>

        <Text style={s.title}>PlannerApp</Text>
        <Text style={s.subtitle}>Planifie des evenements avec tes amis en toute simplicite</Text>

        <View style={s.features}>
          <View style={s.feature}>
            <View style={s.featureDot} />
            <Text style={s.featureText}>Groupes d'amis</Text>
          </View>
          <View style={s.feature}>
            <View style={[s.featureDot, { backgroundColor: C.cyan }]} />
            <Text style={s.featureText}>Calendrier partage</Text>
          </View>
          <View style={s.feature}>
            <View style={[s.featureDot, { backgroundColor: '#00C9A7' }]} />
            <Text style={s.featureText}>Chat et photos</Text>
          </View>
        </View>
      </View>

      <View style={s.footer}>
        <AnimatedPressable style={s.googleButton} onPress={handleGoogleLogin}>
          <Text style={s.googleIcon}>G</Text>
          <Text style={s.googleButtonText}>Continuer avec Google</Text>
        </AnimatedPressable>

        <Text style={s.terms}>En continuant, tu acceptes nos conditions d'utilisation</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  logoContainer: {
    width: 100, height: 100, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center', marginBottom: 28,
    shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  logo: { fontSize: 48, color: C.white, fontWeight: '800' },

  title: { fontSize: 32, fontWeight: '700', color: C.textPrimary, marginBottom: 12 },
  subtitle: { fontSize: 16, color: C.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 40 },

  features: { gap: 14 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  featureText: { fontSize: 15, color: C.textSecondary, fontWeight: '500' },

  footer: { paddingHorizontal: 24, paddingBottom: 28 },
  googleButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.white, paddingVertical: 18, borderRadius: 18, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  googleIcon: { fontSize: 20, fontWeight: '700', color: '#4285F4' },
  googleButtonText: { color: '#1F2937', fontSize: 17, fontWeight: '600' },
  terms: { fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 16 },
});
