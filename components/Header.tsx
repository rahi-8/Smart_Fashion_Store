import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface HeaderProps {
  userName?: string;
  location?: string;
  cartCount?: number;
  onSearch?: () => void;
  onProfile?: () => void;
  onCart?: () => void;
  onNotification?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  userName = "Rahim Khan",
  location = "Dhaka",
  cartCount = 3,
  onSearch = () => Alert.alert('Search', 'Search functionality'),
  onProfile = () => Alert.alert('Profile', 'Profile screen'),
  onCart = () => Alert.alert('Cart', `You have ${cartCount} items`),
  onNotification = () => Alert.alert('Notifications', '3 new notifications')
}) => {
  return (
    <>
      {/* Main Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcome}>Hi, <Text style={styles.userName}>{userName}</Text> 👋</Text>
          <Text style={styles.location}>
            Deals near {location} 
            <Icon name="location-on" size={16} color="#666" />
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={onSearch}>
            <Icon name="search" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onProfile}>
            <Icon name="account-circle" size={28} color="#35aeff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.cartIcon} onPress={onCart}>
          <Icon name="shopping-cart" size={24} color="white" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.notificationIcon} onPress={onNotification}>
          <Icon name="notifications" size={24} color="#ff6b6b" />
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: { 
    flex: 1,
  },
  welcome: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#333',
    marginBottom: 2,
  },
  userName: { 
    color: '#35aeff', 
    fontWeight: 'bold' 
  },
  location: { 
    fontSize: 14, 
    color: '#666' 
  },
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  iconBtn: { 
    padding: 8, 
    marginLeft: 10 
  },
  
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'white',
    elevation: 1,
  },
  cartIcon: {
    position: 'relative',
    width: 50,
    height: 50,
    backgroundColor: '#35aeff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: { 
    color: 'white', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },
  notificationIcon: {
    position: 'relative',
    padding: 10,
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { 
    color: 'white', 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
});

export default Header;
