// app/(tabs)/favourites.tsx  ← এই path এ রাখুন
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Image, Alert, RefreshControl, Modal, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import { account } from '../../appwrite/config';

interface FavouriteItem {
  id: string;
  name: string;
  price: number;
  image: string;
  discountPrice?: number;
  stock?: number;
}

// null = এখনো check করা হয়নি (loading)
// true  = logged in
// false = logged out
type LoginState = null | boolean;

export default function FavouritesScreen() {
  const router = useRouter();
  const [favourites, setFavourites]     = useState<FavouriteItem[]>([]);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedItem, setSelectedItem] = useState<FavouriteItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loginState, setLoginState]     = useState<LoginState>(null); // null = loading

  // ── Data Loading ──────────────────────────────────────────────────

  const loadFavourites = async () => {
    try {
      // Auth check
      try {
        await account.get();
        setLoginState(true);
      } catch {
        setLoginState(false);
        setFavourites([]);
        return;
      }

      const stored = await AsyncStorage.getItem('favourites');
      setFavourites(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Error loading favourites:', error);
      setFavourites([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoginState(null); // reset to loading on every focus
      loadFavourites();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavourites();
    setRefreshing(false);
  };

  // ── Actions ───────────────────────────────────────────────────────

  const removeFromFavourites = async (id: string, name: string) => {
    Alert.alert('Remove Item', `Remove "${name}" from favourites?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const updated = favourites.filter(item => item.id !== id);
          setFavourites(updated);
          await AsyncStorage.setItem('favourites', JSON.stringify(updated));
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
          setFavourites([]);
          await AsyncStorage.removeItem('favourites');
        },
      },
    ]);
  };

  const addToCart = async (item: FavouriteItem) => {
    try {
      const cart = await AsyncStorage.getItem('cart');
      const cartItems: any[] = cart ? JSON.parse(cart) : [];
      const existing = cartItems.find(i => i.id === item.id);

      if (existing) {
        existing.quantity += 1;
      } else {
        cartItems.push({ id: item.id, name: item.name, price: item.price, image: item.image, quantity: 1 });
      }

      await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
      Alert.alert('Added!', `${item.name} added to cart`, [
        { text: 'OK', style: 'cancel' },
        { text: 'Go to Cart', onPress: () => router.push('/cart') },
      ]);
    } catch {
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
              const existing = cartItems.find(i => i.id === item.id);
              if (existing) {
                existing.quantity += 1;
              } else {
                cartItems.push({ id: item.id, name: item.name, price: item.price, image: item.image, quantity: 1 });
              }
            }

            await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
            Alert.alert('Success', `Added ${favourites.length} items to cart!`);
          } catch {
            Alert.alert('Error', 'Failed to add items to cart');
          }
        },
      },
    ]);
  };

  // ── Render Helpers ────────────────────────────────────────────────

  const renderItem = ({ item }: { item: FavouriteItem }) => (
    <TouchableOpacity style={styles.item} onPress={() => { setSelectedItem(item); setModalVisible(true); }} activeOpacity={0.7}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>৳{item.price.toLocaleString()}</Text>
          {item.discountPrice && item.discountPrice < item.price && (
            <Text style={styles.originalPrice}>৳{item.discountPrice.toLocaleString()}</Text>
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
          <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromFavourites(item.id, item.name)}>
            <Feather name="trash-2" size={16} color="#dc3545" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ── Empty / Auth States ───────────────────────────────────────────

  if (loginState === null) {
    // Loading state — auth check চলছে
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#19699d" />
      </View>
    );
  }

  if (loginState === false) {
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
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/login')}>
            <Text style={styles.shopBtnText}>Login / Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main Render ───────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
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

      {/* List or Empty */}
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
          keyExtractor={item => item.id}
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
                <Image source={{ uri: selectedItem.image }} style={styles.modalImage} />
                <Text style={styles.modalName}>{selectedItem.name}</Text>
                <View style={styles.modalPriceContainer}>
                  <Text style={styles.modalPrice}>৳{selectedItem.price.toLocaleString()}</Text>
                  {selectedItem.discountPrice && selectedItem.discountPrice < selectedItem.price && (
                    <Text style={styles.modalOriginalPrice}>৳{selectedItem.discountPrice.toLocaleString()}</Text>
                  )}
                </View>
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
                    onPress={() => { removeFromFavourites(selectedItem.id, selectedItem.name); setModalVisible(false); }}
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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f8f9fa' },
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title:         { fontSize: 24, fontWeight: 'bold', color: '#333' },
  count:         { fontSize: 13, color: '#666', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 12 },
  addAllBtn:     { padding: 8, backgroundColor: '#E8F5E9', borderRadius: 20 },
  clearBtn:      { padding: 8, backgroundColor: '#FFEBEE', borderRadius: 20 },

  list: { padding: 16, paddingBottom: 40 },

  item: {
    flexDirection: 'row', backgroundColor: 'white',
    padding: 15, borderRadius: 15, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  image:          { width: 100, height: 100, borderRadius: 12, backgroundColor: '#f0f0f0' },
  info:           { flex: 1, marginLeft: 15, justifyContent: 'center' },
  name:           { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  price:          { fontSize: 18, fontWeight: 'bold', color: '#19699d' },
  originalPrice:  { fontSize: 12, color: '#999', textDecorationLine: 'line-through', marginLeft: 8 },
  stockText:      { fontSize: 11, color: '#ff9800', marginBottom: 6 },
  actionRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  cartBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#19699d', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20, marginRight: 10, gap: 6,
  },
  cartBtnText: { color: 'white', fontSize: 12, fontWeight: '500' },
  removeBtn:   { padding: 8 },

  emptyIconContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#f5f5f5', justifyContent: 'center',
    alignItems: 'center', marginBottom: 20,
  },
  emptyText:    { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
  shopBtn: {
    backgroundColor: '#19699d', paddingHorizontal: 30,
    paddingVertical: 14, borderRadius: 30, elevation: 3,
  },
  shopBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent:        { backgroundColor: 'white', borderRadius: 20, width: '85%', padding: 20, alignItems: 'center' },
  modalHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 15 },
  modalTitle:          { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalImage:          { width: 200, height: 200, borderRadius: 12, marginBottom: 15 },
  modalName:           { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  modalPriceContainer: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  modalPrice:          { fontSize: 22, fontWeight: 'bold', color: '#19699d' },
  modalOriginalPrice:  { fontSize: 14, color: '#999', textDecorationLine: 'line-through', marginLeft: 8 },
  modalButtons:        { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  modalBtn:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 8 },
  modalCartBtn:        { backgroundColor: '#19699d' },
  modalRemoveBtn:      { backgroundColor: '#dc3545' },
  modalBtnText:        { color: 'white', fontSize: 14, fontWeight: '500' },
});
