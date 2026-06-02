// app/(tabs)/home.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  FlatList, RefreshControl, TextInput, Modal, Alert, Dimensions,
  ActivityIndicator, StatusBar, Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { account, databases, DATABASE_ID, COLLECTIONS } from '../../appwrite/config';
import { Query, ID } from 'appwrite';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 52) / 2;

// Types
interface Product {
  $id?: string;
  name: string;
  price: number;
  discountPrice?: number;
  description?: string;
  categoryId: string;
  sizes: string[];
  colors: string[];
  stock: number;
  images: string[];
  isActive: boolean;
  isFeatured?: boolean;
  categoryName?: string;
}

interface Category { $id: string; name: string; slug: string; image?: string; isActive: boolean; }
interface Banner { $id?: string; title: string; subtitle?: string; image: string; link?: string; order: number; isActive: boolean; }
interface Coupon { $id?: string; code: string; discountPercent: number; expiryDate: string; minPurchase: number; isActive: boolean; }

// Storage Keys
const WISHLIST_KEY = 'wishlist_products';
const CART_KEY = 'cart';
const RECENTLY_VIEWED_KEY = 'recently_viewed';

export default function HomeScreen() {
  const router = useRouter();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [userName, setUserName] = useState('Guest');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerRef = useRef<ScrollView>(null);

  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showCouponsModal, setShowCouponsModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [sizeError, setSizeError] = useState('');
  const [colorError, setColorError] = useState('');

  // Auto-scroll banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => {
        const next = (prev + 1) % banners.length;
        bannerRef.current?.scrollTo({ x: next * (width - 40), animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Get current user ID
  const getCurrentUserId = async () => {
    try {
      const user = await account.get();
      setUserId(user.$id);
      return user.$id;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  };

  // Load wishlist from local storage only (fix 401 error)
  const loadWishlist = async () => {
    try {
      const stored = await AsyncStorage.getItem(WISHLIST_KEY);
      const items: Product[] = stored ? JSON.parse(stored) : [];
      setWishlistIds(items.map(p => p.$id!));
      console.log('✅ Wishlist loaded from local storage:', items.length, 'items');
    } catch (error) {
      console.error('Load wishlist error:', error);
      setWishlistIds([]);
    }
  };

  // Toggle wishlist (save to local storage only)
  const toggleWishlist = async (product: Product) => {
    try {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        Alert.alert('Login Required', 'Please login to add items to wishlist');
        router.push('/(auth)/login');
        return;
      }

      const isInWishlist = wishlistIds.includes(product.$id!);

      if (isInWishlist) {
        // Remove from wishlist
        const stored = await AsyncStorage.getItem(WISHLIST_KEY);
        let items: Product[] = stored ? JSON.parse(stored) : [];
        items = items.filter(p => p.$id !== product.$id);
        await AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
        
        setWishlistIds(prev => prev.filter(id => id !== product.$id));
        Alert.alert('Removed', `${product.name} removed from favourites`);
      } else {
        // Add to wishlist
        const stored = await AsyncStorage.getItem(WISHLIST_KEY);
        let items: Product[] = stored ? JSON.parse(stored) : [];
        items = [product, ...items];
        await AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
        
        setWishlistIds(prev => [product.$id!, ...prev]);
        Alert.alert('Added', `${product.name} added to favourites!`);
      }
    } catch (error) {
      console.error('Toggle wishlist error:', error);
      Alert.alert('Error', 'Failed to update wishlist');
    }
  };

  // Recently viewed
  const addToRecentlyViewed = async (product: Product) => {
    try {
      const stored = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
      let items: Product[] = stored ? JSON.parse(stored) : [];
      items = [product, ...items.filter(p => p.$id !== product.$id)].slice(0, 10);
      await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(items));
      setRecentlyViewed(items);
    } catch (error) {
      console.error('Recently viewed error:', error);
    }
  };

  // Cart functions
  const loadCartCount = async () => {
    try {
      const cart = await AsyncStorage.getItem(CART_KEY);
      const items = cart ? JSON.parse(cart) : [];
      setCartCount(items.reduce((acc: number, i: any) => acc + (i.quantity || 1), 0));
    } catch (error) {
      console.error('Load cart error:', error);
    }
  };

  const addToCart = async (product: Product, size?: string, color?: string) => {
    if (product.stock === 0) {
      Alert.alert('Out of Stock', 'This product is currently out of stock.');
      return;
    }

    if (product.sizes && product.sizes.length > 0 && !size) {
      Alert.alert('Size Required', 'Please select a size before adding to cart.');
      return;
    }

    if (product.colors && product.colors.length > 0 && !color) {
      Alert.alert('Color Required', 'Please select a color before adding to cart.');
      return;
    }

    try {
      const cart = await AsyncStorage.getItem(CART_KEY);
      let items = cart ? JSON.parse(cart) : [];
      const displayPrice = product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price;
      const variantKey = `${product.$id}_${size || ''}_${color || ''}`;
      const existingIndex = items.findIndex((i: any) => i.key === variantKey);

      if (existingIndex !== -1) {
        items[existingIndex].quantity += 1;
      } else {
        items.push({
          key: variantKey,
          id: product.$id,
          name: product.name,
          price: displayPrice,
          originalPrice: product.price,
          image: product.images?.[0] || '',
          size: size || '',
          color: color || '',
          quantity: 1,
        });
      }

      await AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
      await loadCartCount();
      Alert.alert('Added to Cart', `${product.name} added successfully!`);
    } catch (error) {
      console.error('Add to cart error:', error);
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  // Load data from Appwrite
  const loadUserData = async () => {
    try {
      const cached = await AsyncStorage.getItem('currentUser');
      if (cached) {
        const u = JSON.parse(cached);
        setUserName(u.name || 'Guest');
        return;
      }
      const user = await account.get();
      setUserName(user.name || user.email?.split('@')[0] || 'Guest');
      setUserId(user.$id);
    } catch (error) {
      console.error('Load user error:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, [Query.equal('isActive', true), Query.orderDesc('$createdAt')]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.CATEGORIES),
      ]);

      const categoriesList = categoriesRes.documents as unknown as Category[];
      const productsList = (productsRes.documents as unknown as Product[]).map(product => ({
        ...product,
        categoryName: categoriesList.find(c => c.$id === product.categoryId)?.name || 'Other',
        isFeatured: product.isFeatured || false,
      }));

      setProducts(productsList);
      setFilteredProducts(productsList);
      setFeaturedProducts(productsList.filter(p => p.isFeatured).slice(0, 6));
      setTrendingProducts(productsList.slice(0, 6));
      setFlashSaleProducts(productsList.filter(p => p.discountPrice && p.discountPrice < p.price).slice(0, 8));
    } catch (error) {
      console.error('Load products error:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CATEGORIES, [Query.equal('isActive', true), Query.orderAsc('name')]);
      setCategories([{ $id: 'all', name: 'All', slug: 'all', isActive: true }, ...(res.documents as unknown as Category[])]);
    } catch (error) {
      console.error('Load categories error:', error);
      setCategories([
        { $id: 'all', name: 'All', slug: 'all', isActive: true },
        { $id: 'men', name: 'Men', slug: 'men', isActive: true },
        { $id: 'women', name: 'Women', slug: 'women', isActive: true },
      ]);
    }
  };

  const loadBanners = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BANNERS, [Query.equal('isActive', true), Query.orderAsc('order')]);
      if (res.documents.length > 0) {
        setBanners(res.documents as unknown as Banner[]);
      } else {
        setBanners([
          { $id: '1', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', title: 'Summer Sale!', subtitle: 'Up to 70% OFF', order: 1, isActive: true },
          { $id: '2', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800', title: 'New Arrivals', subtitle: 'Shop Now', order: 2, isActive: true },
        ]);
      }
    } catch (error) {
      console.error('Load banners error:', error);
    }
  };

  const loadCoupons = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COUPONS, [Query.equal('isActive', true), Query.greaterThan('expiryDate', new Date().toISOString())]);
      setCoupons(res.documents as unknown as Coupon[]);
    } catch (error) {
      console.error('Load coupons error:', error);
    }
  };

  const loadRecentlyViewed = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
      if (stored) setRecentlyViewed(JSON.parse(stored));
    } catch (error) {
      console.error('Load recently viewed error:', error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadProducts(),
      loadCategories(),
      loadBanners(),
      loadCoupons(),
      loadUserData(),
      loadCartCount(),
      loadWishlist(),
      loadRecentlyViewed(),
    ]);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadAllData(); }, []));

  useEffect(() => {
    let filtered = [...products];
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.categoryName === selectedCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.categoryName?.toLowerCase().includes(query)
      );
    }
    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setSelectedSize('');
    setSelectedColor('');
    setSizeError('');
    setColorError('');
    setModalImageIndex(0);
    setModalVisible(true);
    addToRecentlyViewed(product);
  };

  const getDiscountPercent = (product: Product) => {
    if (product.discountPrice && product.discountPrice < product.price) {
      return Math.round(((product.price - product.discountPrice) / product.price) * 100);
    }
    return 0;
  };

  const getDisplayPrice = (product: Product) => {
    return product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price;
  };

  const copyCouponCode = (code: string) => {
    Alert.alert('Coupon Copied!', `Code: ${code} is ready to use at checkout.`);
  };

  const handleAddToCartFromModal = () => {
    if (!selectedProduct) return;
    
    if (selectedProduct.sizes && selectedProduct.sizes.length > 0 && !selectedSize) {
      setSizeError('Please select a size');
      Alert.alert('Size Required', 'Please select a size before adding to cart.');
      return;
    }
    setSizeError('');
    
    if (selectedProduct.colors && selectedProduct.colors.length > 0 && !selectedColor) {
      setColorError('Please select a color');
      Alert.alert('Color Required', 'Please select a color before adding to cart.');
      return;
    }
    setColorError('');
    
    if (selectedProduct.stock > 0) {
      addToCart(selectedProduct, selectedSize, selectedColor);
      setModalVisible(false);
    }
  };

  const renderGridCard = ({ item }: { item: Product }) => {
    const isInWishlist = wishlistIds.includes(item.$id!);
    const discount = getDiscountPercent(item);
    const displayPrice = getDisplayPrice(item);

    return (
      <TouchableOpacity style={styles.card} onPress={() => openProductModal(item)} activeOpacity={0.9}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/200' }} style={styles.cardImage} />
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.badgeText}>{discount}% OFF</Text>
            </View>
          )}
          {item.stock === 0 && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
          {item.stock > 0 && item.stock <= 10 && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.badgeText}>Only {item.stock} left!</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.wishlistButton, isInWishlist && styles.wishlistButtonActive]}
            onPress={() => toggleWishlist(item)}
          >
            <Ionicons name={isInWishlist ? 'heart' : 'heart-outline'} size={18} color={isInWishlist ? '#FF6B6B' : '#fff'} />
          </TouchableOpacity>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.categoryText}>{item.categoryName}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>৳{displayPrice.toLocaleString()}</Text>
            {discount > 0 && <Text style={styles.oldPrice}>৳{item.price.toLocaleString()}</Text>}
          </View>
          <TouchableOpacity
            style={[styles.addToCartButton, item.stock === 0 && styles.disabledButton]}
            onPress={() => openProductModal(item)}
            disabled={item.stock === 0}
          >
            <Ionicons name="cart-outline" size={14} color="#fff" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHorizontalCard = ({ item }: { item: Product }) => {
    const isInWishlist = wishlistIds.includes(item.$id!);
    const discount = getDiscountPercent(item);
    const displayPrice = getDisplayPrice(item);

    return (
      <TouchableOpacity style={styles.horizontalCard} onPress={() => openProductModal(item)} activeOpacity={0.9}>
        <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/120' }} style={styles.horizontalImage} />
        {discount > 0 && (
          <View style={styles.horizontalDiscountBadge}>
            <Text style={styles.badgeText}>{discount}%</Text>
          </View>
        )}
        <TouchableOpacity style={styles.horizontalWishlistButton} onPress={() => toggleWishlist(item)}>
          <Ionicons name={isInWishlist ? 'heart' : 'heart-outline'} size={14} color={isInWishlist ? '#FF6B6B' : '#bbb'} />
        </TouchableOpacity>
        <View style={styles.horizontalBody}>
          <Text style={styles.horizontalName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.horizontalPrice}>৳{displayPrice.toLocaleString()}</Text>
          {discount > 0 && <Text style={styles.horizontalOldPrice}>৳{item.price.toLocaleString()}</Text>}
          <TouchableOpacity
            style={[styles.horizontalAddButton, item.stock === 0 && styles.disabledButton]}
            onPress={() => openProductModal(item)}
            disabled={item.stock === 0}
          >
            <Text style={styles.horizontalAddText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFlashSaleCard = ({ item }: { item: Product }) => {
    const discount = getDiscountPercent(item);
    return (
      <TouchableOpacity style={styles.flashCard} onPress={() => openProductModal(item)} activeOpacity={0.9}>
        <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/120' }} style={styles.flashImage} />
        {discount > 0 && (
          <View style={styles.flashBadge}>
            <Text style={styles.badgeText}>{discount}% OFF</Text>
          </View>
        )}
        <Text style={styles.flashName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.flashPrice}>৳{getDisplayPrice(item).toLocaleString()}</Text>
        <Text style={styles.flashOldPrice}>৳{item.price.toLocaleString()}</Text>
        <View style={styles.stockBar}>
          <View style={[styles.stockFill, { width: `${Math.min(100, ((50 - item.stock) / 50) * 100)}%` }]} />
        </View>
        <Text style={styles.soldText}>{Math.max(0, 50 - item.stock)} sold</Text>
      </TouchableOpacity>
    );
  };

  const renderCouponCard = ({ item }: { item: Coupon }) => (
    <TouchableOpacity style={styles.couponCard} onPress={() => copyCouponCode(item.code)}>
      <View style={styles.couponLeft}>
        <Text style={styles.couponDiscount}>{item.discountPercent}%</Text>
        <Text style={styles.couponOff}>OFF</Text>
      </View>
      <View style={styles.couponMiddle}>
        <Text style={styles.couponCode}>{item.code}</Text>
        {item.minPurchase > 0 && <Text style={styles.couponMin}>Min: ৳{item.minPurchase}</Text>}
        <Text style={styles.couponExpiry}>Exp: {new Date(item.expiryDate).toLocaleDateString('en-GB')}</Text>
      </View>
      <View style={styles.copyButton}>
        <Text style={styles.copyButtonText}>Copy</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#19699d" />
        <Text style={styles.loadingText}>Loading Smart Fashion...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#19699d" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{userName[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'} 👋</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/favourites')}>
              <Ionicons name="heart-outline" size={22} color="#19699d" />
              {wishlistIds.length > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{wishlistIds.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/cart')}>
              <Ionicons name="cart-outline" size={22} color="#fff" />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#bbb" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#ccc"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Feather name="sliders" size={18} color="#19699d" />
          </TouchableOpacity>
        </View>

        {/* Banners - Fixed size */}
        {banners.length > 0 && (
          <View style={styles.bannerSection}>
            <ScrollView
              ref={bannerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={width - 32}
              onMomentumScrollEnd={(e) => setCurrentBannerIndex(Math.round(e.nativeEvent.contentOffset.x / (width - 32)))}
            >
              {banners.filter(b => b.isActive).sort((a, b) => a.order - b.order).map((banner, index) => (
                <TouchableOpacity key={banner.$id || index} style={styles.bannerCard} activeOpacity={0.95}>
                  <Image source={{ uri: banner.image }} style={styles.bannerImage} />
                  <View style={styles.bannerOverlay}>
                    <Text style={styles.bannerTitle}>{banner.title}</Text>
                    {banner.subtitle && <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>}
                    <View style={styles.shopNowButton}>
                      <Text style={styles.shopNowText}>Shop Now →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {banners.length > 1 && (
              <View style={styles.dotsContainer}>
                {banners.map((_, i) => (
                  <View key={i} style={[styles.dot, currentBannerIndex === i && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Coupons */}
        {coupons.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionEmoji}>🎟️</Text>
                <Text style={styles.sectionTitle}>Special Offers</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCouponsModal(true)}>
                <Text style={styles.seeAllText}>View All ({coupons.length})</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={coupons.slice(0, 5)}
              renderItem={renderCouponCard}
              keyExtractor={(item, index) => item.$id || index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.couponList}
            />
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionEmoji}>📁</Text>
              <Text style={styles.sectionTitle}>Categories</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('./(tabs)/categories')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
            {categories.filter(c => c.isActive).map(cat => (
              <TouchableOpacity
                key={cat.$id}
                style={[styles.categoryChip, selectedCategory === cat.name && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.name)}
              >
                <Text style={[styles.categoryChipText, selectedCategory === cat.name && styles.categoryChipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Flash Sale */}
        {flashSaleProducts.length > 0 && (
          <View style={styles.flashSaleSection}>
            <View style={styles.flashSaleHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionEmoji}>⚡</Text>
                <Text style={[styles.sectionTitle, { color: '#fff' }]}>Flash Sale</Text>
              </View>
            </View>
            <FlatList
              data={flashSaleProducts}
              renderItem={renderFlashSaleCard}
              keyExtractor={(item, index) => `${item.$id}_flash_${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.flashSaleList}
            />
          </View>
        )}

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionEmoji}>✨</Text>
                <Text style={styles.sectionTitle}>Featured</Text>
              </View>
            </View>
            <FlatList
              data={featuredProducts}
              renderItem={renderHorizontalCard}
              keyExtractor={(item, index) => `${item.$id}_featured_${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Trending Products */}
        {trendingProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionEmoji}>🔥</Text>
                <Text style={styles.sectionTitle}>Trending Now</Text>
              </View>
            </View>
            <FlatList
              data={trendingProducts}
              renderItem={renderHorizontalCard}
              keyExtractor={(item, index) => `${item.$id}_trending_${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionEmoji}>👀</Text>
                <Text style={styles.sectionTitle}>Recently Viewed</Text>
              </View>
            </View>
            <FlatList
              data={recentlyViewed}
              renderItem={renderHorizontalCard}
              keyExtractor={(item, index) => `${item.$id}_recent_${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* All Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionEmoji}>🛍️</Text>
              <Text style={styles.sectionTitle}>{searchQuery ? `Results (${filteredProducts.length})` : 'All Products'}</Text>
            </View>
            <Text style={styles.itemCountText}>{filteredProducts.length} items</Text>
          </View>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="search" size={48} color="#e0e0e0" />
              <Text style={styles.emptyText}>No products found</Text>
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedCategory('All'); }}>
                <Text style={styles.resetText}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderGridCard}
              keyExtractor={(item, index) => item.$id || index.toString()}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContainer}
              columnWrapperStyle={styles.gridRow}
            />
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Product Detail Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedProduct && (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={e => setModalImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                  style={styles.modalImageContainer}
                >
                  {(selectedProduct.images?.length > 0 ? selectedProduct.images : ['https://via.placeholder.com/300']).map((img, i) => (
                    <Image key={i} source={{ uri: img }} style={styles.modalImage} />
                  ))}
                </ScrollView>
                {selectedProduct.images?.length > 1 && (
                  <View style={styles.modalDotsContainer}>
                    {selectedProduct.images.map((_, i) => (
                      <View key={i} style={[styles.modalDot, modalImageIndex === i && styles.modalDotActive]} />
                    ))}
                  </View>
                )}
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalWishlistButton} onPress={() => toggleWishlist(selectedProduct)}>
                  <Ionicons name={wishlistIds.includes(selectedProduct.$id!) ? 'heart' : 'heart-outline'} size={20} color={wishlistIds.includes(selectedProduct.$id!) ? '#FF6B6B' : '#333'} />
                </TouchableOpacity>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalTitleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                      <Text style={styles.modalCategory}>{selectedProduct.categoryName}</Text>
                    </View>
                    {selectedProduct.stock > 0 && selectedProduct.stock <= 10 && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentText}>Only {selectedProduct.stock} left!</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.modalPriceRow}>
                    <Text style={styles.modalPrice}>৳{getDisplayPrice(selectedProduct).toLocaleString()}</Text>
                    {getDiscountPercent(selectedProduct) > 0 && (
                      <>
                        <Text style={styles.modalOldPrice}>৳{selectedProduct.price.toLocaleString()}</Text>
                        <View style={styles.modalDiscountBadge}>
                          <Text style={styles.modalDiscountText}>{getDiscountPercent(selectedProduct)}% OFF</Text>
                        </View>
                      </>
                    )}
                  </View>
                  {selectedProduct.description && (
                    <Text style={styles.modalDescription}>{selectedProduct.description}</Text>
                  )}

                  {/* Size Selection */}
                  {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                    <View style={styles.pickerSection}>
                      <Text style={[styles.pickerLabel, sizeError && styles.errorLabel]}>
                        Size: <Text style={[styles.pickerSelected, sizeError && styles.errorText]}>{selectedSize || 'Not Selected'}</Text>
                        {sizeError && <Text style={styles.errorText}> *</Text>}
                      </Text>
                      <View style={styles.pickerRow}>
                        {selectedProduct.sizes.map(sz => (
                          <TouchableOpacity
                            key={sz}
                            style={[styles.sizeChip, selectedSize === sz && styles.sizeChipActive]}
                            onPress={() => {
                              setSelectedSize(sz);
                              setSizeError('');
                            }}
                          >
                            <Text style={[styles.sizeChipText, selectedSize === sz && styles.sizeChipTextActive]}>{sz}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {sizeError ? <Text style={styles.errorHelperText}>{sizeError}</Text> : null}
                    </View>
                  )}

                  {/* Color Selection */}
                  {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                    <View style={styles.pickerSection}>
                      <Text style={[styles.pickerLabel, colorError && styles.errorLabel]}>
                        Color: <Text style={[styles.pickerSelected, colorError && styles.errorText]}>{selectedColor || 'Not Selected'}</Text>
                        {colorError && <Text style={styles.errorText}> *</Text>}
                      </Text>
                      <View style={styles.pickerRow}>
                        {selectedProduct.colors.map(col => (
                          <TouchableOpacity
                            key={col}
                            style={[styles.colorCircle, { backgroundColor: col.toLowerCase() }, selectedColor === col && styles.colorCircleActive]}
                            onPress={() => {
                              setSelectedColor(col);
                              setColorError('');
                            }}
                          />
                        ))}
                      </View>
                      {colorError ? <Text style={styles.errorHelperText}>{colorError}</Text> : null}
                    </View>
                  )}
                  
                  {(!selectedProduct.sizes || selectedProduct.sizes.length === 0) && 
                   (!selectedProduct.colors || selectedProduct.colors.length === 0) && (
                    <Text style={styles.noOptionsText}>No size/color options available</Text>
                  )}
                  
                  <View style={{ height: 20 }} />
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalWishlistAction, wishlistIds.includes(selectedProduct.$id!) && styles.modalWishlistActionActive]}
                    onPress={() => toggleWishlist(selectedProduct)}
                  >
                    <Ionicons name={wishlistIds.includes(selectedProduct.$id!) ? 'heart' : 'heart-outline'} size={20} color={wishlistIds.includes(selectedProduct.$id!) ? '#FF6B6B' : '#666'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalAddToCartButton, selectedProduct.stock === 0 && styles.disabledButton]}
                    onPress={handleAddToCartFromModal}
                    disabled={selectedProduct.stock === 0}
                  >
                    <Ionicons name="cart-outline" size={18} color="#fff" />
                    <Text style={styles.modalAddToCartText}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Coupons Modal */}
      <Modal animationType="slide" transparent visible={showCouponsModal} onRequestClose={() => setShowCouponsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.couponModalContent}>
            <View style={styles.couponModalHeader}>
              <Text style={styles.couponModalTitle}>🎟️ All Coupons</Text>
              <TouchableOpacity onPress={() => setShowCouponsModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.couponModalList}>
              {coupons.map(coupon => (
                <TouchableOpacity key={coupon.$id} style={styles.couponModalCard} onPress={() => copyCouponCode(coupon.code)}>
                  <View style={styles.couponLeft}>
                    <Text style={styles.couponDiscount}>{coupon.discountPercent}%</Text>
                    <Text style={styles.couponOff}>OFF</Text>
                  </View>
                  <View style={styles.couponMiddle}>
                    <Text style={styles.couponCode}>{coupon.code}</Text>
                    {coupon.minPurchase > 0 && <Text style={styles.couponMin}>Min: ৳{coupon.minPurchase}</Text>}
                    <Text style={styles.couponExpiry}>Exp: {new Date(coupon.expiryDate).toLocaleDateString('en-GB')}</Text>
                  </View>
                  <View style={styles.copyButton}>
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f9' },
  loadingText: { marginTop: 14, fontSize: 14, color: '#888' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 16, backgroundColor: '#fff' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#19699d', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  greetingContainer: { marginLeft: 10 },
  greeting: { fontSize: 12, color: '#aaa' },
  userName: { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { position: 'relative', padding: 8 },
  cartButton: { width: 42, height: 42, backgroundColor: '#19699d', borderRadius: 21, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cartBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF6B6B', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f6f8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  filterButton: { width: 42, height: 42, backgroundColor: '#e8f0f8', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  bannerSection: { paddingTop: 16, paddingHorizontal: 16 },
  bannerCard: { width: width - 32, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, marginRight: 16 },
  bannerImage: { width: width - 32, height: 190, resizeMode: 'cover' },
  bannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.35)' },
  bannerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  bannerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  shopNowButton: { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  shopNowText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ddd' },
  dotActive: { width: 18, backgroundColor: '#19699d' },

  section: { paddingHorizontal: 20, paddingTop: 22 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionEmoji: { fontSize: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e' },
  seeAllText: { fontSize: 13, color: '#19699d', fontWeight: '600' },
  itemCountText: { fontSize: 12, color: '#bbb' },

  couponList: { paddingRight: 20 },
  couponCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginRight: 12, width: 260, elevation: 2, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#FF6B6B' },
  couponLeft: { alignItems: 'center', marginRight: 12, minWidth: 44 },
  couponDiscount: { fontSize: 20, fontWeight: '900', color: '#FF6B6B', lineHeight: 22 },
  couponOff: { fontSize: 10, fontWeight: '700', color: '#FF6B6B' },
  couponMiddle: { flex: 1 },
  couponCode: { fontSize: 14, fontWeight: '800', color: '#222', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  couponMin: { fontSize: 10, color: '#aaa', marginTop: 2 },
  couponExpiry: { fontSize: 10, color: '#bbb', marginTop: 2 },
  copyButton: { backgroundColor: '#19699d', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  copyButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  flashSaleSection: { marginTop: 22, backgroundColor: '#1a1a2e', paddingTop: 16, paddingBottom: 20 },
  flashSaleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  flashSaleList: { paddingHorizontal: 16, paddingRight: 20 },
  flashCard: { width: 140, backgroundColor: '#fff', borderRadius: 14, padding: 10, marginRight: 12, elevation: 3 },
  flashImage: { width: '100%', height: 130, borderRadius: 10, resizeMode: 'cover', backgroundColor: '#f5f5f5' },
  flashBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#FF6B6B', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  flashName: { fontSize: 12, fontWeight: '600', color: '#333', marginTop: 8 },
  flashPrice: { fontSize: 14, fontWeight: '800', color: '#FF6B6B', marginTop: 2 },
  flashOldPrice: { fontSize: 11, color: '#bbb', textDecorationLine: 'line-through' },
  stockBar: { height: 4, backgroundColor: '#f0f0f0', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  stockFill: { height: 4, backgroundColor: '#FF6B6B', borderRadius: 2 },
  soldText: { fontSize: 10, color: '#aaa', marginTop: 3 },

  categoriesList: { paddingRight: 20 },
  categoryChip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 24, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#e8e8e8', elevation: 1 },
  categoryChipActive: { backgroundColor: '#19699d', borderColor: '#19699d' },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  categoryChipTextActive: { color: '#fff' },

  horizontalList: { paddingRight: 20 },
  horizontalCard: { width: 165, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginRight: 12, elevation: 2 },
  horizontalImage: { width: '100%', height: 130, resizeMode: 'cover', backgroundColor: '#f5f5f5' },
  horizontalDiscountBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#FF6B6B', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  horizontalWishlistButton: { position: 'absolute', top: 6, right: 6, backgroundColor: '#fff', padding: 5, borderRadius: 12, elevation: 2 },
  horizontalBody: { padding: 10 },
  horizontalName: { fontSize: 12, fontWeight: '700', color: '#222' },
  horizontalPrice: { fontSize: 14, fontWeight: '900', color: '#19699d', marginTop: 4 },
  horizontalOldPrice: { fontSize: 10, color: '#bbb', textDecorationLine: 'line-through', marginBottom: 6 },
  horizontalAddButton: { backgroundColor: '#19699d', paddingVertical: 7, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  horizontalAddText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  gridContainer: { paddingBottom: 10 },
  gridRow: { justifyContent: 'space-between' },
  card: { width: CARD_WIDTH, backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, elevation: 2, overflow: 'hidden' },
  imageContainer: { position: 'relative' },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover', backgroundColor: '#f5f5f5' },
  discountBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#FF6B6B', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  lowStockBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#FFA500', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  outOfStockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  outOfStockText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  wishlistButton: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.4)', padding: 7, borderRadius: 20 },
  wishlistButtonActive: { backgroundColor: 'rgba(255,107,107,0.2)' },
  cardBody: { padding: 10 },
  productName: { fontSize: 13, fontWeight: '700', color: '#222', marginBottom: 2 },
  categoryText: { fontSize: 10, color: '#bbb', marginBottom: 5 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 },
  price: { fontSize: 15, fontWeight: '900', color: '#19699d' },
  oldPrice: { fontSize: 10, color: '#ccc', textDecorationLine: 'line-through' },
  addToCartButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#19699d', paddingVertical: 8, borderRadius: 10, gap: 5 },
  disabledButton: { backgroundColor: '#ccc' },
  addToCartText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 16, color: '#ccc', marginTop: 14, fontWeight: '600' },
  resetText: { fontSize: 14, color: '#19699d', marginTop: 10, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingBottom: Platform.OS === 'ios' ? 30 : 16 },
  modalImageContainer: { height: 280 },
  modalImage: { width, height: 280, resizeMode: 'cover' },
  modalCloseButton: { position: 'absolute', top: 14, left: 14, backgroundColor: '#fff', padding: 8, borderRadius: 20, elevation: 5 },
  modalWishlistButton: { position: 'absolute', top: 14, right: 14, backgroundColor: '#fff', padding: 8, borderRadius: 20, elevation: 5 },
  modalBody: { paddingHorizontal: 20, paddingTop: 14 },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  modalProductName: { fontSize: 20, fontWeight: '800', color: '#1a1a2e', flex: 1 },
  modalCategory: { fontSize: 12, color: '#bbb', marginTop: 2 },
  urgentBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#FFA500' },
  urgentText: { fontSize: 11, color: '#FFA500', fontWeight: '700' },
  modalPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  modalPrice: { fontSize: 24, fontWeight: '900', color: '#19699d' },
  modalOldPrice: { fontSize: 14, color: '#bbb', textDecorationLine: 'line-through' },
  modalDiscountBadge: { backgroundColor: '#FFE8E8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  modalDiscountText: { color: '#FF6B6B', fontSize: 12, fontWeight: '700' },
  modalDescription: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 16 },
  pickerSection: { marginBottom: 16 },
  pickerLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 10 },
  pickerSelected: { color: '#19699d', fontWeight: '800' },
  errorLabel: { color: '#FF6B6B' },
  errorText: { color: '#FF6B6B' },
  errorHelperText: { fontSize: 12, color: '#FF6B6B', marginTop: 5 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f5f5f5', borderWidth: 1.5, borderColor: '#e8e8e8' },
  sizeChipActive: { backgroundColor: '#19699d', borderColor: '#19699d' },
  sizeChipText: { fontSize: 13, fontWeight: '700', color: '#555' },
  sizeChipTextActive: { color: '#fff' },
  colorCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#e8e8e8' },
  colorCircleActive: { borderColor: '#19699d', borderWidth: 3 },
  noOptionsText: { fontSize: 14, color: '#999', textAlign: 'center', marginVertical: 10 },
  modalActions: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, gap: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  modalWishlistAction: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#e8e8e8' },
  modalWishlistActionActive: { backgroundColor: '#FFE8E8', borderColor: '#FF6B6B' },
  modalAddToCartButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#19699d', paddingVertical: 14, borderRadius: 14, gap: 8 },
  modalAddToCartText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  modalDotsContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 8, gap: 6 },
  modalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ddd' },
  modalDotActive: { width: 18, backgroundColor: '#19699d' },

  couponModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  couponModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  couponModalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e' },
  couponModalList: { paddingHorizontal: 16, paddingTop: 12 },
  couponModalCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, elevation: 2, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#FF6B6B' },
});