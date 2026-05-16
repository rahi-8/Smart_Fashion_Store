// app/(auth)/register.tsx - সম্পূর্ণ ফিক্স করা OTP Version
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite/config';

// ✅ সরাসরি API URL ফাংশন (ডুপ্লিকেট করা হয়েছে)
const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }
  // আপনার কম্পিউটারের সঠিক IP (ipconfig দেখে নিন)
  return 'http://192.168.0.105:3000';
};

// ─── Password strength scoring ────────────────────────────────────────────────
type StrengthLevel = 'Weak' | 'Fair' | 'Good' | 'Strong';

const getStrengthLevel = (checks: Record<string, boolean>): StrengthLevel => {
  const count = Object.values(checks).filter(Boolean).length;
  if (count <= 1) return 'Weak';
  if (count === 2) return 'Fair';
  if (count === 3) return 'Good';
  return 'Strong';
};

const strengthConfig: Record<StrengthLevel, { color: string; width: string }> = {
  Weak:   { color: '#F44336', width: '25%' },
  Fair:   { color: '#FF9800', width: '50%' },
  Good:   { color: '#FFC107', width: '75%' },
  Strong: { color: '#4CAF50', width: '100%' },
};

// ─── Shake animation hook ─────────────────────────────────────────────────────
const useShake = () => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true, easing: Easing.linear }),
    ]).start();
  };
  return { shakeAnim, shake };
};

// ─── Step progress indicator ──────────────────────────────────────────────────
const StepProgress = ({ step, total }: { step: number; total: number }) => (
  <View style={stepStyles.row}>
    {Array.from({ length: total }).map((_, i) => (
      <View key={i} style={[stepStyles.dot, i < step && stepStyles.dotActive]} />
    ))}
  </View>
);

const stepStyles = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 8, marginBottom: 28 },
  dot:       { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(25, 105, 157, 0.2)' },
  dotActive: { backgroundColor: '#19699d' },
});

