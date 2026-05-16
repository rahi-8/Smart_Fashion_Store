// app/(tabs)/cart.tsx - bKash QR Payment System (Complete)

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, Alert, Modal, TextInput, ScrollView, ActivityIndicator,
  RefreshControl, Animated, Dimensions, Platform, KeyboardAvoidingView,
  Share, StatusBar
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

interface Coupon {
  code: string; discountPercent: number; minOrder: number;
  description: string; isActive: boolean;
}

interface Settings {
  deliveryCharge: number; minOrderForFreeDelivery: number; currency: string;
  taxPercentage: number; siteName: string; contactNumber: string;
}

export default function CartScreen() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [step, setStep] = useState<'cart' | 'address' | 'payment'>('cart');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    deliveryCharge: 60, minOrderForFreeDelivery: 800,
    currency: '৳', taxPercentage: 0, siteName: 'MyShop', contactNumber: '01XXXXXXXXX',
  });

  // QR States
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrStep, setQrStep] = useState<'generate' | 'waiting' | 'success'>('generate');
  const [qrGeneratedOtp, setQrGeneratedOtp] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  
  // Simulated Payment Page Modal (QR scan后用这个显示OTP)
  const [simulatedPaymentModal, setSimulatedPaymentModal] = useState(false);
  const [scannedPaymentData, setScannedPaymentData] = useState<any>(null);
  const [scannedOtp, setScannedOtp] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [otpTimer, setOtpTimer] = useState(120);
  const [canResend, setCanResend] = useState(false);

  const [shippingAddress, setShippingAddress] = useState({
    fullName: '', phone: '', address: '', city: 'Sylhet', postalCode: '', landmark: '',
  });

  const availableCoupons: Coupon[] = [
    { code: 'SAVE10', discountPercent: 10, minOrder: 500, description: '10% off on ৳500+', isActive: true },
    { code: 'SAVE20', discountPercent: 20, minOrder: 1000, description: '20% off on ৳1000+', isActive: true },
    { code: 'WELCOME15', discountPercent: 15, minOrder: 300, description: '15% off first order', isActive: true },
    { code: 'FREESHIP', discountPercent: 0, minOrder: 800, description: 'Free delivery on ৳800+', isActive: true },
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  // OTP Timer
  useEffect(() => {
    if (qrStep === 'waiting') {
      setOtpTimer(120);
      setCanResend(false);
      timerRef.current = setInterval(() => {
        setOtpTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qrStep]);

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
  const discount = appliedCoupon ? (appliedCoupon.discountPercent * subtotal) / 100 : 0;
  const total = subtotal + deliveryFee + tax - discount;

  const applyCoupon = () => {
    if (selectedCount === 0) { setCouponError('Please select at least one item'); return; }
    if (!couponCode.trim()) { setCouponError('Please enter a coupon code'); return; }
    const coupon = availableCoupons.find(c => c.code === couponCode.toUpperCase() && c.isActive);
    if (!coupon) { setCouponError('Invalid coupon code'); return; }
    if (subtotal < coupon.minOrder) { setCouponError(`Min order ৳${coupon.minOrder} required`); return; }
    setAppliedCoupon(coupon);
    setCouponError('');
    setShowCouponInput(false);
    Alert.alert('✅ Applied!', coupon.code === 'FREESHIP' ? 'Free delivery applied!' : `${coupon.discountPercent}% discount applied!`);
    setCouponCode('');
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

  // ─── QR Payment System ──────────────────────────────────────────────────
  const generateQRPayment = () => {
    const orderId = 'ORD_' + Date.now();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const qrData = JSON.stringify({
      type: 'BKASH_PAYMENT',
      orderId: orderId,
      amount: Math.round(total),
      currency: settings.currency,
      merchantName: settings.siteName,
      timestamp: Date.now(),
      otp: otp
    });

    setCurrentOrderId(orderId);
    setPaymentLink(qrData);
    setQrGeneratedOtp(otp);
    setQrStep('generate');
    setQrModalVisible(true);
  };

  // Simulate QR scan - shows OTP page
  const simulateQRScan = (qrData: string) => {
    try {
      const parsedData = JSON.parse(qrData);
      if (parsedData.type === 'BKASH_PAYMENT') {
        setScannedPaymentData(parsedData);
        setScannedOtp('');
        setSimulatedPaymentModal(true);
      }
    } catch (error) {
      Alert.alert('Invalid QR', 'Unable to process QR code');
    }
  };

  const verifyScannedOtp = () => {
    if (scannedOtp !== scannedPaymentData?.otp) {
      Alert.alert('❌ Invalid OTP', 'The code does not match. Please try again.');
      return;
    }
    
    setSimulatedPaymentModal(false);
    setPaymentConfirmed(true);
    setQrStep('success');
    Animated.spring(successScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    
    setTimeout(() => {
      setQrModalVisible(false);
      placeOrder();
      setQrStep('generate');
      setPaymentConfirmed(false);
    }, 2000);
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
        bkashTransactionId: 'BKASH_' + Date.now().toString().slice(-10),
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

  const onRefresh = async () => { setRefreshing(true); await loadCart(); await loadSettings(); setRefreshing(false); };

  // ─── Simulated Payment Page Modal (Shows OTP when QR is scanned) ────────
  const renderSimulatedPaymentModal = () => (
    <Modal animationType="slide" transparent visible={simulatedPaymentModal}
      onRequestClose={() => setSimulatedPaymentModal(false)}>
      <View style={styles.modalBg}>
        <View style={[styles.qrSheet, { maxHeight: height * 0.75 }]}>
          <View style={styles.sheetHandle} />
          
          <View style={styles.paymentPageHeader}>
            <View style={styles.paymentPageLogo}>
              <LinearGradient colors={[THEME.primary, THEME.primaryDark]} style={styles.paymentPageLogoGrad}>
                <Ionicons name="logo-buffer" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.paymentPageMerchant}>bKash Payment</Text>
            </View>
            <TouchableOpacity onPress={() => setSimulatedPaymentModal(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={THEME.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.paymentPageAmountBox}>
            <Text style={styles.paymentPageAmountLabel}>Amount to Pay</Text>
            <Text style={styles.paymentPageAmount}>
              {scannedPaymentData?.currency || settings.currency}{scannedPaymentData?.amount?.toLocaleString()}
            </Text>
            <Text style={styles.paymentPageOrderId}>Order: {scannedPaymentData?.orderId}</Text>
          </View>

          <View style={styles.paymentPageOtpBox}>
            <View style={styles.paymentPageOtpHeader}>
              <Ionicons name="key-outline" size={20} color={THEME.warning} />
              <Text style={styles.paymentPageOtpTitle}>Your OTP Code</Text>
            </View>
            <Text style={styles.paymentPageOtpValue}>{scannedPaymentData?.otp}</Text>
            <Text style={styles.paymentPageOtpHint}>
              Enter this OTP in the merchant's app to complete payment
            </Text>
          </View>

          <View style={styles.paymentPageInfoBox}>
            <View style={styles.paymentPageInfoRow}>
              <Text style={styles.paymentPageInfoLabel}>Merchant</Text>
              <Text style={styles.paymentPageInfoValue}>{scannedPaymentData?.merchantName || settings.siteName}</Text>
            </View>
            <View style={styles.paymentPageInfoRow}>
              <Text style={styles.paymentPageInfoLabel}>Order ID</Text>
              <Text style={styles.paymentPageInfoValue}>{scannedPaymentData?.orderId}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.paymentPageCloseBtn} onPress={() => setSimulatedPaymentModal(false)}>
            <LinearGradient colors={['#333', '#222']} style={styles.paymentPageCloseGrad}>
              <Text style={styles.paymentPageCloseText}>Close</Text>
            </LinearGradient>
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
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
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

                <View style={styles.realQrBox}>
                  <View style={styles.realQrInner}>
                    <QRCode
                      value={paymentLink || JSON.stringify({ orderId: currentOrderId, amount: total })}
                      size={200}
                      color="#0F0F1A"
                      backgroundColor="#FFFFFF"
                      quietZone={10}
                    />
                  </View>
                  <View style={styles.qrScanHintRow}>
                    <Ionicons name="scan-outline" size={16} color={THEME.success} />
                    <Text style={styles.qrBoxNote}>Customer scan করলে OTP দেখাবে</Text>
                  </View>
                </View>

                {/* Demo Scan Button */}
                <TouchableOpacity style={styles.demoScanBtn} onPress={() => simulateQRScan(paymentLink)}>
                  <LinearGradient colors={['#2196F3', '#0D47A1']} style={styles.demoScanGrad}>
                    <Ionicons name="scan-circle" size={20} color="#fff" />
                    <Text style={styles.demoScanText}>📱 Simulate Customer Scan (Demo)</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.infoCard}>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Order ID</Text><Text style={styles.infoValue}>{currentOrderId}</Text></View>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Merchant</Text><Text style={styles.infoValue}>{settings.siteName}</Text></View>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Items</Text><Text style={styles.infoValue}>{selectedCount} item(s)</Text></View>
                </View>

                {/* OTP Input Section - Enter OTP from customer */}
                <View style={styles.otpInputSection}>
                  <Text style={styles.otpInputLabel}>Enter OTP from Customer</Text>
                  <View style={styles.otpInputRow}>
                    <TextInput
                      style={styles.otpInputField}
                      placeholder="000000"
                      placeholderTextColor={THEME.textDim}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={qrGeneratedOtp === 'verified' ? '' : undefined}
                      onChangeText={(text) => {
                        if (text === scannedPaymentData?.otp) {
                          setQrStep('success');
                          Animated.spring(successScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
                          setTimeout(() => {
                            setQrModalVisible(false);
                            placeOrder();
                            setQrStep('generate');
                          }, 2000);
                        } else if (text.length === 6 && text !== scannedPaymentData?.otp) {
                          Alert.alert('❌ Invalid OTP', 'The code does not match. Please try again.');
                        }
                      }}
                    />
                  </View>
                  <Text style={styles.otpInputHint}>
                    Customer scan করলে OTP দেখাবে, সেটি এখানে দিন
                  </Text>
                </View>

                <View style={{ height: 30 }} />
              </ScrollView>
            </Animated.View>
          )}

          {/* Success Step */}
          {qrStep === 'success' && (
            <View style={styles.successContainer}>
              <Animated.View style={[styles.successIconWrap, { transform: [{ scale: successScale }] }]}>
                <LinearGradient colors={[THEME.success, '#00A86B']} style={styles.successIconCircle}>
                  <Ionicons name="checkmark" size={52} color="#fff" />
                </LinearGradient>
              </Animated.View>
              <Animated.Text style={[styles.successTitle, { transform: [{ scale: successScale }] }]}>Payment Confirmed!</Animated.Text>
              <Text style={styles.successAmount}>{settings.currency}{Math.round(total).toLocaleString()}</Text>
              <Text style={styles.successSub}>Placing your order now...</Text>
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

      {/* Step 1: Cart */}
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
                        <TouchableOpacity onPress={applyCoupon} style={styles.couponApplyBtn}><Text style={styles.couponApplyText}>Apply</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowCouponInput(false)}><Ionicons name="close" size={20} color={THEME.textMuted} /></TouchableOpacity>
                      </View>
                    )}
                    {couponError && <Text style={styles.couponError}>{couponError}</Text>}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                      {availableCoupons.map((c) => (
                        <TouchableOpacity key={c.code} style={styles.couponChip} onPress={() => { setCouponCode(c.code); applyCoupon(); }}>
                          <Text style={styles.couponChipCode}>{c.code}</Text><Text style={styles.couponChipDesc} numberOfLines={1}>{c.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                ) : (
                  <View style={styles.appliedCoupon}>
                    <Ionicons name="checkmark-circle" size={22} color={THEME.success} />
                    <View style={{ flex: 1 }}><Text style={styles.appliedCouponCode}>{appliedCoupon.code} — {appliedCoupon.discountPercent > 0 ? `${appliedCoupon.discountPercent}% OFF` : 'FREE DELIVERY'}</Text>
                      <Text style={styles.appliedCouponDesc}>{appliedCoupon.description}</Text></View>
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

      {/* Step 2: Address Form */}
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

      {/* Step 3: Payment */}
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
      {renderSimulatedPaymentModal()}
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
  
  // Modal Styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheetHandle: { width: 36, height: 4, backgroundColor: THEME.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: THEME.glass, justifyContent: 'center', alignItems: 'center' },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: THEME.glass, justifyContent: 'center', alignItems: 'center' },
  qrSheet: { backgroundColor: THEME.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, maxHeight: height * 0.9, paddingTop: 14 },
  qrSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  qrHeaderBadge: { backgroundColor: '#E2136E20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 4 },
  qrHeaderBadgeText: { fontSize: 9, fontWeight: '800', color: THEME.primary, letterSpacing: 1 },
  qrHeaderTitle: { fontSize: 20, fontWeight: '700', color: THEME.text },
  qrAmountRow: { backgroundColor: THEME.surface, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: THEME.border },
  qrAmountLabel: { fontSize: 12, color: THEME.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  qrAmountValue: { fontSize: 32, fontWeight: '800', color: THEME.primary },
  realQrBox: { alignItems: 'center', marginBottom: 16 },
  realQrInner: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: THEME.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  qrScanHintRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'center' },
  qrBoxNote: { fontSize: 12, color: THEME.textMuted, textAlign: 'center' },
  demoScanBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  demoScanGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 8 },
  demoScanText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  infoCard: { backgroundColor: THEME.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: THEME.border, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  infoLabel: { fontSize: 12, color: THEME.textMuted },
  infoValue: { fontSize: 12, fontWeight: '600', color: THEME.text, maxWidth: '60%', textAlign: 'right' },
  infoDivider: { height: 1, backgroundColor: THEME.border },
  
  // OTP Input Section
  otpInputSection: { marginBottom: 20 },
  otpInputLabel: { fontSize: 14, fontWeight: '600', color: THEME.text, marginBottom: 12, textAlign: 'center' },
  otpInputRow: { alignItems: 'center' },
  otpInputField: { width: 200, borderWidth: 2, borderColor: THEME.primary, borderRadius: 16, padding: 14, fontSize: 24, fontWeight: '700', textAlign: 'center', color: THEME.text, backgroundColor: THEME.surface, letterSpacing: 8 },
  otpInputHint: { fontSize: 11, color: THEME.textDim, textAlign: 'center', marginTop: 12 },
  
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  confettiDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, opacity: 0.8 },
  successIconWrap: { marginBottom: 20 },
  successIconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  successTitle: { fontSize: 26, fontWeight: '800', color: THEME.success, marginBottom: 8 },
  successAmount: { fontSize: 38, fontWeight: '900', color: THEME.text, marginBottom: 8 },
  successSub: { fontSize: 14, color: THEME.textMuted },
  
  // Payment Page Modal Styles
  paymentPageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  paymentPageLogo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paymentPageLogoGrad: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  paymentPageMerchant: { fontSize: 16, fontWeight: '700', color: THEME.text },
  paymentPageAmountBox: { backgroundColor: THEME.surface, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: THEME.border },
  paymentPageAmountLabel: { fontSize: 12, color: THEME.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  paymentPageAmount: { fontSize: 36, fontWeight: '800', color: THEME.primary, marginBottom: 8 },
  paymentPageOrderId: { fontSize: 12, color: THEME.textMuted },
  paymentPageOtpBox: { backgroundColor: '#FFB80015', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1.5, borderColor: '#FFB80050', alignItems: 'center' },
  paymentPageOtpHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  paymentPageOtpTitle: { fontSize: 13, fontWeight: '600', color: THEME.warning },
  paymentPageOtpValue: { fontSize: 42, fontWeight: '900', color: THEME.warning, letterSpacing: 10, marginBottom: 12 },
  paymentPageOtpHint: { fontSize: 11, color: THEME.textMuted, textAlign: 'center' },
  paymentPageInfoBox: { backgroundColor: THEME.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 20 },
  paymentPageInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  paymentPageInfoLabel: { fontSize: 12, color: THEME.textMuted },
  paymentPageInfoValue: { fontSize: 12, fontWeight: '500', color: THEME.text },
  paymentPageCloseBtn: { borderRadius: 14, overflow: 'hidden' },
  paymentPageCloseGrad: { padding: 14, alignItems: 'center' },
  paymentPageCloseText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});