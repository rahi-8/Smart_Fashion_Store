// app/(auth)/verify-otp.tsx 
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  AppState,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import {
  account,
  ID,
  databases,
  DATABASE_ID,
  COLLECTIONS,
} from '../../appwrite/config';

//  Constants 
const OTP_EXPIRE_SECONDS = 120;


const getApiUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }
  

  const YOUR_COMPUTER_IP = '192.168.0.101'; // ← change this line
  
  if (Platform.OS === 'android') {
    // Physical device এর জন্য
    return `http://${YOUR_COMPUTER_IP}:3000`;
  }
  
  
  // iOS platform
  return 'http://localhost:3000';
};

// ✅ Server connection check function
const checkServerConnection = async (apiUrl: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${apiUrl}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server connected:', data);
      return true;
    }
    return false;
  } catch (error) {
    console.log('❌ Server connection failed:', error);
    return false;
  }
};

export default function VerifyOTP() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<'register' | 'reset'>('register');
  const [apiUrl, setApiUrl] = useState('');
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'failed'>('checking');

  const [countdown, setCountdown] = useState(OTP_EXPIRE_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const emailParam = params.email as string;
    const nameParam = params.name as string;
    const passwordParam = params.password as string;
    const phoneParam = params.phone as string;
    const modeParam = params.mode as string || 'register';

    if (!emailParam) {
      Alert.alert('Error', 'Missing email data', [
        { text: 'Go Back', onPress: () => router.replace(modeParam === 'reset' ? '/(auth)/forgot-password' : '/(auth)/register') },
      ]);
      return;
    }

    setEmail(emailParam);
    setName(nameParam || '');
    setPassword(passwordParam || '');
    setPhone(phoneParam || '');
    setMode(modeParam as 'register' | 'reset');

    // Initialize API URL and check server
    const url = getApiUrl();
    setApiUrl(url);
    checkServer(url);

    console.log('✅ OTP Page Init:', { email: emailParam, mode: modeParam, apiUrl: url });

    setTimeout(() => inputRefs.current[0]?.focus(), 400);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    startGlowAnimation();
    startCountdown();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const checkServer = async (url: string) => {
    const isConnected = await checkServerConnection(url);
    setServerStatus(isConnected ? 'connected' : 'failed');
    if (!isConnected) {
      Alert.alert(
        '⚠️ Server Not Reachable',
        `Cannot connect to backend server at ${url}\n\nMake sure:\n1. Backend server is running (node server.js)\n2. Your computer IP is correct\n3. Both devices on same WiFi`,
        [{ text: 'Retry', onPress: () => checkServer(url) }]
      );
    }
  };

  const startGlowAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  };

  const startCountdown = () => {
    setCountdown(OTP_EXPIRE_SECONDS);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const shake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true, easing: Easing.linear }),
    ]).start();
  };

  const playSuccess = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSuccess(true);
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }).start();
  };

  const playHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleOtpChange = (text: string, index: number) => {
    if (!/^\d*$/.test(text)) return;
    playHaptic();
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError('');
    if (text && index < 5) inputRefs.current[index + 1]?.focus();
    if (!text && index > 0) inputRefs.current[index - 1]?.focus();
    const fullCode = newOtp.join('');
    if (fullCode.length === 6 && newOtp.every(d => d !== '')) {
      setTimeout(() => submitOTP(fullCode), 300);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setOtp(['', '', '', '', '', '']);
    setError('');
    
    try {
      console.log('📤 Resending OTP to:', email);
      console.log('🌐 API URL:', apiUrl);
      
      const response = await fetch(`${apiUrl}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || 'User', mode }),
      });
      
      const data = await response.json();
      console.log('📩 Resend Response:', data);
      
      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Failed to resend OTP');
      }
      
      startCountdown();
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
      Alert.alert('OTP Sent ✅', `A new OTP has been sent to ${email}`);
      
    } catch (err: any) {
      console.error('Resend error:', err);
      Alert.alert('Error', err?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // ✅ Main submit function
  const submitOTP = async (code: string) => {
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      console.log('📤 Verifying OTP:', code, 'for:', email, 'Mode:', mode);
      console.log('🌐 API URL:', apiUrl);

      const res = await fetch(`${apiUrl}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });

      const data = await res.json();
      console.log('📩 OTP Verify Response:', data);

      const isVerified = data?.success === true || data?.verified === true;
      
      if (!isVerified) {
        setError(data?.error || 'Invalid OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
        shake();
        setTimeout(() => inputRefs.current[0]?.focus(), 200);
        setLoading(false);
        return;
      }

      console.log('✅ OTP Verified! Mode:', mode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      //  PASSWORD RESET FLOW 
      if (mode === 'reset') {
        if (timerRef.current) clearInterval(timerRef.current);
        playSuccess();

        setTimeout(() => {
          router.push({
            pathname: '/(auth)/reset-password',
            params: {
              email: email,
              verified: 'true'
            }
          });
        }, 500);
        setLoading(false);
        return;
      }

      //  REGISTRATION FLOW 
      if (!password) {
        throw new Error('Password is required for registration');
      }

      let newUser;
      try {
        console.log('👤 Creating Appwrite account...');
        newUser = await account.create(ID.unique(), email, password, name);
        console.log('✅ Appwrite account created:', newUser.$id);
      } catch (err: any) {
        if (err?.code === 409) {
          playSuccess();
          setTimeout(() => {
            Alert.alert(
              'Account Already Exists',
              'This email is already registered. Please login.',
              [{ text: 'Go to Login', style: 'default', onPress: () => router.replace('/(auth)/login') }]
            );
          }, 400);
          setLoading(false);
          return;
        }
        throw err;
      }

      // Save user to database
      try {
        console.log('💾 Saving user to database...');
        await databases.createDocument(DATABASE_ID, COLLECTIONS.USERS, ID.unique(), {
          userId: newUser.$id,
          name: name,
          email: email,
          phone: phone || '',
          role: 'user',
          isActive: true,
          createdAt: new Date().toISOString(),
        });
        console.log('✅ User saved to DB!');
      } catch (dbErr: any) {
        console.log('⚠️ DB Save Error:', dbErr?.message);
      }

      if (timerRef.current) clearInterval(timerRef.current);
      playSuccess();

      setTimeout(() => {
        Alert.alert(
          '🎉 Registration Successful!',
          'Your account has been created. Please login to continue.',
          [{ text: 'Go to Login', onPress: () => router.replace('/(auth)/login') }]
        );
      }, 800);

    } catch (err: any) {
      console.error('❌ Verification Error:', err?.message || err);
      Alert.alert('Error', err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits');
      shake();
      return;
    }
    submitOTP(code);
  };

  // Server checking state
  if (serverStatus === 'checking') {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#19699d" />
        <Text style={styles.loadingText}>Connecting to server...</Text>
      </View>
    );
  }

  if (serverStatus === 'failed') {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Ionicons name="wifi-outline" size={60} color="#FF5252" />
        <Text style={styles.errorTitle}>Server Not Reachable</Text>
        <Text style={styles.loadingText}>{apiUrl}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setServerStatus('checking');
            checkServer(apiUrl);
          }}
        >
          <Text style={styles.retryText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!email) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#19699d" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? -200 : 0}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header with Glassmorphism */}
        <LinearGradient
          colors={['#19699d', '#0e4d73', '#0a3550']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.iconCircle,
              {
                shadowOpacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                }),
                shadowRadius: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 20],
                }),
              },
            ]}
          >
            <BlurView intensity={80} tint="light" style={styles.blurIcon}>
              <Ionicons name="mail-open-outline" size={40} color="#fff" />
            </BlurView>
          </Animated.View>

          <Text style={styles.headerText}>Check Your Email</Text>
          <Text style={styles.headerSub}>
            {mode === 'reset' ? 'We sent a verification code to' : 'We sent a 6-digit code to'}
          </Text>
          <BlurView intensity={40} tint="dark" style={styles.emailBlur}>
            <Text style={styles.headerEmail}>{email}</Text>
          </BlurView>
        </LinearGradient>

        <Animated.View style={[styles.body, { opacity: fadeAnim }]}>
          {/* Success banner */}
          {success && (
            <Animated.View style={[styles.successBanner, { transform: [{ scale: scaleAnim }] }]}>
              <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              <Text style={styles.successText}>
                {mode === 'reset' ? 'Verified! 🔓' : 'Account Created! 🎉'}
              </Text>
            </Animated.View>
          )}

          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.hint}>
            Code expires in{' '}
            <Text style={[styles.timer, countdown <= 30 && styles.timerRed]}>
              {formatTime(countdown)}
            </Text>
          </Text>

          {/* OTP Boxes */}
          <Animated.View style={[styles.row, { transform: [{ translateX: shakeAnim }] }]}>
            {otp.map((d, i) => (
              <BlurView key={i} intensity={20} tint="light" style={styles.boxBlur}>
                <TextInput
                  ref={(ref) => {
                    inputRefs.current[i] = ref;
                  }}
                  style={[
                    styles.box,
                    d && styles.boxFilled,
                    error && styles.boxError,
                    success && styles.boxSuccess,
                  ]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={d}
                  editable={!loading && !success}
                  onChangeText={(t) => handleOtpChange(t, i)}
                  selectionColor="#19699d"
                />
              </BlurView>
            ))}
          </Animated.View>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color="#FF5252" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.btn, (loading || success) && styles.btnDisabled]}
            onPress={handleVerifyOTP}
            disabled={loading || success}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={loading || success ? ['#b0c8db', '#b0c8db'] : ['#19699d', '#0e4d73']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              {loading ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnText}>Verifying...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnText}>
                    {mode === 'reset' ? 'Verify & Reset Password' : 'Verify & Create Account'}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Resend OTP */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendLabel}>Didn't receive the code? </Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                {resending ? (
                  <ActivityIndicator size="small" color="#19699d" />
                ) : (
                  <Text style={styles.resendLink}>Resend OTP</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendDisabled}>Resend in {formatTime(countdown)}</Text>
            )}
          </View>

          {/* Info card */}
          <BlurView intensity={15} tint="light" style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color="#19699d" />
            <Text style={styles.infoText}>
              Check your spam folder if you don't see the email. The OTP is valid for 2 minutes.
            </Text>
          </BlurView>

          {/* Back to Login Button */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backToLoginBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back-circle-outline" size={22} color="#19699d" style={{ marginRight: 8 }} />
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 16, color: '#666', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  errorTitle: { marginTop: 16, fontSize: 18, fontWeight: 'bold', color: '#FF5252' },
  retryButton: { marginTop: 20, backgroundColor: '#19699d', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
    position: 'relative',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerBack: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 48,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#19699d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  blurIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  emailBlur: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    overflow: 'hidden',
  },
  headerText: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  headerEmail: { color: '#fff', fontSize: 14, fontWeight: '700' },

  body: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: -25,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 28,
    paddingBottom: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fff4',
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 24,
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  successText: { color: '#4CAF50', fontWeight: '700', fontSize: 16 },

  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8, marginTop: 10 },
  hint: { fontSize: 13, color: '#888', marginBottom: 28 },
  timer: { fontWeight: '700', color: '#19699d', fontSize: 14 },
  timerRed: { color: '#FF5252' },

  row: { flexDirection: 'row', gap: 12, marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' },
  boxBlur: { borderRadius: 14, overflow: 'hidden' },
  box: {
    width: 50,
    height: 60,
    borderWidth: 1.5,
    borderColor: '#ddd',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    borderRadius: 14,
    color: '#1a1a1a',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  boxFilled: { borderColor: '#19699d', backgroundColor: '#eef4f9', color: '#19699d' },
  boxError: { borderColor: '#FF5252', backgroundColor: '#fff5f5' },
  boxSuccess: { borderColor: '#4CAF50', backgroundColor: '#f0fff4' },

  errorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  errorText: { color: '#FF5252', fontSize: 13 },

  btn: {
    marginTop: 20,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#19699d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnGradient: { paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  resendContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' },
  resendLabel: { fontSize: 13, color: '#888' },
  resendLink: { fontSize: 13, color: '#19699d', fontWeight: '700' },
  resendDisabled: { fontSize: 13, color: '#aaa' },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    width: '100%',
    marginBottom: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(25, 105, 157, 0.08)',
  },
  infoText: { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },

  backToLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#19699d',
    backgroundColor: 'rgba(25, 105, 157, 0.05)',
  },
  backToLoginText: { fontSize: 15, fontWeight: '700', color: '#19699d' },
});