export default function Register() {
  const router = useRouter();

  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone,           setPhone]           = useState('');

  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading,      setLoading]      = useState(false);
  const [agreeTerms,   setAgreeTerms]   = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [fieldErrors,  setFieldErrors]  = useState<Record<string, string>>({});

  const [passwordChecks, setPasswordChecks] = useState({
    minLength: false, hasUppercase: false, hasLowercase: false, hasNumber: false,
  });

  const filledCount =
    (name.trim().length >= 2 ? 1 : 0) +
    (validateEmailStr(email) ? 1 : 0) +
    (isPasswordStrong() ? 1 : 0) +
    (confirmPassword === password && confirmPassword.length > 0 ? 1 : 0);

  const emailRef   = useRef<TextInput>(null);
  const phoneRef   = useRef<TextInput>(null);
  const passRef    = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const scrollRef  = useRef<ScrollView>(null);
  const { shakeAnim, shake } = useShake();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function validateEmailStr(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  const validatePassword = (pass: string) => {
    setPasswordChecks({
      minLength:    pass.length >= 8,
      hasUppercase: /[A-Z]/.test(pass),
      hasLowercase: /[a-z]/.test(pass),
      hasNumber:    /[0-9]/.test(pass),
    });
  };

  function isPasswordStrong() {
    return passwordChecks.minLength && passwordChecks.hasUppercase &&
           passwordChecks.hasLowercase && passwordChecks.hasNumber;
  }

  const clearError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ─── Check if email already exists ─────────────────────────────────────────
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS,
        [Query.equal('email', email.toLowerCase())]
      );
      return result.total > 0;
    } catch (error) {
      console.log('Email check error:', error);
      return false;
    }
  };

  // ─── Send OTP Handler ─────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    handleHaptic();
    
    const cleanName  = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const errors: Record<string, string> = {};

    if (!cleanName || cleanName.length < 2) errors.name = 'Enter at least 2 characters';
    if (!cleanEmail) errors.email = 'Email is required';
    else if (!validateEmailStr(cleanEmail)) errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    else if (!isPasswordStrong()) errors.password = 'Password is too weak';
    if (password !== confirmPassword) errors.confirm = 'Passwords do not match';
    if (!agreeTerms) errors.terms = 'You must accept Terms & Conditions';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      shake();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setLoading(true);
    setFieldErrors({});

    try {
      // Check if email already exists
      const emailExists = await checkEmailExists(cleanEmail);
      if (emailExists) {
        Alert.alert(
          'Email Already Registered',
          'This email is already linked to an existing account.\n\nPlease login instead.',
          [
            { text: 'Go to Login', onPress: () => router.replace('/(auth)/login') },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        setLoading(false);
        return;
      }

      // Send OTP via backend
      const apiUrl = getApiUrl();
      console.log('📤 Sending OTP to:', cleanEmail);
      console.log('🌐 API URL:', apiUrl);

      const response = await fetch(`${apiUrl}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: cleanName,
        }),
      });

      const data = await response.json();
      console.log('📩 Send OTP Response:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to OTP verification page with user data
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          name: cleanName,
          email: cleanEmail,
          password: password,
          phone: phone || '',
        },
      });

    } catch (err: any) {
      console.log('❌ Send OTP Error:', err?.message);
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      if (err?.message?.includes('Network') || err?.message?.includes('fetch')) {
        errorMessage = `Network error. Make sure backend server is running at ${getApiUrl()}`;
      } else if (err?.message?.includes('Failed to send OTP email')) {
        errorMessage = 'Email configuration error. Please check Gmail settings.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const FieldError = ({ field }: { field: string }) =>
    fieldErrors[field] ? (
      <Animated.View style={[styles.fieldErrorRow, { transform: [{ translateX: shakeAnim }] }]}>
        <Ionicons name="alert-circle" size={14} color="#FF5252" />
        <Text style={styles.fieldErrorText}>{fieldErrors[field]}</Text>
      </Animated.View>
    ) : null;

  const strengthLevel = getStrengthLevel(passwordChecks);
  const strengthStyle = strengthConfig[strengthLevel];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient
          colors={['#19699d', '#0e4d73', '#0a3550']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <BlurView intensity={30} tint="light" style={styles.headerBlur}>
            <Text style={styles.headerTitle}>Create Account</Text>
          </BlurView>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {/* Form */}
        <Animated.View style={[styles.form, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.welcomeSection}>
            <Text style={styles.title}>Join Smart Fashion</Text>
            <Text style={styles.subtitle}>Create your account to start shopping</Text>
          </View>

          <StepProgress step={filledCount} total={4} />

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <BlurView intensity={15} tint="light" style={[styles.inputBlur, focusedInput === 'name' && styles.inputBlurFocused]}>
            <View style={[styles.inputWrapper, fieldErrors.name && styles.inputWrapperError]}>
              <Ionicons name="person-outline" size={20} color="#19699d" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={(t) => { setName(t); clearError('name'); }}
                onFocus={() => { setFocusedInput('name'); handleHaptic(); }}
                onBlur={() => setFocusedInput(null)}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </BlurView>
          <FieldError field="name" />

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <BlurView intensity={15} tint="light" style={[styles.inputBlur, focusedInput === 'email' && styles.inputBlurFocused]}>
            <View style={[styles.inputWrapper, fieldErrors.email && styles.inputWrapperError]}>
              <Ionicons name="mail-outline" size={20} color="#19699d" style={styles.inputIcon} />
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={(t) => { setEmail(t); clearError('email'); }}
                onFocus={() => { setFocusedInput('email'); handleHaptic(); }}
                onBlur={() => setFocusedInput(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
            </View>
          </BlurView>
          <FieldError field="email" />

          {/* Phone */}
          <Text style={styles.label}>Phone Number <Text style={styles.optional}>(optional)</Text></Text>
          <BlurView intensity={15} tint="light" style={[styles.inputBlur, focusedInput === 'phone' && styles.inputBlurFocused]}>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#19699d" style={styles.inputIcon} />
              <TextInput
                ref={phoneRef}
                style={styles.input}
                placeholder="+880 1XXX-XXXXXX"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                onFocus={() => { setFocusedInput('phone'); handleHaptic(); }}
                onBlur={() => setFocusedInput(null)}
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => passRef.current?.focus()}
              />
            </View>
          </BlurView>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <BlurView intensity={15} tint="light" style={[styles.inputBlur, focusedInput === 'password' && styles.inputBlurFocused]}>
            <View style={[styles.inputWrapper, fieldErrors.password && styles.inputWrapperError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#19699d" style={styles.inputIcon} />
              <TextInput
                ref={passRef}
                style={styles.input}
                placeholder="Min 8 chars, A-Z, 0-9"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  validatePassword(text);
                  clearError('password');
                }}
                onFocus={() => { setFocusedInput('password'); handleHaptic(); }}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </BlurView>
          <FieldError field="password" />

          {/* Strength bar */}
          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthSegments}>
                {(['Weak', 'Fair', 'Good', 'Strong'] as StrengthLevel[]).map((lvl) => {
                  const levels = ['Weak', 'Fair', 'Good', 'Strong'];
                  const filled = levels.indexOf(strengthLevel) >= levels.indexOf(lvl);
                  return (
                    <View
                      key={lvl}
                      style={[styles.segment, filled && { backgroundColor: strengthStyle.color }]}
                    />
                  );
                })}
              </View>
              <Text style={[styles.strengthLabel, { color: strengthStyle.color }]}>
                {strengthLevel} Password
              </Text>
            </View>
          )}

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <BlurView intensity={15} tint="light" style={[styles.inputBlur, focusedInput === 'confirm' && styles.inputBlurFocused]}>
            <View style={[styles.inputWrapper, (confirmPassword.length > 0 && password !== confirmPassword) && styles.inputWrapperError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#19699d" style={styles.inputIcon} />
              <TextInput
                ref={confirmRef}
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor="#999"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); clearError('confirm'); }}
                onFocus={() => { setFocusedInput('confirm'); handleHaptic(); }}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </BlurView>
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <Text style={styles.errorText}>✗ Passwords do not match</Text>
          )}
          <FieldError field="confirm" />

          {/* Terms */}
          <TouchableOpacity
            onPress={() => { setAgreeTerms(!agreeTerms); clearError('terms'); handleHaptic(); }}
            style={[styles.termsContainer, fieldErrors.terms && styles.termsError]}
          >
            <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
              {agreeTerms && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink}>Terms & Conditions</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
          <FieldError field="terms" />

          {/* Submit Button */}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <TouchableOpacity
              onPress={handleSendOTP}
              disabled={loading}
              style={[styles.button, loading && styles.buttonDisabled]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#b0c8db', '#b0c8db'] : ['#19699d', '#0e4d73']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <View style={styles.btnRow}>
                    <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>Sending OTP...</Text>
                  </View>
                ) : (
                  <View style={styles.btnRow}>
                    <Ionicons name="mail-open-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>Send OTP & Continue</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <BlurView intensity={20} tint="light" style={styles.dividerBlur}>
              <Text style={styles.dividerText}>OR</Text>
            </BlurView>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In */}
          <TouchableOpacity
            style={styles.googleBtn}
            activeOpacity={0.8}
            onPress={() => Alert.alert('Coming Soon', 'Google Sign-In will be available soon!')}
          >
            <Ionicons name="logo-google" size={20} color="#DB4437" style={{ marginRight: 10 }} />
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Login link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign In →</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  scrollContent: { flexGrow: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerBlur: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 25,
    overflow: 'hidden',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  form: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginTop: -20,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 8,
  },
  welcomeSection: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#888', lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginLeft: 4 },
  optional: { fontWeight: '400', color: '#aaa' },
  inputBlur: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(25,105,157,0.1)',
  },
  inputBlurFocused: {
    borderWidth: 1.5,
    borderColor: '#19699d',
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#19699d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  inputWrapperError: { borderColor: '#FF5252' },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 15,
    color: '#1a1a1a',
  },
  eyeIcon: { padding: 8 },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 8,
  },
  fieldErrorText: { color: '#FF5252', fontSize: 12, marginLeft: 6 },
  strengthContainer: { marginBottom: 16, marginTop: 4 },
  strengthSegments: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#e0e0e0' },
  strengthLabel: { fontSize: 11, fontWeight: '600' },
  errorText: { color: '#FF5252', fontSize: 12, marginBottom: 12, marginLeft: 8 },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 8,
  },
  termsError: {
    backgroundColor: 'rgba(255,82,82,0.08)',
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#19699d',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: { backgroundColor: '#19699d' },
  termsText: { flex: 1, fontSize: 12, color: '#666', lineHeight: 18 },
  termsLink: { color: '#19699d', fontWeight: '600' },
  button: {
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#19699d',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  buttonGradient: { paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e8e8e8' },
  dividerBlur: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  dividerText: { color: '#aaa', fontSize: 12, fontWeight: '500' },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 24,
    backgroundColor: '#fff',
  },
  googleText: { fontSize: 15, fontWeight: '600', color: '#333' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: 14, color: '#666' },
  loginLink: { fontSize: 14, color: '#19699d', fontWeight: 'bold' },
});