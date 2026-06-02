// Marketing.tsx 

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  RefreshControl,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import {
  databases,
  DATABASE_ID,
  COLLECTIONS,
  ID,
  Query,
  uploadProductImage
} from '../../appwrite/config';

// Dark Theme Colors
const C = {
  bg: '#060B1F',
  surface: '#0D1535',
  surfaceAlt: '#111C42',
  border: '#1E2D60',
  blue1: '#1565C0',
  blue2: '#1976D2',
  blue3: '#42A5F5',
  blue4: '#90CAF9',
  cyan: '#00E5FF',
  purple: '#7C4DFF',
  indigo: '#3D5AFE',
  accentGreen: '#00E676',
  accentOrange: '#FFB300',
  accentRed: '#FF5252',
  textPrimary: '#E8EAF6',
  textSecondary: '#9FA8DA',
  textMuted: '#4A5580',
  white: '#FFFFFF',
};

interface Banner {
  $id: string;
  title: string | null;
  image: string;
  link: string | null;
  order: number;
  isActive: boolean;
  $createdAt: string;
  $updatedAt: string;
}

// Bubble Component for Decoration
const Bubble = ({ size, top, bottom, left, right, opacity = 0.12, color = C.blue3 }: any) => (
  <View style={{
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    opacity,
    top, bottom, left, right,
  }} />
);

