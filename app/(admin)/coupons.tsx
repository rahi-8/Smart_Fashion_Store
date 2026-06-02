// coupons.tsx 
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../../appwrite/config';

// DateTimePicker শুধু mobile এর জন্য ইম্পোর্ট করি
const DateTimePicker = Platform.OS !== 'web' 
  ? require('@react-native-community/datetimepicker').default 
  : null;

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

interface Coupon {
  $id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  validUntil: string;
  usageLimit: number;
  isActive: boolean;
  minOrderAmount?: number | null;
  description?: string | null;
  $createdAt: string;
  $updatedAt: string;
}

export default function CouponsScreen() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount: '',
    type: 'percentage' as 'percentage' | 'fixed',
    validUntil: '',
    usageLimit: '',
    minOrderAmount: '',
    description: '',
  });

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.COUPONS,
        [Query.orderDesc('$createdAt')]
      );
      setCoupons(response.documents as unknown as Coupon[]);
    } catch (error: any) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCoupons();
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discount: '',
      type: 'percentage',
      validUntil: '',
      usageLimit: '',
      minOrderAmount: '',
      description: '',
    });
    setEditingCoupon(null);
  };

  const handleAddCoupon = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount: coupon.discount.toString(),
      type: coupon.type,
      validUntil: coupon.validUntil,
      usageLimit: coupon.usageLimit.toString(),
      minOrderAmount: coupon.minOrderAmount?.toString() || '',
      description: coupon.description || '',
    });
    setModalVisible(true);
  };

  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setFormData({ ...formData, validUntil: `${year}-${month}-${day}` });
    }
  };

  const saveCoupon = async () => {
    if (!formData.code.trim()) {
      Alert.alert('Error', 'Please enter coupon code');
      return;
    }
    if (!formData.discount || parseFloat(formData.discount) <= 0) {
      Alert.alert('Error', 'Please enter valid discount amount');
      return;
    }
    if (!formData.validUntil) {
      Alert.alert('Error', 'Please enter valid until date');
      return;
    }

    setSaving(true);

    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        discount: parseFloat(formData.discount),
        type: formData.type,
        validUntil: formData.validUntil,
        usageLimit: parseInt(formData.usageLimit) || 0,
        isActive: editingCoupon?.isActive ?? true,
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : null,
        description: formData.description || null,
      };

      if (editingCoupon) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.COUPONS,
          editingCoupon.$id,
          couponData
        );
        Alert.alert('Success', 'Coupon updated successfully');
      } else {
        const existing = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.COUPONS,
          [Query.equal('code', [formData.code.toUpperCase()])]
        );
        
        if (existing.documents.length > 0) {
          Alert.alert('Error', 'Coupon code already exists');
          setSaving(false);
          return;
        }

        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.COUPONS,
          ID.unique(),
          couponData
        );
        Alert.alert('Success', 'Coupon created successfully');
      }

      setModalVisible(false);
      resetForm();
      await fetchCoupons();
    } catch (error: any) {
      console.error('Error saving coupon:', error);
      Alert.alert('Error', error.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const toggleCouponStatus = async (coupon: Coupon) => {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.COUPONS,
        coupon.$id,
        { isActive: !coupon.isActive }
      );
      
      setCoupons(prevCoupons => 
        prevCoupons.map(c => 
          c.$id === coupon.$id ? { ...c, isActive: !c.isActive } : c
        )
      );
    } catch (error: any) {
      console.error('Error updating coupon status:', error);
      Alert.alert('Error', 'Failed to update coupon status');
    }
  };

  const deleteCoupon = (coupon: Coupon) => {
    Alert.alert(
      'Delete Coupon',
      `Are you sure you want to delete "${coupon.code}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databases.deleteDocument(
                DATABASE_ID,
                COLLECTIONS.COUPONS,
                coupon.$id
              );
              await fetchCoupons();
              Alert.alert('Success', 'Coupon deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete coupon');
            }
          },
        },
      ]
    );
  };

  const getStats = () => {
    const total = coupons.length;
    const active = coupons.filter(c => c.isActive === true).length;
    return { total, active };
  };

  const stats = getStats();
  
  const isExpired = (validUntil: string) => {
    if (!validUntil) return false;
    try {
      return new Date(validUntil) < new Date();
    } catch {
      return false;
    }
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString();
  };

  // Date picker component (Web vs Mobile)
  const renderDatePicker = () => {
    if (Platform.OS === 'web') {
      // Web এর জন্য HTML date input
      return (
        <input
          type="date"
          value={formData.validUntil}
          onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            backgroundColor: C.surfaceAlt,
            color: C.textPrimary,
            fontSize: 14,
            fontFamily: 'inherit',
          }}
          min={new Date().toISOString().split('T')[0]}
        />
      );
    } else {
      // Mobile এর জন্য DateTimePicker
      return (
        <>
          <TouchableOpacity 
            style={styles.dateButton} 
            onPress={() => setShowDatePicker(true)}
          >
            <Feather name="calendar" size={20} color={C.cyan} />
            <Text style={formData.validUntil ? styles.dateText : styles.datePlaceholder}>
              {formData.validUntil || 'Select expiry date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && DateTimePicker && (
            <DateTimePicker
              value={formData.validUntil ? new Date(formData.validUntil) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
        </>
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={styles.loadingText}>Loading coupons...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A1647', '#0D1F6E', '#1034A6']} style={styles.header}>
        <Text style={styles.headerTitle}>🎫 Coupons & Offers</Text>
        <Text style={styles.headerSubtitle}>Manage your discount coupons</Text>
      </LinearGradient>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} colors={[C.cyan]} />
        }
      >
        <TouchableOpacity style={styles.addButton} onPress={handleAddCoupon}>
          <LinearGradient colors={[C.blue2, C.cyan]} style={styles.addButtonGradient}>
            <Feather name="plus" size={20} color={C.white} />
            <Text style={styles.addButtonText}>Create New Coupon</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Coupons</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: C.accentGreen }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {coupons.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="tag" size={64} color={C.textMuted} />
            <Text style={styles.emptyText}>No coupons found</Text>
            <Text style={styles.emptySubText}>Tap "Create New Coupon" to add one</Text>
          </View>
        ) : (
          coupons.map((coupon) => {
            const expired = isExpired(coupon.validUntil);
            return (
              <View key={coupon.$id} style={[styles.couponCard, (!coupon.isActive || expired) && styles.inactiveCard]}>
                <View style={styles.couponHeader}>
                  <View>
                    <Text style={styles.couponCode}>{coupon.code || 'N/A'}</Text>
                    <Text style={styles.couponDiscount}>
                      {coupon.type === 'percentage' 
                        ? `${coupon.discount || 0}% OFF` 
                        : `৳${formatNumber(coupon.discount)} OFF`}
                    </Text>
                  </View>
                  <Switch
                    value={coupon.isActive === true && !expired}
                    onValueChange={() => toggleCouponStatus(coupon)}
                    trackColor={{ false: C.textMuted, true: C.accentGreen }}
                    thumbColor={C.white}
                  />
                </View>

                <View style={styles.couponDetails}>
                  <View style={styles.detailItem}>
                    <Feather name="calendar" size={14} color={C.textMuted} />
                    <Text style={styles.detailText}>Valid until: {coupon.validUntil || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Feather name="hash" size={14} color={C.textMuted} />
                    <Text style={styles.detailText}>
                      Usage Limit: {coupon.usageLimit === 0 ? 'Unlimited' : coupon.usageLimit}
                    </Text>
                  </View>
                  {coupon.minOrderAmount && coupon.minOrderAmount > 0 && (
                    <View style={styles.detailItem}>
                      <Feather name="shopping-cart" size={14} color={C.textMuted} />
                      <Text style={styles.detailText}>Min. Order: ৳{formatNumber(coupon.minOrderAmount)}</Text>
                    </View>
                  )}
                  {coupon.description && (
                    <View style={styles.detailItem}>
                      <Feather name="info" size={14} color={C.textMuted} />
                      <Text style={styles.detailText}>{coupon.description}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.couponFooter}>
                  <TouchableOpacity style={styles.editButton} onPress={() => handleEditCoupon(coupon)}>
                    <Feather name="edit-2" size={16} color={C.blue3} />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => deleteCoupon(coupon)}>
                    <Feather name="trash-2" size={16} color={C.accentRed} />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <View style={styles.footer} />
      </ScrollView>

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => { setModalVisible(false); resetForm(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }} style={styles.modalClose}>
                <Feather name="x" size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Coupon Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., SAVE20"
                placeholderTextColor={C.textMuted}
                value={formData.code}
                onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
              />

              <Text style={styles.label}>Discount Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder={formData.type === 'percentage' ? "e.g., 20" : "e.g., 100"}
                placeholderTextColor={C.textMuted}
                value={formData.discount}
                onChangeText={(text) => setFormData({ ...formData, discount: text })}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Discount Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity 
                  style={[styles.typeButton, formData.type === 'percentage' && styles.typeButtonActive]} 
                  onPress={() => setFormData({ ...formData, type: 'percentage' })}
                >
                  <Text style={[styles.typeButtonText, formData.type === 'percentage' && styles.typeButtonTextActive]}>Percentage %</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeButton, formData.type === 'fixed' && styles.typeButtonActive]} 
                  onPress={() => setFormData({ ...formData, type: 'fixed' })}
                >
                  <Text style={[styles.typeButtonText, formData.type === 'fixed' && styles.typeButtonTextActive]}>Fixed Amount ৳</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Valid Until *</Text>
              {renderDatePicker()}

              <Text style={styles.label}>Usage Limit (0 = Unlimited)</Text>
              <TextInput
                style={styles.input}
                placeholder="100"
                placeholderTextColor={C.textMuted}
                value={formData.usageLimit}
                onChangeText={(text) => setFormData({ ...formData, usageLimit: text })}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Minimum Order Amount (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 500"
                placeholderTextColor={C.textMuted}
                value={formData.minOrderAmount}
                onChangeText={(text) => setFormData({ ...formData, minOrderAmount: text })}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Coupon description"
                placeholderTextColor={C.textMuted}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => { setModalVisible(false); resetForm(); }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]} 
                  onPress={saveCoupon} 
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator size="small" color={C.white} /> : <Text style={styles.saveButtonText}>{editingCoupon ? 'Update' : 'Create'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingText: { marginTop: 12, fontSize: 14, color: C.cyan, fontWeight: '600' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: C.white, marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: C.blue4 },
  addButton: { margin: 16, borderRadius: 12, overflow: 'hidden' },
  addButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 8 },
  addButtonText: { color: C.white, fontWeight: 'bold', fontSize: 16 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 16, gap: 10 },
  statCard: { flex: 1, backgroundColor: C.surface, padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: C.cyan, marginBottom: 4 },
  statLabel: { fontSize: 11, color: C.textMuted },
  couponCard: { backgroundColor: C.surface, margin: 12, marginTop: 0, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  inactiveCard: { opacity: 0.6 },
  couponHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  couponCode: { fontSize: 18, fontWeight: 'bold', color: C.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  couponDiscount: { fontSize: 13, color: C.accentGreen, marginTop: 4, fontWeight: '600' },
  couponDetails: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, marginTop: 4 },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  detailText: { fontSize: 12, color: C.textSecondary, flex: 1 },
  couponFooter: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, marginTop: 8, gap: 16 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editButtonText: { fontSize: 13, fontWeight: '600', color: C.blue3 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteButtonText: { fontSize: 13, fontWeight: '600', color: C.accentRed },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: C.textSecondary, marginTop: 16 },
  emptySubText: { fontSize: 14, color: C.textMuted, marginTop: 8 },
  footer: { height: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center' },
  modalContent: { backgroundColor: C.surface, margin: 20, borderRadius: 20, padding: 20, maxHeight: '85%', borderWidth: 1, borderColor: C.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: C.textPrimary },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 6, marginTop: 12, color: C.textSecondary },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: C.surfaceAlt, color: C.textPrimary },
  textArea: { height: 80, textAlignVertical: 'top' },
  typeSelector: { flexDirection: 'row', gap: 10, marginTop: 5 },
  typeButton: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center', backgroundColor: C.surfaceAlt },
  typeButtonActive: { backgroundColor: C.blue1, borderColor: C.cyan },
  typeButtonText: { color: C.textSecondary, fontWeight: '600' },
  typeButtonTextActive: { color: C.white },
  dateButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, backgroundColor: C.surfaceAlt, gap: 10 },
  dateText: { fontSize: 14, color: C.textPrimary, flex: 1 },
  datePlaceholder: { fontSize: 14, color: C.textMuted, flex: 1 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 10 },
  modalButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  cancelButton: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  cancelButtonText: { color: C.textSecondary, fontWeight: 'bold' },
  saveButton: { backgroundColor: C.blue1 },
  saveButtonText: { color: C.white, fontWeight: 'bold' },
});