// app/(tabs)/profile.tsx - ফিচার intact রেখে শুধু বাগ ফিক্স
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { account, databases, DATABASE_ID, COLLECTIONS, ID, logout } from '../../appwrite/config';
import { Query } from 'appwrite';

interface UserProfile {
  $id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  role: string;
  isActive: boolean;
  notifications?: boolean;
  newsletter?: boolean;
  messageNotifications?: boolean;
  bio?: string;
}

interface Order {
  $id: string;
  totalAmount: number;
  orderStatus: string;
  createdAt: string;
  items: any[];
}

interface Chat {
  $id: string;
  orderId: string;
  lastMessage: string;
  lastMessageAt: string;
  customerUnread: number;
  status: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    address: '',
    avatar: '',
    role: 'user',
    isActive: true,
    notifications: true,
    newsletter: false,
    messageNotifications: true,
    bio: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UserProfile>(profile);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [ordersCount, setOrdersCount] = useState(0);
  const [favouritesCount, setFavouritesCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);

  // Load profile data from Appwrite
  const loadProfileData = async () => {
    try {
      setLoading(true);

      // Check if user is logged in
      const user = await account.get();
      setUserLoggedIn(true);

      const prefs = await account.getPrefs();

      // Try to get user from database
      let userData: UserProfile;
      let userDocId: string | null = null;

      try {
        const usersResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.USERS,
          [Query.equal('userId', user.$id)]
        );

        if (usersResponse.documents.length > 0) {
          const doc = usersResponse.documents[0];
          userDocId = doc.$id;
          userData = {
            $id: doc.$id,
            name: doc.name || user.name || 'Fashion Lover',
            email: user.email,
            phone: doc.phone || '',
            address: doc.address || '',
            avatar: doc.avatar || '',
            role: doc.role || 'user',
            isActive: doc.isActive ?? true,
            notifications: doc.notifications ?? true,
            newsletter: doc.newsletter ?? false,
            messageNotifications: doc.messageNotifications ?? true,
            bio: doc.bio || '',
          };
        } else {
          // Create new user document
          const newUserData = {
            userId: user.$id,
            name: user.name || 'Fashion Lover',
            email: user.email,
            phone: '',
            address: '',
            avatar: '',
            role: 'user',
            isActive: true,
            notifications: true,
            newsletter: false,
            messageNotifications: true,
            bio: '',
          };

          const newUser = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.USERS,
            ID.unique(),
            newUserData
          );
          userDocId = newUser.$id;
          userData = {
            $id: newUser.$id,
            name: newUserData.name,
            email: user.email,
            phone: '',
            address: '',
            avatar: '',
            role: 'user',
            isActive: true,
            notifications: true,
            newsletter: false,
            messageNotifications: true,
            bio: '',
          };
        }
      } catch (dbError) {
        console.log('Database error, using fallback:', dbError);
        userData = {
          name: user.name || 'Fashion Lover',
          email: user.email,
          phone: '',
          address: '',
          avatar: '',
          role: 'user',
          isActive: true,
          notifications: true,
          newsletter: false,
          messageNotifications: true,
          bio: '',
        };
      }

      setProfile(userData);
      setEditForm(userData);

