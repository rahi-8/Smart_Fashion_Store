import { Stack, useRouter, usePathname } from 'expo-router';
import { TouchableOpacity, Alert, View, Text, TouchableWithoutFeedback, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '../../appwrite/config';
import { useState, useRef } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = 280;

const menuItems = [
  { name: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { name: 'users', label: 'Users Management', icon: 'people-outline' },
  { name: 'products', label: 'Products Management', icon: 'cube-outline' },
  { name: 'orders', label: 'Orders Management', icon: 'cart-outline' },
  { name: 'coupons', label: 'Coupons & Offers', icon: 'pricetag-outline' },
  { name: 'revenue', label: 'Revenue Analytics', icon: 'bar-chart-outline' },
  { name: 'marketing', label: 'Marketing', icon: 'megaphone-outline' },
  { name: 'settings', label: 'Settings', icon: 'settings-outline' },
];

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0.5, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  const handleLogout = async () => {
    closeDrawer();
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const navigateTo = (screen: string) => {
    closeDrawer();
    router.push(`/(admin)/${screen}`);
  };

  const currentScreen = pathname.split('/').pop() || 'dashboard';

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0D1F6E' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={openDrawer} style={{ marginLeft: 15 }}>
              <Ionicons name="menu-outline" size={28} color="#fff" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      >
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="users" options={{ title: 'Users Management' }} />
        <Stack.Screen name="products" options={{ title: 'Products Management' }} />
        <Stack.Screen name="orders" options={{ title: 'Orders Management' }} />
        <Stack.Screen name="coupons" options={{ title: 'Coupons & Offers' }} />
        <Stack.Screen name="revenue" options={{ title: 'Revenue Analytics' }} />
        <Stack.Screen name="marketing" options={{ title: 'Marketing' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'black',
              opacity: overlayAnim,
              zIndex: 999,
            }}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Custom Drawer */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: DRAWER_WIDTH,
          backgroundColor: '#f5f5f5',
          transform: [{ translateX: slideAnim }],
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 2, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          zIndex: 1000,
        }}
      >
        <View style={{ padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
          <Ionicons name="storefront" size={50} color="#0D1F6E" />
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0D1F6E', marginTop: 10 }}>Admin Panel</Text>
          <Text style={{ fontSize: 12, color: '#666' }}>Smart Fashion Store</Text>
        </View>

        {menuItems.map((item) => {
          const isActive = currentScreen === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => navigateTo(item.name)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 15,
                marginHorizontal: 10,
                borderRadius: 10,
                marginVertical: 2,
                backgroundColor: isActive ? '#e3e8ff' : 'transparent',
              }}
            >
              <Ionicons name={item.icon as any} size={24} color={isActive ? '#0D1F6E' : '#666'} />
              <Text style={{
                marginLeft: 15,
                fontSize: 16,
                color: isActive ? '#0D1F6E' : '#333',
                fontWeight: isActive ? 'bold' : 'normal',
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ marginTop: 'auto', padding: 20, borderTopWidth: 1, borderTopColor: '#ddd' }}>
          <TouchableOpacity onPress={handleLogout} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="log-out-outline" size={24} color="#d32f2f" />
            <Text style={{ marginLeft: 15, fontSize: 16, color: '#d32f2f' }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}