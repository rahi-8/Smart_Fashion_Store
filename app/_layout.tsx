// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { isLoggedIn, getUserRole } from '../appwrite/config';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [segments]);

  const checkAuth = async () => {
    try {
      const loggedIn = await isLoggedIn();
      const inAuthGroup = segments[0] === '(auth)';
      const inAdminGroup = segments[0] === '(admin)';
      const inTabsGroup = segments[0] === '(tabs)';

      if (!loggedIn && !inAuthGroup) {
        // Not logged in and not in auth screen - redirect to login
        router.replace('/(auth)/login');
      } 
      else if (loggedIn) {
        const role = await getUserRole();
        
        if (role === 'admin' && !inAdminGroup && !inAuthGroup) {
          // Admin but not in admin area - redirect to dashboard
          router.replace('/(admin)/dashboard');
        } 
        else if (role !== 'admin' && !inTabsGroup && !inAuthGroup) {
          // Regular user but not in tabs - redirect to home
          router.replace('/(tabs)/home');
        }
      }
    } catch (error) {
      console.log('Layout auth error:', error);
    } finally {
      setIsReady(true);
    }
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#0D1F6E" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}