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
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createSession, getCurrentUser, databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  // Load remembered email
  useEffect(() => {
    loadRememberedEmail();
  }, []);

  const loadRememberedEmail = async () => {
    try {
      const remembered = await AsyncStorage.getItem('rememberedEmail');
      if (remembered) {
        setEmail(remembered);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading remembered email:', error);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ✅ Database থেকে user role বের করার ফাংশন
  const getUserRoleFromDB = async (userId: string): Promise<string> => {
    try {
      const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS,
        [Query.equal('userId', userId)]
      );
      
      if (result.documents.length > 0) {
        const userDoc = result.documents[0];
        return userDoc.role || 'user';
      }
      return 'user';
    } catch (error) {
      console.log('Error getting role from DB:', error);
      return 'user';
    }
  };

  const handleLogin = async () => {
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      Alert.alert('Error', 'Please enter your email address');
      emailInputRef.current?.focus();
      return;
    }

    if (!validateEmail(cleanEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      emailInputRef.current?.focus();
      return;
    }

    if (!cleanPassword) {
      Alert.alert('Error', 'Please enter your password');
      passwordInputRef.current?.focus();
      return;
    }

    if (cleanPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      passwordInputRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      // ✅ Step 1: Create session (login)
      console.log('🔐 Logging in with:', cleanEmail);
      const session = await createSession(cleanEmail, cleanPassword);
      console.log('✅ Session created:', session.$id);
      
      // ✅ Step 2: Get current user from Appwrite
      const user = await getCurrentUser();
      console.log('✅ User found:', user?.$id);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // ✅ Step 3: Get user role from database
      const role = await getUserRoleFromDB(user.$id);
      console.log('✅ User role from DB:', role);
      
      // ✅ Step 4: Store user data in AsyncStorage
      const currentUser = {
        id: user.$id,
        email: user.email,
        name: user.name || cleanEmail.split('@')[0],
        role: role,
      };
      
      await AsyncStorage.setItem('currentUser', JSON.stringify(currentUser));
      await AsyncStorage.setItem('userRole', role);
      console.log('✅ User data saved to AsyncStorage');
      
      // ✅ Step 5: Save remembered email if needed
      if (rememberMe) {
        await AsyncStorage.setItem('rememberedEmail', cleanEmail);
      } else {
        await AsyncStorage.removeItem('rememberedEmail');
      }

      // ✅ Step 6: Navigate based on role
      if (role === 'admin') {
        console.log('➡️ Navigating to Admin Dashboard');
        router.replace('/(admin)/dashboard');
      } else {
        console.log('➡️ Navigating to User Home');
        router.replace('/(tabs)/home');
      }
      
    } catch (error: any) {
      console.log('❌ Login Error:', error?.message || error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error?.code === 401) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error?.code === 404) {
        errorMessage = 'User not found. Please create an account first.';
      } else if (error?.message?.includes('Network') || error?.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error?.type === 'user_invalid_credentials') {
        errorMessage = 'Incorrect email or password.';
      } else if (error?.code === 429) {
        errorMessage = 'Too many attempts. Please try again later.';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const handleRegister = () => {
    router.push('/(auth)/register');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={['#19699d', '#0e4d73']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.appName}>Smart Fashion</Text>
          <Text style={styles.tagline}>Your Style, Our Passion</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Welcome Back! 👋</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#19699d" style={styles.inputIcon} />
            <TextInput
              ref={emailInputRef}
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#19699d" style={styles.inputIcon} />
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!loading}
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)} 
              style={styles.eyeIcon}
              disabled={loading}
            >
              <Ionicons 
                name={showPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color="#999" 
              />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={styles.rememberMe} 
              onPress={() => setRememberMe(!rememberMe)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={12} color="white" />}
              </View>
              <Text style={styles.rememberText}>Remember Me</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleRegister} disabled={loading}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 50,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  formContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: -20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 15,
    backgroundColor: '#fafafa',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 5,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#19699d',
    borderRadius: 6,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#19699d',
  },
  rememberText: {
    fontSize: 14,
    color: '#666',
  },
  forgotText: {
    fontSize: 14,
    color: '#19699d',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#19699d',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#19699d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 12,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    fontSize: 14,
    color: '#19699d',
    fontWeight: 'bold',
  },
});