// app/(auth)/reset-password.tsx - সম্পূর্ণ ফিক্সড ও আপডেটেড ভার্সন
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
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { account } from '../../appwrite/config';

// API URL for backend (সব জায়গায় consistent)
const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }
  // আপনার কম্পিউটারের সঠিক IP (ipconfig থেকে পাওয়া)
  return 'http://192.168.0.105:3000';
};

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [secret, setSecret] = useState('');
  const [email, setEmail] = useState('');
  const [resetMethod, setResetMethod] = useState<'recovery' | 'otp'>('otp');

  const [passwordChecks, setPasswordChecks] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
  });

  useEffect(() => {
    // URL থেকে parameters পাওয়া
    const userIdParam = params.userId as string;
    const secretParam = params.secret as string;
    const emailParam = params.email as string;
    const verified = params.verified as string;
    
    console.log('🔍 ResetPassword - URL Params:', { 
      userId: userIdParam?.substring(0, 20), 
      secret: secretParam?.substring(0, 20),
      email: emailParam,
      verified: verified
    });
    
    if (userIdParam && secretParam) {
      // Recovery link থেকে আসা (Appwrite Recovery)
      setResetMethod('recovery');
      setUserId(userIdParam);
      setSecret(secretParam);
      console.log('✅ Using Recovery Method');
    } else if (emailParam && verified === 'true') {
      // OTP পদ্ধতি থেকে আসা
      setResetMethod('otp');
      setEmail(emailParam);
      console.log('✅ Using OTP Method, Email:', emailParam);
    } else {
      // Invalid request
      Alert.alert(
        'Invalid Request', 
        'Please go through the forgot password process again.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/forgot-password') }]
      );
    }
  }, []);

  const validatePassword = (pass: string) => {
    setPasswordChecks({
      minLength: pass.length >= 8,
      hasUppercase: /[A-Z]/.test(pass),
      hasLowercase: /[a-z]/.test(pass),
      hasNumber: /[0-9]/.test(pass),
    });
  };

  const isPasswordStrong = () => {
    return passwordChecks.minLength && 
           passwordChecks.hasUppercase && 
           passwordChecks.hasLowercase && 
           passwordChecks.hasNumber;
  };

  // ✅ Method 1: Appwrite Recovery Link Method
  const resetWithRecovery = async () => {
    console.log('🔄 Resetting password via Recovery Method...');
    await account.updateRecovery(userId, secret, newPassword);
    console.log('✅ Password updated via Recovery!');
  };

  // ✅ Method 2: OTP Method (Backend API Call)
  const resetWithOTP = async () => {
    console.log('🔄 Resetting password via OTP Method...');
    console.log('📧 Email:', email);
    console.log('🔑 New Password:', '********');
    
    const apiUrl = getApiUrl();
    console.log('🌐 API URL:', apiUrl);
    
    const response = await fetch(`${apiUrl}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        newPassword: newPassword,
      }),
    });
    
    const data = await response.json();
    console.log('📩 Reset Password Response:', data);
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to reset password');
    }
    
    console.log('✅ Password updated via OTP!');
    return data;
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (!isPasswordStrong()) {
      let errorMsg = 'Please use a stronger password:\n';
      if (!passwordChecks.minLength) errorMsg += '• At least 8 characters\n';
      if (!passwordChecks.hasUppercase) errorMsg += '• At least 1 uppercase letter (A-Z)\n';
      if (!passwordChecks.hasLowercase) errorMsg += '• At least 1 lowercase letter (a-z)\n';
      if (!passwordChecks.hasNumber) errorMsg += '• At least 1 number (0-9)\n';
      Alert.alert('Password Weak', errorMsg);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (resetMethod === 'recovery') {
        await resetWithRecovery();
      } else {
        await resetWithOTP();
      }
      
      Alert.alert(
        '✅ Success!',
        'Your password has been reset successfully. Please login with your new password.',
        [{ 
          text: 'Go to Login', 
          onPress: () => router.replace('/(auth)/login') 
        }]
      );
      
    } catch (error: any) {
      console.error('❌ Reset password error:', error);
      
      let errorMessage = error?.message || 'Failed to reset password';
      let errorTitle = 'Error';
      
      if (error?.code === 401) {
        errorTitle = 'Link Expired';
        errorMessage = 'Invalid or expired reset link. Please request a new one.';
      } else if (error?.code === 404) {
        errorTitle = 'User Not Found';
        errorMessage = 'User not found. Please request a new reset link.';
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        errorTitle = 'Network Error';
        errorMessage = 'Cannot connect to server.\n\nMake sure backend is running at ' + getApiUrl();
      } else if (errorMessage.includes('password')) {
        errorTitle = 'Invalid Password';
        errorMessage = 'Please use a stronger password (8+ chars, A-Z, a-z, 0-9)';
      }
      
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={['#19699d', '#0e4d73', '#0a3550']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.formContainer}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#f0f7fc', '#e8f0f7']}
              style={styles.iconGradient}
            >
              <Ionicons name="key-outline" size={70} color="#19699d" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            Your new password must be at least 8 characters with uppercase, lowercase and numbers.
          </Text>

          {/* New Password Input */}
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#19699d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#999"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                validatePassword(text);
              }}
              secureTextEntry={!showNewPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
              <Ionicons name={showNewPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Password Strength Indicator */}
          {newPassword.length > 0 && (
            <View style={styles.passwordStrengthContainer}>
              <Text style={styles.strengthTitle}>Password requirements:</Text>
              <View style={styles.strengthItem}>
                <Ionicons 
                  name={passwordChecks.minLength ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={passwordChecks.minLength ? "#4CAF50" : "#ccc"} 
                />
                <Text style={[styles.strengthText, passwordChecks.minLength && styles.strengthValid]}>
                  At least 8 characters
                </Text>
              </View>
              <View style={styles.strengthItem}>
                <Ionicons 
                  name={passwordChecks.hasUppercase ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={passwordChecks.hasUppercase ? "#4CAF50" : "#ccc"} 
                />
                <Text style={[styles.strengthText, passwordChecks.hasUppercase && styles.strengthValid]}>
                  One uppercase letter (A-Z)
                </Text>
              </View>
              <View style={styles.strengthItem}>
                <Ionicons 
                  name={passwordChecks.hasLowercase ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={passwordChecks.hasLowercase ? "#4CAF50" : "#ccc"} 
                />
                <Text style={[styles.strengthText, passwordChecks.hasLowercase && styles.strengthValid]}>
                  One lowercase letter (a-z)
                </Text>
              </View>
              <View style={styles.strengthItem}>
                <Ionicons 
                  name={passwordChecks.hasNumber ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={passwordChecks.hasNumber ? "#4CAF50" : "#ccc"} 
                />
                <Text style={[styles.strengthText, passwordChecks.hasNumber && styles.strengthValid]}>
                  One number (0-9)
                </Text>
              </View>
            </View>
          )}

          {/* Confirm Password Input */}
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#19699d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <View style={styles.matchErrorRow}>
              <Ionicons name="alert-circle" size={14} color="#FF5252" />
              <Text style={styles.matchErrorText}>Passwords do not match</Text>
            </View>
          )}

          {/* Reset Button */}
          <TouchableOpacity
            style={[styles.resetButton, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
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
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.resetButtonText}>Resetting...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Ionicons name="refresh-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.resetButtonText}>Reset Password</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backToLogin}
            onPress={() => router.replace('/(auth)/login')}
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
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  scrollContent: { flexGrow: 1 },
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
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  formContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: -20,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#19699d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 30, textAlign: 'center', lineHeight: 20 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#333' },
  eyeIcon: { padding: 8 },
  passwordStrengthContainer: { backgroundColor: '#f8f9fa', padding: 14, borderRadius: 12, marginBottom: 16 },
  strengthTitle: { fontSize: 12, color: '#666', marginBottom: 10, fontWeight: '600' },
  strengthItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  strengthText: { fontSize: 12, color: '#999' },
  strengthValid: { color: '#4CAF50', textDecorationLine: 'line-through' },
  matchErrorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 6 },
  matchErrorText: { color: '#FF5252', fontSize: 12 },
  resetButton: { borderRadius: 14, marginTop: 10, marginBottom: 20, overflow: 'hidden', elevation: 3 },
  buttonGradient: { paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  resetButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backToLogin: { alignItems: 'center', paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  backToLoginText: { color: '#19699d', fontSize: 14, fontWeight: '500' },
});