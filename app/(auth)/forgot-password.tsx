// app/(auth)/forgot-password.tsx - Optimized Version
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
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// API URL for backend
const getApiUrl = () => {
  // Web platform
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }
  
  // আপনার কম্পিউটারের সঠিক IP (ipconfig থেকে পাওয়া)
  const YOUR_COMPUTER_IP = '192.168.0.105';
  const PORT = 3000;
  
  // Physical device বা Android emulator
  return `http://${YOUR_COMPUTER_IP}:${PORT}`;
};

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(false);
  const [emailError, setEmailError] = useState('');
  
  const emailInputRef = useRef<TextInput>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSendOTP = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setEmailError('Please enter your email address');
      handleHaptic();
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setEmailError('Please enter a valid email address');
      handleHaptic();
      return;
    }

    setEmailError('');
    setLoading(true);
    handleHaptic();

    try {
      const apiUrl = getApiUrl();
      console.log('🔁 Sending reset OTP to:', cleanEmail);
      console.log('🌐 Using API URL:', apiUrl);

      const res = await fetch(`${apiUrl}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: cleanEmail, 
          name: 'User',
          mode: 'reset'
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to send OTP');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        '✅ OTP Sent!',
        `A verification code has been sent to ${cleanEmail}. It will expire in 10 minutes.`,
        [{ text: 'OK' }]
      );
      
      // Navigate to OTP verification for password reset
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          email: cleanEmail,
          name: 'User',
          password: '',
          mode: 'reset'
        },
      });

    } catch (err: any) {
      console.error('Send OTP error:', err);
      
      let errorMessage = err.message || 'Something went wrong';
      let errorTitle = 'Error';
      
      if (errorMessage.includes('Network request failed')) {
        errorTitle = 'Network Error';
        errorMessage = 'Cannot connect to server.\n\nMake sure backend server is running on port 3000';
      } else if (errorMessage.includes('Failed to send OTP email')) {
        errorTitle = 'Email Error';
        errorMessage = 'Email configuration issue.\n\nPlease check your email service settings.';
      } else if (errorMessage.includes('Email not found') || errorMessage.includes('not registered')) {
        errorTitle = 'Email Not Found';
        errorMessage = 'This email is not registered.\n\nPlease check your email or create an account.';
      }
      
      Alert.alert(errorTitle, errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#f0f7fc', '#e8f0f7']}
              style={styles.iconGradient}
            >
              <Ionicons name="lock-closed-outline" size={70} color="#19699d" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a verification code to reset your password.
          </Text>

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#19699d" style={styles.inputIcon} />
            <TextInput
              ref={emailInputRef}
              style={[styles.input, focusedInput && styles.inputFocused, emailError && styles.inputError]}
              placeholder="Email Address"
              placeholderTextColor="#999"
              value={email}
              onChangeText={handleEmailChange}
              onFocus={() => {
                setFocusedInput(true);
                handleHaptic();
              }}
              onBlur={() => setFocusedInput(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleSendOTP}
            />
          </View>

          {/* Error Message */}
          {emailError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color="#FF5252" />
              <Text style={styles.errorText}>{emailError}</Text>
            </View>
          ) : null}

          {/* Info Message */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#19699d" />
            <Text style={styles.infoText}>
              We'll send a 6-digit OTP to your email. Valid for 10 minutes.
            </Text>
          </View>

          {/* Send Button */}
          <TouchableOpacity 
            style={[styles.sendButton, loading && styles.buttonDisabled]}
            onPress={handleSendOTP}
            disabled={loading}
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
                  <Text style={styles.sendButtonText}>Sending OTP...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Ionicons name="mail-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.sendButtonText}>Send Verification Code</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity 
            style={styles.backToLogin}
            onPress={() => router.replace('/(auth)/login')}
            disabled={loading}
          >
            <Ionicons name="arrow-back-outline" size={16} color="#19699d" />
            <Text style={styles.backToLoginText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: -20,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  iconContainer: {
    marginTop: 30,
    marginBottom: 20,
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#19699d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
    width: '100%',
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  inputFocused: {
    borderColor: '#19699d',
  },
  inputError: {
    borderColor: '#FF5252',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 12,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7fc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
    gap: 8,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#19699d',
    lineHeight: 16,
  },
  sendButton: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#19699d',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backToLogin: {
    marginTop: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backToLoginText: {
    color: '#19699d',
    fontSize: 14,
    fontWeight: '500',
  },
});