      // Load orders - safely handle if collection doesn't exist
      try {
        const ordersResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.ORDERS,
          [Query.equal('userId', user.$id), Query.orderDesc('$createdAt'), Query.limit(3)]
        );
        setOrdersCount(ordersResponse.total);
        setRecentOrders(ordersResponse.documents as unknown as Order[]);
      } catch (ordersError) {
        console.log('Orders not available yet');
        setOrdersCount(0);
        setRecentOrders([]);
      }

      // Load chats - safely handle if collection doesn't exist
      try {
        const chatsResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.CHATS,
          [
            Query.equal('customerId', user.$id),
            Query.equal('status', 'active'),
            Query.orderDesc('lastMessageAt')
          ]
        );
        setRecentChats(chatsResponse.documents as unknown as Chat[]);

        let unreadTotal = 0;
        for (const chat of chatsResponse.documents) {
          unreadTotal += (chat.customerUnread || 0);
        }
        setUnreadMessagesCount(unreadTotal);
      } catch (chatsError) {
        console.log('Chats not available yet');
        setRecentChats([]);
        setUnreadMessagesCount(0);
      }

      // Load favourites count
      try {
        const favourites = await AsyncStorage.getItem('favourites');
        if (favourites) {
          setFavouritesCount(JSON.parse(favourites).length);
        }
      } catch (favError) {
        setFavouritesCount(0);
      }

    } catch (error: any) {
      console.error('Error loading profile:', error);
      if (error?.code === 401) {
        setUserLoggedIn(false);
        await AsyncStorage.removeItem('currentUser');
        await AsyncStorage.removeItem('userRole');
      } else {
        setUserLoggedIn(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
  };

  useFocusEffect(useCallback(() => { loadProfileData(); }, []));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploadingImage(true);
      setEditForm({ ...editForm, avatar: result.assets[0].uri });
      setUploadingImage(false);
    }
  };

  const updateUserInAppwrite = async (updatedData: Partial<UserProfile>) => {
    try {
      if (updatedData.name && updatedData.name !== profile.name) {
        await account.updateName(updatedData.name);
      }

      const prefs = await account.getPrefs();
      await account.updatePrefs({
        ...prefs,
        name: updatedData.name,
        phone: updatedData.phone,
        address: updatedData.address,
        avatar: updatedData.avatar,
        bio: updatedData.bio,
        notifications: updatedData.notifications,
        newsletter: updatedData.newsletter,
        messageNotifications: updatedData.messageNotifications,
      });

      if (profile.$id) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          profile.$id,
          {
            name: updatedData.name,
            phone: updatedData.phone,
            address: updatedData.address,
            avatar: updatedData.avatar,
            bio: updatedData.bio,
            notifications: updatedData.notifications,
            newsletter: updatedData.newsletter,
            messageNotifications: updatedData.messageNotifications,
          }
        );
      }

      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setLoading(true);
    const success = await updateUserInAppwrite(editForm);

    if (success) {
      setProfile(editForm);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
      await loadProfileData();
    } else {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
    setLoading(false);
  };

  const handleCancel = () => {
    setEditForm(profile);
    setIsEditing(false);
  };

  // ✅ Fixed Logout function
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
            try {
              // Clear AsyncStorage
              await AsyncStorage.removeItem('currentUser');
              await AsyncStorage.removeItem('userRole');
              await AsyncStorage.removeItem('rememberedEmail');
              
              // Call logout function
              await logout();
              
              setUserLoggedIn(false);
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const updateNotificationSettings = async (key: 'notifications' | 'newsletter' | 'messageNotifications', value: boolean) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    await updateUserInAppwrite({ [key]: value });
    Alert.alert('Success', `${key === 'notifications' ? 'Notification' : key === 'newsletter' ? 'Newsletter' : 'Message'} settings updated`);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const openMessages = () => {
    router.push('/(tabs)/messages');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#19699d" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!userLoggedIn) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#19699d']} />
        }
      >
        <View style={styles.notLoggedInContainer}>
          <Ionicons name="person-circle-outline" size={100} color="#19699d" />
          <Text style={styles.notLoggedInTitle}>Not Logged In</Text>
          <Text style={styles.notLoggedInText}>Please login to access your profile</Text>

          <TouchableOpacity style={styles.loginMainBtn} onPress={() => router.replace('/(auth)/login')}>
            <Ionicons name="log-in-outline" size={24} color="white" />
            <Text style={styles.loginMainText}>Login / Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#19699d']} />
      }
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer} disabled={!isEditing}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{getInitials(profile.name)}</Text>
            </View>
          )}
          {isEditing && (
            <View style={styles.editIconBadge}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="white" />
              )}
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => {
              setEditForm(profile);
              setIsEditing(true);
            }}
          >
            <Ionicons name="create-outline" size={16} color="#19699d" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <TouchableOpacity style={styles.statCard} onPress={() => setShowOrdersModal(true)}>
          <Text style={styles.statNumber}>{ordersCount}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/favourites')}>
          <Text style={styles.statNumber}>{favouritesCount}</Text>
          <Text style={styles.statLabel}>Favourites</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{profile.role === 'admin' ? 'Admin' : 'Member'}</Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>

      {/* Bio Section */}
      {profile.bio ? (
        <View style={styles.bioSection}>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>
      ) : null}

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#19699d" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{profile.phone || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#19699d" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{profile.address || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#19699d" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile.email}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>

        <TouchableOpacity style={styles.menuItem} onPress={openMessages}>
          <View style={styles.menuIconLeft}>
            <Ionicons name="chatbubbles-outline" size={22} color="#19699d" />
            {unreadMessagesCount > 0 && (
              <View style={styles.menuUnreadBadge}>
                <Text style={styles.menuUnreadText}>{unreadMessagesCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.menuText}>Messages</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" style={styles.menuIcon} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setShowOrdersModal(true)}>
          <Ionicons name="bag-outline" size={22} color="#19699d" />
          <Text style={styles.menuText}>My Orders</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" style={styles.menuIcon} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/favourites')}>
          <Ionicons name="heart-outline" size={22} color="#19699d" />
          <Text style={styles.menuText}>Wishlist</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" style={styles.menuIcon} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setShowSettingsModal(true)}>
          <Ionicons name="settings-outline" size={22} color="#19699d" />
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" style={styles.menuIcon} />
        </TouchableOpacity>

        {profile.role === 'admin' && (
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(admin)/dashboard')}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#19699d" />
            <Text style={styles.menuText}>Admin Panel</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" style={styles.menuIcon} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#dc3545" />
          <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" style={styles.menuIcon} />
        </TouchableOpacity>
      </View>

      {/* Recent Chats Preview */}
      {recentChats.length > 0 && (
        <View style={styles.recentChatsSection}>
          <Text style={styles.sectionTitle}>Recent Conversations</Text>
          {recentChats.slice(0, 2).map((chat) => (
            <TouchableOpacity
              key={chat.$id}
              style={styles.recentChatItem}
              onPress={openMessages}
            >
              <View style={styles.recentChatAvatar}>
                <Ionicons name="chatbox-ellipses-outline" size={20} color="#19699d" />
              </View>
              <View style={styles.recentChatInfo}>
                <Text style={styles.recentChatTitle}>Order #{chat.orderId?.slice(-8)}</Text>
                <Text style={styles.recentChatMessage} numberOfLines={1}>
                  {chat.lastMessage || 'No messages yet'}
                </Text>
              </View>
              {chat.customerUnread > 0 && (
                <View style={styles.smallUnreadBadge}>
                  <Text style={styles.smallUnreadText}>{chat.customerUnread}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditing}
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleCancel}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={pickImage} style={styles.editAvatarContainer}>
              {editForm.avatar ? (
                <Image source={{ uri: editForm.avatar }} style={styles.editAvatar} />
              ) : (
                <View style={styles.editAvatarPlaceholder}>
                  <Text style={styles.editAvatarInitials}>{getInitials(editForm.name)}</Text>
                </View>
              )}
              <View style={styles.changePhotoBtn}>
                <Ionicons name="camera" size={20} color="white" />
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={editForm.name}
                onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={editForm.email}
                editable={false}
              />
              <Text style={styles.disabledHint}>Email cannot be changed</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editForm.address}
                onChangeText={(text) => setEditForm({ ...editForm, address: text })}
                placeholder="Enter your address"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bio (About you)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editForm.bio}
                onChangeText={(text) => setEditForm({ ...editForm, bio: text })}
                placeholder="Tell us about yourself..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSettingsModal}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications-outline" size={22} color="#19699d" />
                <Text style={styles.settingText}>Push Notifications</Text>
              </View>
              <Switch
                value={profile.notifications ?? true}
                onValueChange={(value) => updateNotificationSettings('notifications', value)}
                trackColor={{ false: '#e0e0e0', true: '#19699d' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="mail-outline" size={22} color="#19699d" />
                <Text style={styles.settingText}>Newsletter Subscription</Text>
              </View>
              <Switch
                value={profile.newsletter ?? false}
                onValueChange={(value) => updateNotificationSettings('newsletter', value)}
                trackColor={{ false: '#e0e0e0', true: '#19699d' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="chatbubbles-outline" size={22} color="#19699d" />
                <Text style={styles.settingText}>Message Notifications</Text>
              </View>
              <Switch
                value={profile.messageNotifications ?? true}
                onValueChange={(value) => updateNotificationSettings('messageNotifications', value)}
                trackColor={{ false: '#e0e0e0', true: '#19699d' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Orders Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showOrdersModal}
        onRequestClose={() => setShowOrdersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.ordersModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Orders</Text>
              <TouchableOpacity onPress={() => setShowOrdersModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {recentOrders.length === 0 ? (
              <View style={styles.noOrdersContainer}>
                <Ionicons name="bag-outline" size={60} color="#ccc" />
                <Text style={styles.noOrdersText}>No orders yet</Text>
                <TouchableOpacity style={styles.shopNowBtn} onPress={() => router.push('/(tabs)/home')}>
                  <Text style={styles.shopNowText}>Start Shopping</Text>
                </TouchableOpacity>
              </View>
            ) : (
              recentOrders.map((order) => (
                <View key={order.$id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>#{order.$id.slice(-8)}</Text>
                    <Text style={styles.orderDate}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
                    </Text>
                  </View>
                  <Text style={styles.orderAmount}>৳{order.totalAmount?.toLocaleString() || 0}</Text>
                  <View style={styles.orderStatus}>
                    <View style={[styles.statusDot, {
                      backgroundColor: order.orderStatus === 'delivered' ? '#4CAF50' :
                        order.orderStatus === 'cancelled' ? '#F44336' : '#FF9800'
                    }]} />
                    <Text style={styles.orderStatusText}>
                      {order.orderStatus?.charAt(0).toUpperCase() + order.orderStatus?.slice(1) || 'Pending'}
                    </Text>
                  </View>
                </View>
              ))
            )}

            {ordersCount > 3 && (
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => {
                  setShowOrdersModal(false);
                  router.push('/(tabs)/orders');
                }}
              >
                <Text style={styles.viewAllText}>View All Orders</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Keep all existing styles as they are...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6c757d',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    margin: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#19699d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    backgroundColor: '#19699d',
    borderRadius: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212529',
  },
  email: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  editProfileText: {
    fontSize: 13,
    color: '#19699d',
    marginLeft: 4,
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#19699d',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e9ecef',
  },
  bioSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  bioText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 28,
  },
  menuUnreadBadge: {
    backgroundColor: '#dc3545',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: 4,
    minWidth: 18,
    alignItems: 'center',
  },
  menuUnreadText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
    color: '#212529',
  },
  menuIcon: {
    marginLeft: 'auto',
  },
  logoutItem: {
    marginTop: 10,
  },
  logoutText: {
    color: '#dc3545',
  },
  recentChatsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  recentChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  recentChatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#19699d10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentChatInfo: {
    flex: 1,
  },
  recentChatTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
  },
  recentChatMessage: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 2,
  },
  smallUnreadBadge: {
    backgroundColor: '#dc3545',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  smallUnreadText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 20,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginMainBtn: {
    flexDirection: 'row',
    backgroundColor: '#19699d',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#19699d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginMainText: {
    fontSize: 18,
    color: 'white',
    marginLeft: 12,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  editAvatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  editAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  editAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#19699d',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  editAvatarInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#19699d',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  changePhotoText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#212529',
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  disabledInput: {
    backgroundColor: '#e9ecef',
    color: '#6c757d',
  },
  disabledHint: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 4,
    marginLeft: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelBtnText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#19699d',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  settingsModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#212529',
  },
  ordersModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: '85%',
  },
  orderCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'monospace',
  },
  orderDate: {
    fontSize: 11,
    color: '#999',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#19699d',
    marginBottom: 8,
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orderStatusText: {
    fontSize: 12,
    color: '#666',
  },
  noOrdersContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noOrdersText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  shopNowBtn: {
    backgroundColor: '#19699d',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 16,
  },
  shopNowText: {
    color: 'white',
    fontWeight: '500',
  },
  viewAllBtn: {
    alignItems: 'center',
    padding: 12,
    marginTop: 10,
  },
  viewAllText: {
    color: '#19699d',
    fontWeight: '500',
  },
});