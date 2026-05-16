// app/(admin)/_layout.tsx
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Text, Alert, View } from 'react-native'; // ✅ View যোগ করা হয়েছে
import { useRouter } from 'expo-router';
import { logout } from '../../appwrite/config';

export default function AdminLayout() {
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerStyle: { backgroundColor: '#0D1F6E' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          drawerStyle: {
            backgroundColor: '#f5f5f5',
            width: 280,
          },
          drawerActiveTintColor: '#0D1F6E',
          drawerInactiveTintColor: '#666',
          drawerActiveBackgroundColor: '#e3e8ff',
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
      >
        <Drawer.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        
        <Drawer.Screen
          name="users"
          options={{
            title: 'Users Management',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
        
        <Drawer.Screen
          name="products"
          options={{
            title: 'Products Management',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
          }}
        />
        
        <Drawer.Screen
          name="orders"
          options={{
            title: 'Orders Management',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="cart-outline" size={size} color={color} />
            ),
          }}
        />
        
        <Drawer.Screen
          name="coupons"
          options={{
            title: 'Coupons & Offers',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="pricetag-outline" size={size} color={color} />
            ),
          }}
        />
        
        <Drawer.Screen
          name="revenue"
          options={{
            title: 'Revenue Analytics',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
          }}
        />
        
        <Drawer.Screen
          name="marketing"
          options={{
            title: 'Marketing',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="megaphone-outline" size={size} color={color} />
            ),
          }}
        />
        
        <Drawer.Screen
          name="settings"
          options={{
            title: 'Settings',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

// Custom Drawer Content Component
function CustomDrawerContent({ navigation, state, descriptors, ...props }: any) {
  const router = useRouter();
  
  const menuItems = [
    { name: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
    { name: 'users', label: 'Users', icon: 'people-outline' },
    { name: 'products', label: 'Products', icon: 'cube-outline' },
    { name: 'orders', label: 'Orders', icon: 'cart-outline' },
    { name: 'coupons', label: 'Coupons', icon: 'pricetag-outline' },
    { name: 'revenue', label: 'Revenue', icon: 'bar-chart-outline' },
    { name: 'marketing', label: 'Marketing', icon: 'megaphone-outline' },
    { name: 'settings', label: 'Settings', icon: 'settings-outline' },
  ];

  return (
    <View style={{ flex: 1, paddingTop: 50 }}>
      {/* Header */}
      <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#ddd', marginBottom: 10 }}>
        <Ionicons name="storefront" size={50} color="#0D1F6E" />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0D1F6E', marginTop: 10 }}>
          Admin Panel
        </Text>
        <Text style={{ fontSize: 12, color: '#666' }}>Smart Fashion Store</Text>
      </View>

      {/* Menu Items */}
      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.name}
          onPress={() => router.push(`/(admin)/${item.name}`)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 15,
            marginHorizontal: 10,
            borderRadius: 10,
            backgroundColor: state.index === menuItems.findIndex(i => i.name === item.name) ? '#e3e8ff' : 'transparent',
          }}
        >
          <Ionicons 
            name={item.icon as any} 
            size={24} 
            color={state.index === menuItems.findIndex(i => i.name === item.name) ? '#0D1F6E' : '#666'} 
          />
          <Text style={{ 
            marginLeft: 15, 
            fontSize: 16,
            color: state.index === menuItems.findIndex(i => i.name === item.name) ? '#0D1F6E' : '#333',
            fontWeight: state.index === menuItems.findIndex(i => i.name === item.name) ? 'bold' : 'normal'
          }}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Footer */}
      <View style={{ marginTop: 'auto', padding: 20, borderTopWidth: 1, borderTopColor: '#ddd' }}>
        <TouchableOpacity
          onPress={async () => {
            await logout();
            router.replace('/(auth)/login');
          }}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="log-out-outline" size={24} color="#d32f2f" />
          <Text style={{ marginLeft: 15, fontSize: 16, color: '#d32f2f' }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}