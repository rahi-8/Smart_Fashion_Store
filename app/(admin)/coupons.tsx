// app/(admin)/coupons.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Switch,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

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

interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  maxDiscount?: number;
  startDate: Date;
  endDate: Date;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

export default function CouponsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  
  // Mock Coupons Data - এটাকে আপনার API দিয়ে রিপ্লেস করবেন
  const [coupons, setCoupons] = useState<Coupon[]>([
    {
      id: '1',
      code: 'WELCOME20',
      description: '20% off on first purchase',
      discountType: 'percentage',
      discountValue: 20,
      minPurchase: 500,
      maxDiscount: 1000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      usageLimit: 100,
      usedCount: 45,
      isActive: true,
    },
    {
      id: '2',
      code: 'FREESHIP',
      description: 'Free shipping on orders above ৳1000',
      discountType: 'fixed',
      discountValue: 60,
      minPurchase: 1000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 15 * 86400000),
      usageLimit: 200,
      usedCount: 78,
      isActive: true,
    },
    {
      id: '3',
      code: 'SAVE50',
      description: 'Flat ৳50 off on all orders',
      discountType: 'fixed',
      discountValue: 50,
      minPurchase: 0,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 86400000),
      usageLimit: 500,
      usedCount: 234,
      isActive: true,
    },
  ]);

  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    minPurchase: '',
    maxDiscount: '',
    usageLimit: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 86400000),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  // Random Coupon Code Generator
  const generateCouponCode = () => {
    const prefixes = ['SAVE', 'DEAL', 'OFFER', 'FLAT', 'SUPER', 'MEGA', 'HOT'];
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${prefix}${suffix}`;
  };

  const handleGenerateCode = () => {
    setForm({ ...form, code: generateCouponCode() });
  };

  const handleAddCoupon = () => {
    setEditingCoupon(null);
    setForm({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minPurchase: '',
      maxDiscount: '',
      usageLimit: '',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
    });
    setModalVisible(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minPurchase: coupon.minPurchase.toString(),
      maxDiscount: coupon.maxDiscount?.toString() || '',
      usageLimit: coupon.usageLimit.toString(),
      startDate: coupon.startDate,
      endDate: coupon.endDate,
    });
    setModalVisible(true);
  };

  const handleViewCoupon = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setViewModalVisible(true);
  };

  const handleSaveCoupon = () => {
    // Validation
    if (!form.code.trim()) {
      Alert.alert('Error', 'Coupon code is required');
      return;
    }
    if (!form.discountValue || parseFloat(form.discountValue) <= 0) {
      Alert.alert('Error', 'Valid discount value is required');
      return;
    }
    if (form.endDate <= form.startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    const discountValueNum = parseFloat(form.discountValue);
    const minPurchaseNum = parseFloat(form.minPurchase) || 0;
    const usageLimitNum = parseInt(form.usageLimit) || 0;

    if (editingCoupon) {
      // Update existing coupon
      const updatedCoupons = coupons.map(coupon =>
        coupon.id === editingCoupon.id
          ? {
              ...coupon,
              code: form.code.toUpperCase(),
              description: form.description,
              discountType: form.discountType,
              discountValue: discountValueNum,
              minPurchase: minPurchaseNum,
              maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : undefined,
              startDate: form.startDate,
              endDate: form.endDate,
              usageLimit: usageLimitNum,
            }
          : coupon
      );
      setCoupons(updatedCoupons);
      Alert.alert('Success', 'Coupon updated successfully');
    } else {
      // Check if coupon code already exists
      if (coupons.some(c => c.code === form.code.toUpperCase())) {
        Alert.alert('Error', 'Coupon code already exists');
        return;
      }

      // Add new coupon
      const newCoupon: Coupon = {
        id: Date.now().toString(),
        code: form.code.toUpperCase(),
        description: form.description,
        discountType: form.discountType,
        discountValue: discountValueNum,
        minPurchase: minPurchaseNum,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        usageLimit: usageLimitNum,
        usedCount: 0,
        isActive: true,
      };
      setCoupons([newCoupon, ...coupons]);
      Alert.alert('Success', 'Coupon added successfully');
    }
    setModalVisible(false);
  };

  const handleDeleteCoupon = (coupon: Coupon) => {
    Alert.alert(
      'Delete Coupon',
      `Are you sure you want to delete ${coupon.code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCoupons(coupons.filter(c => c.id !== coupon.id));
            Alert.alert('Success', 'Coupon deleted');
          },
        },
      ]
    );
  };

  const toggleCouponStatus = (coupon: Coupon) => {
    setCoupons(coupons.map(c =>
      c.id === coupon.id ? { ...c, isActive: !c.isActive } : c
    ));
  };

  const getDiscountText = (coupon: Coupon) => {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}% OFF`;
    }
    return `৳${coupon.discountValue} OFF`;
  };

  const getUsageProgress = (coupon: Coupon) => {
    return (coupon.usedCount / coupon.usageLimit) * 100;
  };

  const isExpired = (coupon: Coupon) => {
    return new Date() > coupon.endDate;
  };

  const getStatusColor = (coupon: Coupon) => {
    if (!coupon.isActive) return C.accentRed;
    if (isExpired(coupon)) return C.accentOrange;
    if (getUsageProgress(coupon) >= 90) return C.accentOrange;
    return C.accentGreen;
  };

  const getStatusText = (coupon: Coupon) => {
    if (!coupon.isActive) return 'Inactive';
    if (isExpired(coupon)) return 'Expired';
    if (getUsageProgress(coupon) >= 90) return 'Limited';
    return 'Active';
  };

  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.isActive && !isExpired(c)).length,
    expired: coupons.filter(c => isExpired(c)).length,
    totalUsed: coupons.reduce((sum, c) => sum + c.usedCount, 0),
    totalSavings: coupons.reduce((sum, c) => sum + (c.discountValue * c.usedCount), 0),
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} colors={[C.cyan]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header */}
      <LinearGradient colors={['#0A1647', '#0D1F6E', '#1034A6']} style={styles.hero}>
        <Bubble size={180} top={-60} right={-50} opacity={0.08} />
        <Bubble size={120} bottom={-40} left={-35} opacity={0.1} color={C.purple} />
        <Bubble size={70} top={30} right={90} opacity={0.12} color={C.cyan} />
        <Bubble size={40} bottom={25} right={160} opacity={0.15} color={C.indigo} />
        
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroTitle}>🏷️ Coupon Management</Text>
            <Text style={styles.heroSubtitle}>Create & manage discount coupons</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddCoupon}>
            <LinearGradient colors={[C.blue2, C.cyan]} style={styles.addButtonGradient}>
              <Feather name="plus" size={18} color={C.bg} />
              <Text style={styles.addButtonText}>Add Coupon</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Coupons</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: C.accentGreen }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: C.accentOrange }]}>{stats.expired}</Text>
            <Text style={styles.statLabel}>Expired</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.totalUsed}</Text>
            <Text style={styles.statLabel}>Times Used</Text>
          </View>
        </View>

        <View style={styles.savingsCard}>
          <Feather name="trending-up" size={20} color={C.accentGreen} />
          <Text style={styles.savingsText}>
            Total Customer Savings: ৳{stats.totalSavings.toLocaleString()}
          </Text>
        </View>
      </LinearGradient>

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="tag" size={60} color={C.textMuted} />
          <Text style={styles.emptyTitle}>No Coupons Yet</Text>
          <Text style={styles.emptyText}>Tap the "Add Coupon" button to create your first coupon</Text>
        </View>
      ) : (
        coupons.map((coupon) => {
          const progress = getUsageProgress(coupon);
          const statusColor = getStatusColor(coupon);
          const statusText = getStatusText(coupon);
          const expired = isExpired(coupon);
          
          return (
            <TouchableOpacity
              key={coupon.id}
              style={styles.couponCard}
              onPress={() => handleViewCoupon(coupon)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={coupon.isActive && !expired ? [C.surface, C.surfaceAlt] : [C.surfaceAlt, C.surfaceAlt]}
                style={styles.couponGradient}
              >
                <View style={styles.couponHeader}>
                  <View style={styles.couponCodeContainer}>
                    <Text style={styles.couponCode}>{coupon.code}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                  </View>
                  <Switch
                    value={coupon.isActive && !expired}
                    onValueChange={() => toggleCouponStatus(coupon)}
                    trackColor={{ false: C.border, true: C.cyan }}
                    thumbColor={C.white}
                    disabled={expired}
                  />
                </View>

                <Text style={styles.couponDescription}>{coupon.description}</Text>

                <View style={styles.couponDetails}>
                  <View style={styles.detailItem}>
                    <Feather name="tag" size={14} color={C.accentGreen} />
                    <Text style={styles.detailText}>{getDiscountText(coupon)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Feather name="shopping-bag" size={14} color={C.accentOrange} />
                    <Text style={styles.detailText}>Min: ৳{coupon.minPurchase}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Feather name="calendar" size={14} color={C.blue3} />
                    <Text style={styles.detailText}>Expires: {formatDate(coupon.endDate)}</Text>
                  </View>
                </View>

                {/* Usage Progress */}
                <View style={styles.usageSection}>
                  <View style={styles.usageHeader}>
                    <Text style={styles.usageLabel}>Usage</Text>
                    <Text style={styles.usageCount}>{coupon.usedCount} / {coupon.usageLimit}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: statusColor }]} />
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditCoupon(coupon)}>
                    <Feather name="edit-2" size={16} color={C.blue3} />
                    <Text style={[styles.actionText, { color: C.blue3 }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleViewCoupon(coupon)}>
                    <Feather name="eye" size={16} color={C.cyan} />
                    <Text style={[styles.actionText, { color: C.cyan }]}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteCoupon(coupon)}>
                    <Feather name="trash-2" size={16} color={C.accentRed} />
                    <Text style={[styles.actionText, { color: C.accentRed }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })
      )}

      {/* Add/Edit Coupon Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={['#0A1647', '#0D1F6E']} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCoupon ? '✏️ Edit Coupon' : '➕ Create New Coupon'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={C.white} />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Coupon Code */}
              <Text style={styles.label}>Coupon Code *</Text>
              <View style={styles.codeInputRow}>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="e.g., SUMMER2024"
                  placeholderTextColor={C.textMuted}
                  value={form.code}
                  onChangeText={(text) => setForm({ ...form, code: text.toUpperCase() })}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateCode}>
                  <LinearGradient colors={[C.purple, C.indigo]} style={styles.generateBtnGradient}>
                    <Feather name="shuffle" size={16} color={C.white} />
                    <Text style={styles.generateBtnText}>Generate</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Description */}
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the coupon offer..."
                placeholderTextColor={C.textMuted}
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                multiline
              />

              {/* Discount Type */}
              <Text style={styles.label}>Discount Type *</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.typeButton, form.discountType === 'percentage' && styles.typeButtonActive]}
                  onPress={() => setForm({ ...form, discountType: 'percentage' })}
                >
                  <Text style={[styles.typeText, form.discountType === 'percentage' && styles.typeTextActive]}>
                    Percentage (%)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, form.discountType === 'fixed' && styles.typeButtonActive]}
                  onPress={() => setForm({ ...form, discountType: 'fixed' })}
                >
                  <Text style={[styles.typeText, form.discountType === 'fixed' && styles.typeTextActive]}>
                    Fixed Amount (৳)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Discount Value */}
              <Text style={styles.label}>Discount Value *</Text>
              <TextInput
                style={styles.input}
                placeholder={form.discountType === 'percentage' ? 'e.g., 20' : 'e.g., 100'}
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                value={form.discountValue}
                onChangeText={(text) => setForm({ ...form, discountValue: text })}
              />

              {/* Minimum Purchase */}
              <Text style={styles.label}>Minimum Purchase (৳)</Text>
              <TextInput
                style={styles.input}
                placeholder="0 for no minimum"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                value={form.minPurchase}
                onChangeText={(text) => setForm({ ...form, minPurchase: text })}
              />

              {/* Maximum Discount (for percentage only) */}
              {form.discountType === 'percentage' && (
                <>
                  <Text style={styles.label}>Maximum Discount (৳)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Optional - max discount amount"
                    placeholderTextColor={C.textMuted}
                    keyboardType="numeric"
                    value={form.maxDiscount}
                    onChangeText={(text) => setForm({ ...form, maxDiscount: text })}
                  />
                </>
              )}

              {/* Usage Limit */}
              <Text style={styles.label}>Usage Limit</Text>
              <TextInput
                style={styles.input}
                placeholder="Number of times this coupon can be used"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                value={form.usageLimit}
                onChangeText={(text) => setForm({ ...form, usageLimit: text })}
              />

              {/* Start Date */}
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
                <Feather name="calendar" size={18} color={C.cyan} />
                <Text style={styles.dateText}>{formatDate(form.startDate)}</Text>
              </TouchableOpacity>

              {/* End Date */}
              <Text style={styles.label}>End Date *</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
                <Feather name="calendar" size={18} color={C.accentOrange} />
                <Text style={styles.dateText}>{formatDate(form.endDate)}</Text>
              </TouchableOpacity>

              {(showStartDatePicker || showEndDatePicker) && (
                <DateTimePicker
                  value={showStartDatePicker ? form.startDate : form.endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    if (showStartDatePicker) {
                      setShowStartDatePicker(false);
                      if (selectedDate) setForm({ ...form, startDate: selectedDate });
                    } else {
                      setShowEndDatePicker(false);
                      if (selectedDate) setForm({ ...form, endDate: selectedDate });
                    }
                  }}
                />
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCoupon}>
                  <LinearGradient colors={[C.blue2, C.cyan]} style={styles.saveBtnGradient}>
                    <Text style={styles.saveText}>{editingCoupon ? 'Update Coupon' : 'Create Coupon'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Coupon Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={viewModalVisible}
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <LinearGradient colors={['#0A1647', '#0D1F6E']} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Coupon Details</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                <Feather name="x" size={24} color={C.white} />
              </TouchableOpacity>
            </LinearGradient>

            {selectedCoupon && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Coupon Code</Text>
                  <Text style={styles.detailCode}>{selectedCoupon.code}</Text>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailText}>{selectedCoupon.description || 'No description'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Discount</Text>
                    <Text style={styles.detailValue}>{getDiscountText(selectedCoupon)}</Text>
                  </View>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Min Purchase</Text>
                    <Text style={styles.detailValue}>৳{selectedCoupon.minPurchase}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Start Date</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedCoupon.startDate)}</Text>
                  </View>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>End Date</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedCoupon.endDate)}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Usage Limit</Text>
                    <Text style={styles.detailValue}>{selectedCoupon.usageLimit}</Text>
                  </View>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Times Used</Text>
                    <Text style={styles.detailValue}>{selectedCoupon.usedCount}</Text>
                  </View>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Remaining Uses</Text>
                  <Text style={styles.detailValue}>{selectedCoupon.usageLimit - selectedCoupon.usedCount}</Text>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedCoupon) + '20' }]}>
                    <Text style={[styles.statusBadgeLargeText, { color: getStatusColor(selectedCoupon) }]}>
                      {getStatusText(selectedCoupon)}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setViewModalVisible(false)}>
                    <Text style={styles.cancelText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={() => {
                    setViewModalVisible(false);
                    handleEditCoupon(selectedCoupon);
                  }}>
                    <LinearGradient colors={[C.blue2, C.cyan]} style={styles.saveBtnGradient}>
                      <Text style={styles.saveText}>Edit Coupon</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hero: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 20, overflow: 'hidden' },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: C.white, marginBottom: 6 },
  heroSubtitle: { fontSize: 13, color: C.blue4 },
  
  addButton: { borderRadius: 10, overflow: 'hidden' },
  addButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  addButtonText: { color: C.bg, fontWeight: '700', fontSize: 14 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10, alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '800', color: C.white, marginBottom: 4 },
  statLabel: { fontSize: 10, color: C.textSecondary },
  
  savingsCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.accentGreen + '15', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.accentGreen + '30' },
  savingsText: { fontSize: 12, color: C.accentGreen, fontWeight: '600', flex: 1 },
  
  couponCard: { marginHorizontal: 12, marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  couponGradient: { padding: 16 },
  couponHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  couponCodeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  couponCode: { fontSize: 18, fontWeight: '800', color: C.cyan, fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },
  couponDescription: { fontSize: 13, color: C.textSecondary, marginBottom: 12 },
  couponDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: C.textPrimary },
  usageSection: { marginBottom: 14 },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  usageLabel: { fontSize: 11, color: C.textMuted },
  usageCount: { fontSize: 11, color: C.textSecondary },
  progressBar: { height: 4, backgroundColor: C.surfaceAlt, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, fontWeight: '500' },
  
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: C.textPrimary, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: C.white },
  modalBody: { padding: 20 },
  
  label: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 14, color: C.textPrimary, backgroundColor: C.surfaceAlt },
  textArea: { height: 80, textAlignVertical: 'top' },
  
  codeInputRow: { flexDirection: 'row', gap: 10 },
  codeInput: { flex: 2 },
  generateBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  generateBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6 },
  generateBtnText: { color: C.white, fontSize: 12, fontWeight: '600' },
  
  row: { flexDirection: 'row', gap: 12 },
  typeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: C.surfaceAlt, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  typeButtonActive: { backgroundColor: C.blue1, borderColor: C.cyan },
  typeText: { fontSize: 13, color: C.textSecondary },
  typeTextActive: { color: C.white, fontWeight: '600' },
  
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, backgroundColor: C.surfaceAlt },
  dateText: { fontSize: 14, color: C.textPrimary, flex: 1 },
  
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 30 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: C.surfaceAlt, alignItems: 'center' },
  cancelText: { color: C.textSecondary, fontSize: 14, fontWeight: '500' },
  saveBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  saveBtnGradient: { paddingVertical: 12, alignItems: 'center' },
  saveText: { color: C.bg, fontSize: 14, fontWeight: '700' },
  
  // View Modal Styles
  detailCard: { backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 14, marginBottom: 12 },
  detailCode: { fontSize: 24, fontWeight: '800', color: C.cyan, fontFamily: 'monospace', marginTop: 4 },
  detailRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  detailHalf: { flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 14 },
  detailLabel: { fontSize: 11, color: C.textMuted, marginBottom: 6 },
  detailValue: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  statusBadgeLarge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  statusBadgeLargeText: { fontSize: 13, fontWeight: '600' },
});