export default function Marketing() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [title, setTitle] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [link, setLink] = useState('');
  const [order, setOrder] = useState('0');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BANNERS,
        [
          Query.orderDesc('$createdAt')
        ]
      );
      setBanners(response.documents as unknown as Banner[]);
    } catch (error: any) {
      console.error('Error fetching banners:', error);
      Alert.alert('Error', error.message || 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBanners();
    setRefreshing(false);
  };

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (cameraStatus !== 'granted') {
          Alert.alert('Permission Needed', 'Please grant camera roll permissions to upload images');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const createOrUpdateBanner = async () => {
    // Validate required fields
    if (!editingBanner && !image) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter banner title');
      return;
    }

    setUploading(true);

    try {
      let imageUrl = editingBanner?.image || '';

      // Upload new image if selected
      if (image) {
        imageUrl = await uploadProductImage(image);
        if (!imageUrl) {
          throw new Error('Failed to upload image');
        }
      }

      // Prepare data matching the schema exactly
      const bannerData = {
        title: title.trim(),
        image: imageUrl,
        link: link.trim() || null,
        order: parseInt(order) || 0,
        isActive: isActive,
      };

      console.log('Saving banner data:', bannerData);

      if (editingBanner) {
        // Update existing banner
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.BANNERS,
          editingBanner.$id,
          bannerData
        );
        Alert.alert('Success', 'Banner updated successfully');
      } else {
        // Create new banner
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.BANNERS,
          ID.unique(),
          bannerData
        );
        Alert.alert('Success', 'Banner created successfully');
      }

      // Reset form and refresh list
      resetForm();
      await fetchBanners();
    } catch (error: any) {
      console.error('Error saving banner:', error);
      Alert.alert('Error', error.message || 'Failed to save banner');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setModalVisible(false);
    setEditingBanner(null);
    setTitle('');
    setIsActive(true);
    setLink('');
    setOrder('0');
    setImage(null);
  };

  const editBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setTitle(banner.title || '');
    setIsActive(banner.isActive);
    setLink(banner.link || '');
    setOrder(banner.order.toString());
    setImage(null);
    setModalVisible(true);
  };

  const updateBannerStatus = async (bannerId: string, currentIsActive: boolean) => {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.BANNERS,
        bannerId,
        { isActive: !currentIsActive }
      );
      await fetchBanners();
      Alert.alert('Success', `Banner ${!currentIsActive ? 'activated' : 'deactivated'}`);
    } catch (error: any) {
      console.error('Error updating banner status:', error);
      Alert.alert('Error', error.message || 'Failed to update banner status');
    }
  };

  const deleteBanner = async (banner: Banner) => {
    Alert.alert(
      'Delete Banner',
      `Are you sure you want to delete "${banner.title || 'Untitled'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databases.deleteDocument(
                DATABASE_ID,
                COLLECTIONS.BANNERS,
                banner.$id
              );
              await fetchBanners();
              Alert.alert('Success', 'Banner deleted successfully');
            } catch (error: any) {
              console.error('Error deleting banner:', error);
              Alert.alert('Error', error.message || 'Failed to delete banner');
            }
          },
        },
      ]
    );
  };

  const renderBannerItem = ({ item }: { item: Banner }) => (
    <LinearGradient colors={[C.surface, C.surfaceAlt]} style={styles.bannerCard}>
      <Image source={{ uri: item.image }} style={styles.bannerImage} />
      <View style={styles.bannerInfo}>
        <Text style={styles.bannerTitle}>{item.title || 'Untitled Banner'}</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, item.isActive ? styles.activeStatus : styles.inactiveStatus]}>
            <Feather name={item.isActive ? "check-circle" : "x-circle"} size={10} color={C.white} />
            <Text style={styles.statusText}>{item.isActive ? 'ACTIVE' : 'INACTIVE'}</Text>
          </View>
          <View style={styles.orderBadge}>
            <Feather name="hash" size={10} color={C.white} />
            <Text style={styles.orderText}>Order: {item.order}</Text>
          </View>
        </View>
        {item.link ? (
          <View style={styles.linkContainer}>
            <Feather name="link" size={12} color={C.blue4} />
            <Text style={styles.linkText} numberOfLines={1}>{item.link}</Text>
          </View>
        ) : null}
        <View style={styles.dateContainer}>
          <Feather name="calendar" size={10} color={C.textMuted} />
          <Text style={styles.dateText}>
            Created: {new Date(item.$createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => editBanner(item)}>
          <Feather name="edit-2" size={14} color={C.white} />
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.statusButton]}
          onPress={() => updateBannerStatus(item.$id, item.isActive)}>
          <Feather name={item.isActive ? "eye-off" : "eye"} size={14} color={C.white} />
          <Text style={styles.buttonText}>{item.isActive ? 'Deactivate' : 'Activate'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteBanner(item)}>
          <Feather name="trash-2" size={14} color={C.white} />
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A1647', '#0D1F6E', '#1034A6']} style={styles.header}>
        <Bubble size={180} top={-60} right={-50} opacity={0.08} />
        <Bubble size={120} bottom={-40} left={-30} opacity={0.1} color={C.purple} />
        <Bubble size={70} top={30} right={80} opacity={0.12} color={C.cyan} />
        <Bubble size={40} bottom={40} right={140} opacity={0.15} color={C.indigo} />
        <Bubble size={25} top={60} left={50} opacity={0.18} color={C.cyan} />
        <Bubble size={15} top={20} right={40} opacity={0.22} color={C.white} />
        
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>🎯 Banner Management</Text>
            <Text style={styles.subtitle}>Manage your homepage banners</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => {
            resetForm();
            setModalVisible(true);
          }}>
            <LinearGradient colors={[C.blue2, C.cyan]} style={styles.addButtonGradient}>
              <Feather name="plus" size={18} color={C.white} />
              <Text style={styles.addButtonText}>Add Banner</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={C.cyan} />
          <Text style={styles.loadingText}>Loading banners...</Text>
        </View>
      ) : (
        <FlatList
          data={banners}
          keyExtractor={(item) => item.$id}
          renderItem={renderBannerItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} colors={[C.cyan]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="image" size={64} color={C.textMuted} />
              <Text style={styles.emptyText}>No banners found</Text>
              <Text style={styles.emptySubText}>Tap "Add Banner" to create one</Text>
            </View>
          }
        />
      )}

      {/* Add/Edit Banner Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={resetForm}>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={[C.surface, C.surfaceAlt]} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBanner ? '✏️ Edit Banner' : '✨ Create New Banner'}
              </Text>
              <TouchableOpacity onPress={resetForm} style={styles.modalClose}>
                <Feather name="x" size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Banner Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter banner title"
                placeholderTextColor={C.textMuted}
              />

              <Text style={styles.label}>Banner Image *</Text>
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                <LinearGradient colors={[C.surface, C.border]} style={styles.imagePickerGradient}>
                  <Feather name="image" size={20} color={C.cyan} />
                  <Text style={styles.imagePickerText}>
                    {image ? 'Change Image' : (editingBanner ? 'Change Image' : 'Select Image')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              {(image || editingBanner) && (
                <Image 
                  source={{ uri: image || editingBanner?.image }} 
                  style={styles.previewImage} 
                />
              )}

              <Text style={styles.label}>Status</Text>
              <View style={styles.statusSelector}>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    isActive === true && styles.selectedStatusOptionActive
                  ]}
                  onPress={() => setIsActive(true)}>
                  <Feather name="check-circle" size={16} color={isActive === true ? C.accentGreen : C.textMuted} />
                  <Text style={[
                    styles.statusOptionText,
                    isActive === true && styles.selectedStatusText
                  ]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    isActive === false && styles.selectedStatusOptionInactive
                  ]}
                  onPress={() => setIsActive(false)}>
                  <Feather name="x-circle" size={16} color={isActive === false ? C.accentRed : C.textMuted} />
                  <Text style={[
                    styles.statusOptionText,
                    isActive === false && styles.selectedStatusText
                  ]}>Inactive</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Link URL (Optional)</Text>
              <TextInput
                style={styles.input}
                value={link}
                onChangeText={setLink}
                placeholder="https://example.com"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Display Order *</Text>
              <TextInput
                style={styles.input}
                value={order}
                onChangeText={setOrder}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={C.textMuted}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={resetForm}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={createOrUpdateBanner}
                  disabled={uploading}>
                  {uploading ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <>
                      <Feather name={editingBanner ? "check" : "plus"} size={16} color={C.white} />
                      <Text style={styles.saveButtonText}>
                        {editingBanner ? 'Update' : 'Create'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: C.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: C.blue4,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  addButtonText: {
    color: C.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: C.cyan,
    fontWeight: '600',
  },
  listContainer: {
    padding: 12,
  },
  bannerCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  bannerImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  bannerInfo: {
    padding: 15,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: C.textPrimary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  activeStatus: {
    backgroundColor: C.accentGreen,
  },
  inactiveStatus: {
    backgroundColor: C.textMuted,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.white,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.blue1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  orderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.white,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  linkText: {
    fontSize: 11,
    color: C.blue4,
    flex: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 10,
    color: C.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  editButton: {
    backgroundColor: C.accentOrange,
  },
  statusButton: {
    backgroundColor: C.blue1,
  },
  deleteButton: {
    backgroundColor: C.accentRed,
  },
  buttonText: {
    color: C.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.textSecondary,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
  },
  modalContent: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: C.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.textPrimary,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 12,
    color: C.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: C.surface,
    color: C.textPrimary,
  },
  imagePickerButton: {
    marginTop: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imagePickerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
  },
  imagePickerText: {
    fontWeight: 'bold',
    color: C.cyan,
    fontSize: 14,
  },
  previewImage: {
    width: '100%',
    height: 150,
    marginTop: 10,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 5,
  },
  statusOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    backgroundColor: C.surface,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  selectedStatusOptionActive: {
    backgroundColor: C.accentGreen + '20',
    borderColor: C.accentGreen,
  },
  selectedStatusOptionInactive: {
    backgroundColor: C.accentRed + '20',
    borderColor: C.accentRed,
  },
  statusOptionText: {
    fontWeight: 'bold',
    color: C.textSecondary,
  },
  selectedStatusText: {
    color: C.white,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelButtonText: {
    color: C.textSecondary,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: C.blue1,
  },
  saveButtonText: {
    color: C.white,
    fontWeight: 'bold',
  },
});