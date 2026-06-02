// app/(tabs)/cart.tsx 

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, Alert, Modal, TextInput, ScrollView, ActivityIndicator,
  RefreshControl, Animated, Dimensions, Platform,
  StatusBar
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { account, databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../../appwrite/config';

const { width, height } = Dimensions.get('window');

const THEME = {
  primary: '#E2136E',
  primaryDark: '#C0115E',
  surface: '#0D1B2A',
  card: '#1A1A2E',
  cardLight: '#16213E',
  text: '#FFFFFF',
  textMuted: '#8899BB',
  textDim: '#4A5568',
  border: '#1E2D4A',
  success: '#00D68F',
  warning: '#FFB800',
  glass: 'rgba(255,255,255,0.06)',
};

interface CartItem {
  id: string; name: string; price: number; quantity: number;
  image: string; discountPrice?: number; stock?: number; selected?: boolean;
}

interface AppliedCoupon {
  code: string;
  discountPercent: number;
  minOrder: number;
  description: string;
  isActive: boolean;
  type?: string;
}

interface Settings {
  deliveryCharge: number; minOrderForFreeDelivery: number; currency: string;
  taxPercentage: number; siteName: string; contactNumber: string;
}

export default function CartScreen() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [step, setStep] = useState<'cart' | 'address' | 'payment'>('cart');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    deliveryCharge: 60, minOrderForFreeDelivery: 800,
    currency: '৳', taxPercentage: 0, siteName: 'MyShop', contactNumber: '01XXXXXXXXX',
  });
  
  // Coupons from Appwrite
  const [availableCouponsFromDB, setAvailableCouponsFromDB] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // QR States
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrStep, setQrStep] = useState<'generate' | 'waiting' | 'success'>('generate');
  const [paymentLink, setPaymentLink] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');
  
  // OTP Modal
  const [otpVisible, setOtpVisible] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  const [shippingAddress, setShippingAddress] = useState({
    fullName: '', phone: '', address: '', city: 'Sylhet', postalCode: '', landmark: '',
  });

  // Load coupons from Appwrite
  const loadCouponsFromDB = async () => {
    setLoadingCoupons(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.COUPONS,
        [
          Query.equal('isActive', [true]),
          Query.orderAsc('code')
        ]
      );
      
      const today = new Date().toISOString().split('T')[0];
      const validCoupons = response.documents.filter((doc: any) => {
        return doc.validUntil >= today;
      });
      
      setAvailableCouponsFromDB(validCoupons);
    } catch (error: any) {
      console.error('Error loading coupons:', error);
      setAvailableCouponsFromDB([]);
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, useNativeDriver: true }),
    ]).start();
    loadCouponsFromDB();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SETTINGS, [Query.limit(1)]);
      if (response.documents.length > 0) {
        const doc = response.documents[0];
        setSettings({
          deliveryCharge: doc.deliveryCharge || 60,
          minOrderForFreeDelivery: doc.minOrderForFreeDelivery || 800,
          currency: doc.currency || '৳',
          taxPercentage: doc.taxPercentage || 0,
          siteName: doc.siteName || 'MyShop',
          contactNumber: doc.contactNumber || '01XXXXXXXXX',
        });
      }
    } catch (error) { console.error('Settings error:', error); }
  };

  const loadCart = async () => {
    try {
      const cart = await AsyncStorage.getItem('cart');
      if (cart) {
        let parsed = JSON.parse(cart);
        parsed = parsed.map((item: CartItem) => ({ ...item, selected: item.selected !== undefined ? item.selected : true }));
        setCartItems(parsed);
      }
    } catch (error) { console.error('Cart error:', error); }
  };

  useFocusEffect(useCallback(() => { loadCart(); loadSettings(); }, []));

  const toggleSelectItem = async (id: string) => {
    const updated = cartItems.map(item => item.id === id ? { ...item, selected: !item.selected } : item);
    setCartItems(updated);
    await AsyncStorage.setItem('cart', JSON.stringify(updated));
    if (appliedCoupon && calculateSubtotal(getSelectedItems(updated)) < (appliedCoupon.minOrder || 0)) { removeCoupon(); }
  };

  const toggleSelectAll = async () => {
    const allSelected = cartItems.every(item => item.selected);
    const updated = cartItems.map(item => ({ ...item, selected: !allSelected }));
    setCartItems(updated);
    await AsyncStorage.setItem('cart', JSON.stringify(updated));
  };

  const getSelectedItems = (items: CartItem[]) => items.filter(item => item.selected);

  const updateQuantity = async (id: string, change: number) => {
    const updated = cartItems.map(item => {
      if (item.id === id && item.selected) {
        const newQty = item.quantity + change;
        if (newQty < 1) return item;
        if (item.stock && newQty > item.stock) { Alert.alert('Out of Stock', `Only ${item.stock} items available`); return item; }
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setCartItems(updated);
    await AsyncStorage.setItem('cart', JSON.stringify(updated));
    if (appliedCoupon && calculateSubtotal(getSelectedItems(updated)) < (appliedCoupon.minOrder || 0)) { removeCoupon(); }
  };

  const removeItem = async (id: string) => {
    Alert.alert('Remove Item', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const updated = cartItems.filter(item => item.id !== id);
          setCartItems(updated);
          await AsyncStorage.setItem('cart', JSON.stringify(updated));
        }
      }
    ]);
  };

  const calculateSubtotal = (items: CartItem[]) =>
    items.reduce((sum, item) => sum + ((item.discountPrice || item.price) * item.quantity), 0);

  const selectedItems = getSelectedItems(cartItems);
  const selectedCount = selectedItems.length;
  const subtotal = calculateSubtotal(selectedItems);
  const deliveryFee = subtotal > settings.minOrderForFreeDelivery ? 0 : settings.deliveryCharge;
  const tax = (subtotal * settings.taxPercentage) / 100;
  
  // Calculate discount based on coupon type
  const discount = appliedCoupon ? (
    appliedCoupon.type === 'percentage' 
      ? (appliedCoupon.discountPercent * subtotal) / 100 
      : Math.min(appliedCoupon.discountPercent, subtotal)
  ) : 0;
  
  const total = subtotal + deliveryFee + tax - discount;

  // Apply coupon from Appwrite
  const applyCouponFromDB = async (code: string) => {
    if (selectedCount === 0) {
      setCouponError('Please select at least one item');
      return;
    }
    
    if (!code.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.COUPONS,
        [
          Query.equal('code', [code.toUpperCase()]),
          Query.equal('isActive', [true])
        ]
      );
      
      if (response.documents.length === 0) {
        setCouponError('Invalid coupon code');
        return;
      }
      
      const coupon = response.documents[0];
      
      // Expiry check
      const today = new Date().toISOString().split('T')[0];
      if (coupon.validUntil < today) {
        setCouponError('Coupon has expired');
        return;
      }
      
      // Min order check
      const minOrder = coupon.minOrderAmount || 0;
      if (subtotal < minOrder) {
        setCouponError(`Minimum order ৳${minOrder.toLocaleString()} required`);
        return;
      }
      
      // Usage limit check
      if (coupon.usageLimit > 0 && (coupon.usedCount || 0) >= coupon.usageLimit) {
        setCouponError('Coupon usage limit reached');
        return;
      }
      
      const appliedCouponData = {
        code: coupon.code,
        discountPercent: coupon.discount,
        minOrder: coupon.minOrderAmount || 0,
        description: coupon.description || (coupon.type === 'percentage' ? `${coupon.discount}% OFF` : `৳${coupon.discount} OFF`),
        isActive: true,
        type: coupon.type,
      };
      
      setAppliedCoupon(appliedCouponData);
      setCouponError('');
      setShowCouponInput(false);
      
      if (coupon.type === 'percentage') {
        Alert.alert('✅ Applied!', `${coupon.discount}% discount applied!`);
      } else {
        Alert.alert('✅ Applied!', `৳${coupon.discount} discount applied!`);
      }
      
      setCouponCode('');
      
    } catch (error: any) {
      console.error('Error applying coupon:', error);
      setCouponError('Failed to verify coupon');
    }
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponCode(''); };

  const handleNextToAddress = () => {
    if (selectedCount === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item');
      return;
    }
    setStep('address');
  };

  const handleAddressSubmit = () => {
    if (!shippingAddress.fullName.trim()) { Alert.alert('Error', 'Please enter your full name'); return; }
    if (!shippingAddress.phone.trim() || shippingAddress.phone.length < 11) { Alert.alert('Error', 'Enter a valid 11-digit phone number'); return; }
    if (!shippingAddress.address.trim()) { Alert.alert('Error', 'Please enter your delivery address'); return; }
    if (shippingAddress.city !== 'Sylhet') { Alert.alert('Error', 'Currently we only deliver to Sylhet city'); return; }
    setStep('payment');
  };

  // Generate QR payment
  const generateQRPayment = () => {
    const orderId = 'ORD_' + Date.now();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const qrData = JSON.stringify({
      orderId: orderId,
      otp: otp,
      amount: Math.round(total)
    });

    setCurrentOrderId(orderId);
    setGeneratedOtp(otp);
    setPaymentLink(qrData);
    setQrStep('generate');
    setQrModalVisible(true);
  };

  const showOtpInput = () => {
    setQrModalVisible(false);
    setEnteredOtp('');
    setOtpVisible(true);
  };

  const verifyOtp = () => {
    if (enteredOtp === generatedOtp) {
      setOtpVisible(false);
      setQrStep('success');
      Animated.spring(successScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
      
      setTimeout(() => {
        placeOrder();
        setQrStep('generate');
      }, 2000);
    } else {
      Alert.alert('❌ Invalid OTP', 'The OTP you entered is incorrect. Please try again.');
      setEnteredOtp('');
    }
  };

  const placeOrder = async () => {
    setLoading(true);
    try {
      const user = await account.get();
      const orderData = {
        userId: user.$id, userEmail: user.email,
        customerName: shippingAddress.fullName, phone: shippingAddress.phone,
        address: shippingAddress.address,
        shippingAddress: `${shippingAddress.address}, ${shippingAddress.city}${shippingAddress.postalCode ? ', ' + shippingAddress.postalCode : ''}`,
        items: JSON.stringify(selectedItems.map((item: CartItem) => ({
          productId: item.id, name: item.name,
          price: item.discountPrice || item.price, quantity: item.quantity, image: item.image
        }))),
        subtotal, deliveryFee, discount, totalAmount: total,
        paymentStatus: 'completed', orderStatus: 'pending',
        paymentMethod: 'bkash_qr',
        couponCode: appliedCoupon?.code || null,
        couponDiscount: appliedCoupon?.discountPercent || null,
        trackingNumber: null, courierName: null,
        notes: shippingAddress.landmark ? `Landmark: ${shippingAddress.landmark}` : null,
        bkashTransactionId: currentOrderId,
      };

      await databases.createDocument(DATABASE_ID, COLLECTIONS.ORDERS, ID.unique(), orderData);

      const remaining = cartItems.filter(item => !item.selected);
      await AsyncStorage.setItem('cart', JSON.stringify(remaining));
      setCartItems(remaining);
      setStep('cart');
      setShippingAddress({ fullName: '', phone: '', address: '', city: 'Sylhet', postalCode: '', landmark: '' });
      setAppliedCoupon(null);

      Alert.alert(
        '🎉 Order Placed!',
        `Your order has been placed successfully!\nTotal: ${settings.currency}${total.toLocaleString()}\n\nWe'll contact you at ${shippingAddress.phone}`,
        [{ text: 'OK', onPress: () => router.push('/(tabs)/profile') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to place order. Please try again.');
    } finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadCart(); await loadSettings(); await loadCouponsFromDB(); setRefreshing(false); };

  // ─── OTP Input Modal ─────────────────────────────────────────────────
  const renderOtpModal = () => (
    <Modal animationType="fade" transparent visible={otpVisible}
      onRequestClose={() => setOtpVisible(false)}>
      <View style={styles.otpModalOverlay}>
        <View style={styles.otpCard}>
          <View style={styles.otpIconWrap}>
            <LinearGradient colors={[THEME.primary, THEME.primaryDark]} style={styles.otpIconCircle}>
              <Ionicons name="key-outline" size={32} color="#fff" />
            </LinearGradient>
          </View>
          
          <Text style={styles.otpTitle}>Enter OTP</Text>
          <Text style={styles.otpSubtitle}>Please enter the 6-digit OTP</Text>
          
          <TextInput
            style={styles.otpInput}
            placeholder="000000"
            placeholderTextColor={THEME.textDim}
            keyboardType="number-pad"
            maxLength={6}
            value={enteredOtp}
            onChangeText={setEnteredOtp}
            autoFocus
          />
          
          <TouchableOpacity 
            style={[styles.verifyOtpBtn, !enteredOtp && styles.verifyOtpBtnDisabled]}
            onPress={verifyOtp}
            disabled={!enteredOtp}>
            <LinearGradient colors={[THEME.primary, THEME.primaryDark]} style={styles.verifyOtpGrad}>
              <Text style={styles.verifyOtpText}>Verify OTP</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelOtpBtn}
            onPress={() => setOtpVisible(false)}>
            <Text style={styles.cancelOtpText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ─── QR Modal ─────────────────────────────────────────────────────────
  const renderQRModal = () => (
    <Modal animationType="slide" transparent visible={qrModalVisible}
      onRequestClose={() => { setQrModalVisible(false); setQrStep('generate'); }}>
      <View style={styles.modalBg}>
        <View style={styles.qrSheet}>
          <View style={styles.sheetHandle} />

          {qrStep === 'generate' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.qrSheetHeader}>
                <View>
                  <View style={styles.qrHeaderBadge}>
                    <Text style={styles.qrHeaderBadgeText}>BKASH QR</Text>
                  </View>
                  <Text style={styles.qrHeaderTitle}>Scan to Pay</Text>
                </View>
                <TouchableOpacity onPress={() => setQrModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.qrAmountRow}>
                <Text style={styles.qrAmountLabel}>Total Amount</Text>
                <Text style={styles.qrAmountValue}>{settings.currency}{Math.round(total).toLocaleString()}</Text>
              </View>

              <View style={styles.qrCodeWrapper}>
                <View style={styles.qrCodeContainer}>
                  <QRCode
                    value={paymentLink}
                    size={200}
                    color="#0F0F1A"
                    backgroundColor="#FFFFFF"
                    quietZone={8}
                  />
                </View>
              </View>

              <View style={styles.instructionsBox}>
                <Text style={styles.instructionsTitle}>How to pay:</Text>
                <View style={styles.instructionItem}>
                  <View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>1</Text></View>
                  <Text style={styles.instructionText}>Open bKash App</Text>
                </View>
                <View style={styles.instructionItem}>
                  <View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>2</Text></View>
                  <Text style={styles.instructionText}>Tap on "Scan QR"</Text>
                </View>
                <View style={styles.instructionItem}>
                  <View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>3</Text></View>
                  <Text style={styles.instructionText}>Scan this QR code</Text>
                </View>
                <View style={styles.instructionItem}>
                  <View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>4</Text></View>
                  <Text style={styles.instructionText}>Enter PIN to confirm payment</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.otpButton}
                onPress={showOtpInput}>
                <LinearGradient colors={[THEME.success, '#00A86B']} style={styles.otpButtonGrad}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                  <Text style={styles.otpButtonText}>I have received OTP</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.noteBox}>
                <Ionicons name="information-circle" size={16} color={THEME.warning} />
                <Text style={styles.noteText}>After payment, you will receive an OTP on your bKash registered mobile number</Text>
              </View>
            </ScrollView>
          )}

          {qrStep === 'success' && (
            <View style={styles.successContainer}>
              <Animated.View style={[styles.successIconWrap, { transform: [{ scale: successScale }] }]}>
                <LinearGradient colors={[THEME.success, '#00A86B']} style={styles.successIconCircle}>
                  <Ionicons name="checkmark" size={52} color="#fff" />
                </LinearGradient>
              </Animated.View>
              <Animated.Text style={[styles.successTitle, { transform: [{ scale: successScale }] }]}>Payment Successful!</Animated.Text>
              <Text style={styles.successAmount}>{settings.currency}{Math.round(total).toLocaleString()}</Text>
              <Text style={styles.successSub}>Placing your order...</Text>
              <ActivityIndicator color={THEME.primary} style={{ marginTop: 20 }} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderItem = ({ item }: { item: CartItem; index: number }) => (
    <Animated.View style={[styles.cartItem, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity onPress={() => toggleSelectItem(item.id)} style={styles.checkbox}>
        <View style={[styles.checkboxInner, item.selected && styles.checkboxChecked]}>
          {item.selected && <Ionicons name="checkmark" size={11} color="#fff" />}
        </View>
      </TouchableOpacity>
      {item.image ? <Image source={{ uri: item.image }} style={styles.itemImage} /> :
        <View style={[styles.itemImage, styles.imageFallback]}><Ionicons name="image-outline" size={26} color={THEME.textDim} /></View>}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.priceRow}>
          {item.discountPrice ? (
            <>
              <Text style={styles.itemPriceDiscount}>{settings.currency}{item.discountPrice.toLocaleString()}</Text>
              <Text style={styles.itemPriceOriginal}>{settings.currency}{item.price.toLocaleString()}</Text>
            </>
          ) : <Text style={styles.itemPrice}>{settings.currency}{item.price.toLocaleString()}</Text>}
        </View>
        <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
          <Ionicons name="trash-outline" size={12} color={THEME.primary} /><Text style={styles.removeBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
      {item.selected && (
        <View style={styles.qtyControl}>
          <TouchableOpacity style={[styles.qtyBtn, item.quantity === 1 && styles.qtyBtnDisabled]} onPress={() => updateQuantity(item.id, -1)} disabled={item.quantity === 1}>
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{item.quantity}</Text>
          <TouchableOpacity style={[styles.qtyBtn, !!(item.stock && item.quantity >= item.stock) && styles.qtyBtnDisabled]} onPress={() => updateQuantity(item.id, 1)} disabled={!!(item.stock && item.quantity >= item.stock)}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  const EmptyCart = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient colors={[THEME.card, THEME.surface]} style={styles.emptyIconBg}>
        <Ionicons name="cart-outline" size={60} color={THEME.textDim} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.emptySubtitle}>Add items to get started</Text>
      <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.shopNowBtn}>
        <LinearGradient colors={[THEME.primary, THEME.primaryDark]} style={styles.shopNowGrad}>
          <Text style={styles.shopNowText}>Start Shopping</Text><Ionicons name="arrow-forward" size={16} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.surface} />
      <LinearGradient colors={[THEME.surface, THEME.card]} style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (step === 'address') setStep('cart');
          else if (step === 'payment') setStep('address');
          else router.back();
        }} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>
            {step === 'cart' && 'My Cart'}
            {step === 'address' && 'Delivery Address'}
            {step === 'payment' && 'Payment'}
          </Text>
          {step === 'cart' && cartItems.length > 0 && <Text style={styles.headerSub}>{cartItems.length} items</Text>}
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/*  Cart */}
      {step === 'cart' && (
        cartItems.length > 0 ? (
          <>
            <View style={styles.selectAllRow}>
              <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllLeft}>
                <View style={[styles.checkboxInner, cartItems.every(i => i.selected) && styles.checkboxChecked]}>
                  {cartItems.every(i => i.selected) && <Ionicons name="checkmark" size={11} color="#fff" />}
                </View>
                <Text style={styles.selectAllText}>Select All</Text>
              </TouchableOpacity>
              <Text style={styles.selectedCountText}>{selectedCount} selected</Text>
            </View>

            <FlatList data={cartItems} renderItem={renderItem} keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false} contentContainerStyle={styles.listPad}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />} />

            {selectedCount > 0 && (
              <View style={styles.couponSection}>
                {!appliedCoupon ? (
                  <>
                    {!showCouponInput ? (
                      <TouchableOpacity onPress={() => setShowCouponInput(true)} style={styles.couponTrigger}>
                        <Ionicons name="pricetag-outline" size={18} color={THEME.primary} />
                        <Text style={styles.couponTriggerText}>Apply Coupon Code</Text>
                        <Ionicons name="chevron-forward" size={16} color={THEME.textMuted} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.couponInputRow}>
                        <TextInput style={styles.couponInput} placeholder="SAVE10, FREESHIP..." placeholderTextColor={THEME.textDim}
                          value={couponCode} onChangeText={(t) => { setCouponCode(t.toUpperCase()); setCouponError(''); }} autoCapitalize="characters" />
                        <TouchableOpacity onPress={() => applyCouponFromDB(couponCode)} style={styles.couponApplyBtn}>
                          <Text style={styles.couponApplyText}>Apply</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowCouponInput(false)}><Ionicons name="close" size={20} color={THEME.textMuted} /></TouchableOpacity>
                      </View>
                    )}
                    {couponError && <Text style={styles.couponError}>{couponError}</Text>}
                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                      {loadingCoupons ? (
                        <View style={{ flexDirection: 'row', paddingHorizontal: 10 }}>
                          <ActivityIndicator size="small" color={THEME.primary} />
                          <Text style={{ fontSize: 11, color: THEME.textMuted, marginLeft: 8 }}>Loading coupons...</Text>
                        </View>
                      ) : availableCouponsFromDB.length === 0 ? (
                        <Text style={{ fontSize: 11, color: THEME.textMuted, paddingHorizontal: 10 }}>No active coupons available</Text>
                      ) : (
                        availableCouponsFromDB.map((c) => {
                          const discountText = c.type === 'percentage' 
                            ? `${c.discount}% OFF` 
                            : `৳${c.discount.toLocaleString()} OFF`;
                          const minText = c.minOrderAmount ? `(${c.minOrderAmount.toLocaleString()}+)` : '';
                          
                          return (
                            <TouchableOpacity 
                              key={c.$id} 
                              style={styles.couponChip} 
                              onPress={() => {
                                setCouponCode(c.code);
                                applyCouponFromDB(c.code);
                              }}
                            >
                              <Text style={styles.couponChipCode}>{c.code}</Text>
                              <Text style={styles.couponChipDesc} numberOfLines={1}>
                                {discountText} {minText}
                              </Text>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                  </>
                ) : (
                  <View style={styles.appliedCoupon}>
                    <Ionicons name="checkmark-circle" size={22} color={THEME.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appliedCouponCode}>
                        {appliedCoupon.code} — {appliedCoupon.type === 'percentage' 
                          ? `${appliedCoupon.discountPercent}% OFF` 
                          : `৳${appliedCoupon.discountPercent} OFF`}
                      </Text>
                      <Text style={styles.appliedCouponDesc}>{appliedCoupon.description}</Text>
                    </View>
                    <TouchableOpacity onPress={removeCoupon}><Ionicons name="close-circle" size={22} color={THEME.primary} /></TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {selectedCount > 0 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Items ({selectedCount})</Text><Text style={styles.summaryVal}>{settings.currency}{subtotal.toLocaleString()}</Text></View>
                {discount > 0 && <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: THEME.success }]}>Discount</Text><Text style={[styles.summaryVal, { color: THEME.success }]}>-{settings.currency}{discount.toLocaleString()}</Text></View>}
                {tax > 0 && <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Tax ({settings.taxPercentage}%)</Text><Text style={styles.summaryVal}>{settings.currency}{tax.toLocaleString()}</Text></View>}
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery</Text><Text style={[styles.summaryVal, deliveryFee === 0 && { color: THEME.success }]}>{deliveryFee === 0 ? '✓ FREE' : `${settings.currency}${deliveryFee}`}</Text></View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryTotalRow}><Text style={styles.summaryTotalLabel}>Total</Text><Text style={styles.summaryTotalValue}>{settings.currency}{Math.round(total).toLocaleString()}</Text></View>
                <TouchableOpacity style={styles.checkoutBtn} onPress={handleNextToAddress}>
                  <LinearGradient colors={[THEME.primary, THEME.primaryDark]} style={styles.checkoutGrad}>
                    <Text style={styles.checkoutText}>Next → Delivery Address</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : <EmptyCart />
      )}

      {/* Address Form */}
      {step === 'address' && (
        <ScrollView style={styles.addressContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.addressCard}>
            <Text style={styles.addressTitle}>Delivery Information</Text>
            
            <TextInput style={styles.input} placeholder="Full Name *" placeholderTextColor={THEME.textDim}
              value={shippingAddress.fullName} onChangeText={(t) => setShippingAddress({ ...shippingAddress, fullName: t })} />
            
            <TextInput style={styles.input} placeholder="Phone Number * (11 digits)" placeholderTextColor={THEME.textDim}
              value={shippingAddress.phone} onChangeText={(t) => setShippingAddress({ ...shippingAddress, phone: t })} keyboardType="phone-pad" />
            
            <TextInput style={[styles.input, styles.textArea]} placeholder="Delivery Address *" placeholderTextColor={THEME.textDim}
              value={shippingAddress.address} onChangeText={(t) => setShippingAddress({ ...shippingAddress, address: t })} multiline numberOfLines={3} />
            
            <TextInput style={styles.input} placeholder="Landmark (Optional)" placeholderTextColor={THEME.textDim}
              value={shippingAddress.landmark} onChangeText={(t) => setShippingAddress({ ...shippingAddress, landmark: t })} />
            
            <View style={styles.cityContainer}>
              <Text style={styles.cityLabel}>City</Text>
              <TouchableOpacity style={styles.citySelect}>
                <Text style={styles.citySelectText}>Sylhet</Text>
                <Ionicons name="checkmark-circle" size={18} color={THEME.success} />
              </TouchableOpacity>
              <Text style={styles.cityHint}>Currently we only deliver to Sylhet city</Text>
            </View>
            
            <TextInput style={styles.input} placeholder="Postal Code" placeholderTextColor={THEME.textDim}
              value={shippingAddress.postalCode} onChangeText={(t) => setShippingAddress({ ...shippingAddress, postalCode: t })} keyboardType="numeric" />
            
            <View style={styles.addressButtons}>
              <TouchableOpacity style={styles.backBtnAddress} onPress={() => setStep('cart')}>
                <Text style={styles.backBtnText}>← Back to Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtnAddress} onPress={handleAddressSubmit}>
                <LinearGradient colors={[THEME.primary, THEME.primaryDark]} style={styles.nextBtnGrad}>
                  <Text style={styles.nextBtnText}>Proceed to Payment →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Payment */}
      {step === 'payment' && (
        <ScrollView style={styles.paymentContainer}>
          <View style={styles.paymentCard}>
            <View style={styles.orderSummaryBox}>
              <Text style={styles.orderSummaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Items</Text><Text style={styles.summaryVal}>{settings.currency}{subtotal.toLocaleString()}</Text></View>
              {discount > 0 && <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Discount</Text><Text style={styles.summaryVal}>-{settings.currency}{discount.toLocaleString()}</Text></View>}
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery</Text><Text style={styles.summaryVal}>{deliveryFee === 0 ? 'FREE' : `${settings.currency}${deliveryFee}`}</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryTotalRow}><Text style={styles.summaryTotalLabel}>Total</Text><Text style={styles.summaryTotalValue}>{settings.currency}{Math.round(total).toLocaleString()}</Text></View>
            </View>

            <Text style={styles.paymentMethodTitle}>Payment Method</Text>
            
            <TouchableOpacity style={styles.bkashPaymentBtn} onPress={generateQRPayment}>
              <LinearGradient colors={[THEME.primary, THEME.primaryDark]} style={styles.bkashPaymentGrad}>
                <View style={styles.bkashIconCircle}>
                  <Ionicons name="logo-buffer" size={28} color={THEME.primary} />
                </View>
                <View style={styles.bkashPaymentInfo}>
                  <Text style={styles.bkashPaymentTitle}>bKash QR Code</Text>
                  <Text style={styles.bkashPaymentDesc}>Scan QR code and pay securely</Text>
                </View>
                <Ionicons name="qr-code" size={28} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backToAddressBtn} onPress={() => setStep('address')}>
              <Text style={styles.backToAddressText}>← Back to Address</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {renderQRModal()}
      {renderOtpModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingBottom: 16, paddingHorizontal: 20 },
  headerBack: { width: 38, height: 38, borderRadius: 19, backgroundColor: THEME.glass, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: THEME.text, textAlign: 'center' },
  headerSub: { fontSize: 12, color: THEME.textMuted, textAlign: 'center', marginTop: 1 },
  selectAllRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: THEME.card, marginHorizontal: 12, marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: THEME.border },
  selectAllLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectAllText: { fontSize: 14, color: THEME.text, fontWeight: '600' },
  selectedCountText: { fontSize: 12, color: THEME.primary, fontWeight: '600' },
  listPad: { padding: 12, gap: 10 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.card, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: THEME.border },
  checkbox: { marginRight: 10 },
  checkboxInner: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: THEME.border, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  itemImage: { width: 64, height: 64, borderRadius: 12 },
  imageFallback: { backgroundColor: THEME.cardLight, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, marginLeft: 10 },
  itemName: { fontSize: 13, fontWeight: '600', color: THEME.text, marginBottom: 5 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: THEME.primary },
  itemPriceDiscount: { fontSize: 14, fontWeight: '700', color: THEME.primary },
  itemPriceOriginal: { fontSize: 11, color: THEME.textMuted, textDecorationLine: 'line-through' },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeBtnText: { fontSize: 11, color: THEME.primary, fontWeight: '500' },
  qtyControl: { alignItems: 'center', marginLeft: 8, backgroundColor: THEME.cardLight, borderRadius: 14, padding: 4 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: THEME.primary, justifyContent: 'center', alignItems: 'center' },
  qtyBtnDisabled: { backgroundColor: THEME.textDim },
  qtyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  qtyValue: { color: THEME.text, fontWeight: '700', fontSize: 14, marginVertical: 6 },
  couponSection: { paddingHorizontal: 12, marginBottom: 8 },
  couponTrigger: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: THEME.card, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: THEME.border },
  couponTriggerText: { flex: 1, color: THEME.text, fontSize: 14, fontWeight: '500' },
  couponInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: THEME.card, padding: 8, borderRadius: 14, borderWidth: 1, borderColor: THEME.border },
  couponInput: { flex: 1, color: THEME.text, fontSize: 14, padding: 8 },
  couponApplyBtn: { backgroundColor: THEME.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  couponApplyText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  couponError: { fontSize: 11, color: THEME.primary, marginTop: 5, marginLeft: 4 },
  couponChip: { backgroundColor: THEME.card, borderRadius: 12, padding: 10, marginRight: 8, minWidth: 140, borderWidth: 1, borderColor: THEME.border },
  couponChipCode: { fontSize: 12, fontWeight: '700', color: THEME.primary, marginBottom: 2 },
  couponChipDesc: { fontSize: 10, color: THEME.textMuted },
  appliedCoupon: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#00D68F15', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#00D68F40' },
  appliedCouponCode: { fontSize: 13, color: THEME.success, fontWeight: '700' },
  appliedCouponDesc: { fontSize: 11, color: THEME.textMuted, marginTop: 2 },
  summaryCard: { backgroundColor: THEME.card, padding: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: THEME.border },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: THEME.text, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 13, color: THEME.textMuted },
  summaryVal: { fontSize: 13, fontWeight: '600', color: THEME.text },
  freeDeliveryHint: { fontSize: 10, color: THEME.success, marginTop: -6, marginBottom: 10, textAlign: 'right' },
  summaryDivider: { height: 1, backgroundColor: THEME.border, marginVertical: 12 },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  summaryTotalLabel: { fontSize: 16, fontWeight: '700', color: THEME.text },
  summaryTotalValue: { fontSize: 22, fontWeight: '800', color: THEME.primary },
  checkoutBtn: { borderRadius: 16, overflow: 'hidden' },
  checkoutGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  noSelectionCard: { alignItems: 'center', padding: 30, margin: 16, backgroundColor: THEME.card, borderRadius: 20, borderWidth: 1, borderColor: THEME.border },
  noSelectionText: { color: THEME.warning, fontSize: 14, marginTop: 8, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconBg: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: THEME.text, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: THEME.textMuted, marginBottom: 25 },
  shopNowBtn: { borderRadius: 25, overflow: 'hidden' },
  shopNowGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 12, gap: 8 },
  shopNowText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
  // Address Form Styles
  addressContainer: { flex: 1, padding: 16 },
  addressCard: { backgroundColor: THEME.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: THEME.border },
  addressTitle: { fontSize: 18, fontWeight: '700', color: THEME.text, marginBottom: 20 },
  input: { backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 12, padding: 14, fontSize: 14, color: THEME.text, marginBottom: 12 },
  textArea: { height: 80, textAlignVertical: 'top' },
  cityContainer: { marginBottom: 12 },
  cityLabel: { fontSize: 12, color: THEME.textMuted, marginBottom: 6 },
  citySelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 12, padding: 14 },
  citySelectText: { fontSize: 14, color: THEME.text, fontWeight: '500' },
  cityHint: { fontSize: 10, color: THEME.textDim, marginTop: 6 },
  addressButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  backBtnAddress: { flex: 1, backgroundColor: THEME.glass, padding: 14, borderRadius: 12, alignItems: 'center' },
  backBtnText: { color: THEME.text, fontSize: 14, fontWeight: '500' },
  nextBtnAddress: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  nextBtnGrad: { padding: 14, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  
  // Payment Styles
  paymentContainer: { flex: 1, padding: 16 },
  paymentCard: { backgroundColor: THEME.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: THEME.border },
  orderSummaryBox: { backgroundColor: THEME.surface, borderRadius: 16, padding: 16, marginBottom: 24 },
  orderSummaryTitle: { fontSize: 14, fontWeight: '600', color: THEME.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  paymentMethodTitle: { fontSize: 16, fontWeight: '700', color: THEME.text, marginBottom: 16 },
  bkashPaymentBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  bkashPaymentGrad: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  bkashIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  bkashPaymentInfo: { flex: 1 },
  bkashPaymentTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  bkashPaymentDesc: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  backToAddressBtn: { alignItems: 'center', padding: 12 },
  backToAddressText: { color: THEME.textMuted, fontSize: 14 },
  
  // QR Modal Styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheetHandle: { width: 36, height: 4, backgroundColor: THEME.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: THEME.glass, justifyContent: 'center', alignItems: 'center' },
  qrSheet: { backgroundColor: THEME.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, maxHeight: height * 0.85, paddingTop: 14 },
  qrSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  qrHeaderBadge: { backgroundColor: '#E2136E20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 4 },
  qrHeaderBadgeText: { fontSize: 9, fontWeight: '800', color: THEME.primary, letterSpacing: 1 },
  qrHeaderTitle: { fontSize: 20, fontWeight: '700', color: THEME.text },
  qrAmountRow: { backgroundColor: THEME.surface, borderRadius: 16, padding: 12, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: THEME.border },
  qrAmountLabel: { fontSize: 12, color: THEME.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  qrAmountValue: { fontSize: 28, fontWeight: '800', color: THEME.primary },
  qrCodeWrapper: { alignItems: 'center', marginBottom: 20 },
  qrCodeContainer: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 20 },
  
  instructionsBox: { backgroundColor: THEME.surface, borderRadius: 16, padding: 16, marginBottom: 16 },
  instructionsTitle: { fontSize: 14, fontWeight: '700', color: THEME.text, marginBottom: 12 },
  instructionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  instructionNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: THEME.primary, justifyContent: 'center', alignItems: 'center' },
  instructionNumberText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  instructionText: { fontSize: 13, color: THEME.text, flex: 1 },
  
  otpButton: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  otpButtonGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 8 },
  otpButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
  noteBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFB80010', padding: 12, borderRadius: 12, marginBottom: 16 },
  noteText: { flex: 1, fontSize: 11, color: THEME.warning },
  
  // OTP Modal Styles
  otpModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  otpCard: { width: width * 0.85, backgroundColor: THEME.card, borderRadius: 24, padding: 24, alignItems: 'center' },
  otpIconWrap: { marginBottom: 20 },
  otpIconCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  otpTitle: { fontSize: 22, fontWeight: '800', color: THEME.text, marginBottom: 8 },
  otpSubtitle: { fontSize: 13, color: THEME.textMuted, textAlign: 'center', marginBottom: 24 },
  otpInput: { width: '100%', backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 14, padding: 14, fontSize: 20, textAlign: 'center', color: THEME.text, marginBottom: 20, letterSpacing: 8 },
  verifyOtpBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  verifyOtpBtnDisabled: { opacity: 0.5 },
  verifyOtpGrad: { padding: 14, alignItems: 'center' },
  verifyOtpText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelOtpBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12 },
  cancelOtpText: { color: THEME.textMuted, fontSize: 14, fontWeight: '500' },
  
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  successIconWrap: { marginBottom: 20 },
  successIconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  successTitle: { fontSize: 26, fontWeight: '800', color: THEME.success, marginBottom: 8 },
  successAmount: { fontSize: 38, fontWeight: '900', color: THEME.text, marginBottom: 8 },
  successSub: { fontSize: 14, color: THEME.textMuted },
});