// app/(tabs)/favourites.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Image, Alert, RefreshControl, Modal, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import { account, databases, DATABASE_ID, COLLECTIONS } from '../../appwrite/config';
import { Query, ID } from 'appwrite';

interface FavouriteItem {
  id: string;
  name: string;
  price: number;
  image: string;
  discountPrice?: number;
  stock?: number;
  description?: string;
  categoryName?: string;
  sizes?: string[];
  colors?: string[];
  wishlistId?: string;
}

interface WishlistDocument {
  $id: string;
  userId: string;
  productId: string;
  product: string;
  createdAt: string;
  $createdAt: string;
  $updatedAt: string;
}

export default function FavouritesScreen() {
  const router = useRouter();
  const [favourites, setFavourites] = useState<FavouriteItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FavouriteItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user ID
  const getCurrentUserId = async () => {
    try {
      const user = await account.get();
      setUserId(user.$id);
      return user.$id;
    } catch (error) {
      console.error('Get user error:', error);
      setUserId(null);
      return null;
    }
  };

  // Load favourites from Appwrite backend
  const loadFavouritesFromBackend = async () => {
    try {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        setFavourites([]);
        setLoading(false);
        return;
      }

      console.log('📱 Loading favourites for user:', currentUserId);

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WISHLIST,
        [
          Query.equal('userId', currentUserId),
          Query.orderDesc('createdAt')
        ]
      );

      console.log('📦 Wishlist response:', response.documents.length, 'items');

      const wishlistItems = response.documents as unknown as WishlistDocument[];
      
      const favouriteProducts = wishlistItems.map(item => {
        try {
          let productData;
          // Check if product is already an object or string
          if (typeof item.product === 'string') {
            productData = JSON.parse(item.product);
          } else {
            productData = item.product;
          }
          
          return {
            id: productData.id || item.productId,
            name: productData.name || '',
            price: productData.price || 0,
            image: productData.image || 'https://via.placeholder.com/100',
            discountPrice: productData.discountPrice,
            stock: productData.stock,
            description: productData.description,
            categoryName: productData.categoryName,
            sizes: productData.sizes || [],
            colors: productData.colors || [],
            wishlistId: item.$id,
          };
        } catch (error) {
          console.error('Parse error for item:', item.$id, error);
          return null;
        }
      }).filter(item => item !== null) as FavouriteItem[];

      setFavourites(favouriteProducts);
      
      await AsyncStorage.setItem('favourites', JSON.stringify(favouriteProducts));
    } catch (error) {
      console.error('Error loading favourites from backend:', error);
      await loadFavouritesFromLocal();
    } finally {
      setLoading(false);
    }
  };

  // Fallback: Load from local storage
  const loadFavouritesFromLocal = async () => {
    try {
      const stored = await AsyncStorage.getItem('favourites');
      if (stored) {
        setFavourites(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading favourites from local:', error);
      setFavourites([]);
    }
  };

  // Remove from backend wishlist
  const removeFromBackend = async (productId: string, wishlistDocId?: string) => {
    try {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) return false;

      if (wishlistDocId) {
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.WISHLIST,
          wishlistDocId
        );
        console.log('✅ Deleted wishlist item:', wishlistDocId);
        return true;
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WISHLIST,
        [
          Query.equal('userId', currentUserId),
          Query.equal('productId', productId)
        ]
      );

      if (response.documents.length > 0) {
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.WISHLIST,
          response.documents[0].$id
        );
        console.log('✅ Deleted wishlist item:', response.documents[0].$id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing from backend:', error);
      return false;
    }
  };

  // Sync favourites to local storage
  const syncToLocalStorage = async (items: FavouriteItem[]) => {
    try {
      await AsyncStorage.setItem('favourites', JSON.stringify(items));
    } catch (error) {
      console.error('Error syncing to local:', error);
    }
  };

  const loadFavourites = async () => {
    setLoading(true);
    await loadFavouritesFromBackend();
  };

  useFocusEffect(
    useCallback(() => {
      loadFavourites();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavourites();
    setRefreshing(false);
  };

  // Remove from favourites
  const removeFromFavourites = async (item: FavouriteItem) => {
    Alert.alert('Remove Item', `Remove "${item.name}" from favourites?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const removed = await removeFromBackend(item.id, item.wishlistId);
          
          if (removed) {
            const updated = favourites.filter(i => i.id !== item.id);
            setFavourites(updated);
            await syncToLocalStorage(updated);
            Alert.alert('Removed', `${item.name} removed from favourites`);
          } else {
            Alert.alert('Error', 'Failed to remove from favourites');
          }
        },
      },
    ]);
  };

  const clearAllFavourites = () => {
    if (favourites.length === 0) return;
    
    Alert.alert('Clear All', 'Remove all items from favourites?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive',
        onPress: async () => {
          for (const item of favourites) {
            await removeFromBackend(item.id, item.wishlistId);
          }
          setFavourites([]);
          await AsyncStorage.removeItem('favourites');
          Alert.alert('Cleared', 'All items removed from favourites');
        },
      },
    ]);
  };

  const addToCart = async (item: FavouriteItem) => {
    try {
      const cart = await AsyncStorage.getItem('cart');
      const cartItems: any[] = cart ? JSON.parse(cart) : [];
      const existingIndex = cartItems.findIndex(i => i.id === item.id);

      if (existingIndex !== -1) {
        cartItems[existingIndex].quantity += 1;
      } else {
        cartItems.push({ 
          key: `${item.id}_${Date.now()}`,
          id: item.id, 
          name: item.name, 
          price: item.discountPrice || item.price,
          originalPrice: item.price,
          image: item.image, 
          quantity: 1,
          discountPrice: item.discountPrice,
        });
      }

      await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
      
      Alert.alert('Added!', `${item.name} added to cart`, [
        { text: 'OK', style: 'cancel' },
        { text: 'Go to Cart', onPress: () => router.push('/cart') },
      ]);
    } catch (error) {
      console.error('Add to cart error:', error);
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  const addAllToCart = async () => {
    if (favourites.length === 0) return;
    
    Alert.alert('Add All to Cart', `Add all ${favourites.length} items to cart?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add All',
        onPress: async () => {
          try {
            const cart = await AsyncStorage.getItem('cart');
            const cartItems: any[] = cart ? JSON.parse(cart) : [];

            for (const item of favourites) {
              const existingIndex = cartItems.findIndex(i => i.id === item.id);
              if (existingIndex !== -1) {
                cartItems[existingIndex].quantity += 1;
              } else {
                cartItems.push({ 
                  key: `${item.id}_${Date.now()}_${Math.random()}`,
                  id: item.id, 
                  name: item.name, 
                  price: item.discountPrice || item.price,
                  originalPrice: item.price,
                  image: item.image, 
                  quantity: 1,
                  discountPrice: item.discountPrice,
                });
              }
            }

            await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
            Alert.alert('Success', `Added ${favourites.length} items to cart!`);
          } catch (error) {
            console.error('Add all to cart error:', error);
            Alert.alert('Error', 'Failed to add items to cart');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: FavouriteItem }) => (
    <TouchableOpacity 
      style={styles.item} 
      onPress={() => { 
        setSelectedItem(item); 
        setModalVisible(true); 
      }} 
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.image || 'https://via.placeholder.com/100' }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>৳{(item.discountPrice || item.price).toLocaleString()}</Text>
          {item.discountPrice && item.discountPrice < item.price && (
            <Text style={styles.originalPrice}>৳{item.price.toLocaleString()}</Text>
          )}
        </View>
        {item.stock !== undefined && item.stock < 10 && item.stock > 0 && (
          <Text style={styles.stockText}>⚠️ Only {item.stock} left</Text>
        )}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.cartBtn} onPress={() => addToCart(item)}>
            <Feather name="shopping-cart" size={14} color="#fff" />
            <Text style={styles.cartBtnText}>Add to Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromFavourites(item)}>
            <Feather name="trash-2" size={16} color="#dc3545" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#19699d" />
        <Text style={{ marginTop: 12, color: '#666' }}>Loading favourites...</Text>
      </View>
    );
  }

  // Not logged in state
  if (!userId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Favourites</Text>
        </View>
        <View style={styles.centered}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="log-in-outline" size={70} color="#ccc" />
          </View>
          <Text style={styles.emptyText}>Not Logged In</Text>
          <Text style={styles.emptySubText}>Please login to view your favourites</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.shopBtnText}>Login / Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main render
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Favourites</Text>
          <Text style={styles.count}>{favourites.length} items</Text>
        </View>
        <View style={styles.headerActions}>
          {favourites.length > 0 && (
            <TouchableOpacity onPress={addAllToCart} style={styles.addAllBtn}>
              <Feather name="shopping-cart" size={18} color="#19699d" />
            </TouchableOpacity>
          )}
          {favourites.length > 0 && (
            <TouchableOpacity onPress={clearAllFavourites} style={styles.clearBtn}>
              <Feather name="trash-2" size={18} color="#dc3545" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {favourites.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="heart-outline" size={70} color="#ccc" />
          </View>
          <Text style={styles.emptyText}>No favourites yet</Text>
          <Text style={styles.emptySubText}>Save your favourite items here!</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/(tabs)/home')}>
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favourites}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Product Details Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Product Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {selectedItem && (
              <>
                <Image source={{ uri: selectedItem.image || 'https://via.placeholder.com/200' }} style={styles.modalImage} />
                <Text style={styles.modalName}>{selectedItem.name}</Text>
                {selectedItem.categoryName && (
                  <Text style={styles.modalCategory}>{selectedItem.categoryName}</Text>
                )}
                <View style={styles.modalPriceContainer}>
                  <Text style={styles.modalPrice}>৳{(selectedItem.discountPrice || selectedItem.price).toLocaleString()}</Text>
                  {selectedItem.discountPrice && selectedItem.discountPrice < selectedItem.price && (
                    <Text style={styles.modalOriginalPrice}>৳{selectedItem.price.toLocaleString()}</Text>
                  )}
                </View>
                {selectedItem.description && (
                  <Text style={styles.modalDescription}>{selectedItem.description}</Text>
                )}
                {selectedItem.sizes && selectedItem.sizes.length > 0 && (
                  <View style={styles.modalSizeContainer}>
                    <Text style={styles.modalSizeTitle}>Available Sizes:</Text>
                    <View style={styles.sizeRow}>
                      {selectedItem.sizes.map(size => (
                        <View key={size} style={styles.sizeBadge}>
                          <Text style={styles.sizeText}>{size}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalCartBtn]}
                    onPress={() => { addToCart(selectedItem); setModalVisible(false); }}
                  >
                    <Feather name="shopping-cart" size={18} color="#fff" />
                    <Text style={styles.modalBtnText}>Add to Cart</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalRemoveBtn]}
                    onPress={() => { removeFromFavourites(selectedItem); setModalVisible(false); }}
                  >
                    <Feather name="trash-2" size={18} color="#fff" />
                    <Text style={styles.modalBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  count: { fontSize: 13, color: '#666', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 12 },
  addAllBtn: { padding: 8, backgroundColor: '#E8F5E9', borderRadius: 20 },
  clearBtn: { padding: 8, backgroundColor: '#FFEBEE', borderRadius: 20 },

  list: { padding: 16, paddingBottom: 40 },

  item: {
    flexDirection: 'row', backgroundColor: 'white',
    padding: 15, borderRadius: 15, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  image: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#f0f0f0' },
  info: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  price: { fontSize: 18, fontWeight: 'bold', color: '#19699d' },
  originalPrice: { fontSize: 12, color: '#999', textDecorationLine: 'line-through', marginLeft: 8 },
  stockText: { fontSize: 11, color: '#ff9800', marginBottom: 6 },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  cartBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#19699d', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20, marginRight: 10, gap: 6,
  },
  cartBtnText: { color: 'white', fontSize: 12, fontWeight: '500' },
  removeBtn: { padding: 8 },

  emptyIconContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#f5f5f5', justifyContent: 'center',
    alignItems: 'center', marginBottom: 20,
  },
  emptyText: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
  shopBtn: {
    backgroundColor: '#19699d', paddingHorizontal: 30,
    paddingVertical: 14, borderRadius: 30, elevation: 3,
  },
  shopBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 20, width: '85%', maxHeight: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 15, resizeMode: 'cover' },
  modalName: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 5 },
  modalCategory: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 10 },
  modalPriceContainer: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 10 },
  modalPrice: { fontSize: 22, fontWeight: 'bold', color: '#19699d' },
  modalOriginalPrice: { fontSize: 14, color: '#999', textDecorationLine: 'line-through', marginLeft: 8 },
  modalDescription: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 15, lineHeight: 18 },
  modalSizeContainer: { alignItems: 'center', marginBottom: 15 },
  modalSizeTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  sizeBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  sizeText: { fontSize: 12, color: '#666' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modalBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 8 },
  modalCartBtn: { backgroundColor: '#19699d' },
  modalRemoveBtn: { backgroundColor: '#dc3545' },
  modalBtnText: { color: 'white', fontSize: 14, fontWeight: '500' },
});