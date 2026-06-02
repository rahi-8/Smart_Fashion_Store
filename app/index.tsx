// app/index.tsx 
import { View, Text, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { isLoggedIn, getUserRole } from '../appwrite/config';

export default function Index() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const loggedIn = await isLoggedIn();
      
      if (loggedIn) {
        const role = await getUserRole();
        if (role === 'admin') {
          router.replace('/(admin)/dashboard');
        } else {
          router.replace('/(tabs)/home');
        }
      } else {
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.log('Auth error:', error);
      router.replace('/(auth)/login');
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#0D1F6E" />
        <Text style={{ marginTop: 20, color: '#666' }}>Checking authentication...</Text>
      </View>
    );
  }

  return null;
}