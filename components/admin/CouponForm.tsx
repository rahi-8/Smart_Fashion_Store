// components/admin/CouponForm.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

// Dark Blue Theme Colors
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

// Bubble Component
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

// Glow Ring Component
const GlowRing = ({ size, top, bottom, left, right, opacity = 0.18, color = C.cyan }: any) => (
  <View style={{
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: color,
    opacity,
    top, bottom, left, right,
  }} />
);

interface CouponFormProps {
  initialData?: {
    $id?: string;
    code: string;
    discountPercent: number;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    expiryDate: string;
    minPurchase?: number;
    maxDiscount?: number;
    usageLimit?: number;
    usedCount?: number;
    isActive: boolean;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const CouponForm: React.FC<CouponFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    initialData?.discountType || 'percentage'
  );
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    discountValue: String(initialData?.discountValue || initialData?.discountPercent || ''),
    minPurchase: String(initialData?.minPurchase || '0'),
    maxDiscount: String(initialData?.maxDiscount || ''),
    usageLimit: String(initialData?.usageLimit || ''),
    isActive: initialData?.isActive ?? true,
  });
  const [expiryDate, setExpiryDate] = useState(
    initialData?.expiryDate ? new Date(initialData.expiryDate) : new Date(Date.now() + 30 * 86400000)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const generateCouponCode = () => {
    const prefixes = ['SAVE', 'DEAL', 'OFFER', 'FLAT', 'SUPER', 'MEGA', 'HOT'];
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    setFormData({ ...formData, code: `${prefix}${suffix}` });
  };

  const handleSubmit = async () => {
    if (!formData.code.trim()) {
      Alert.alert('Error', 'Coupon code is required');
      return;
    }
    if (!formData.discountValue || parseFloat(formData.discountValue) <= 0) {
      Alert.alert('Error', `Valid ${discountType === 'percentage' ? 'discount percentage' : 'discount amount'} is required`);
      return;
    }
    if (expiryDate <= new Date()) {
      Alert.alert('Error', 'Expiry date must be in the future');
      return;
    }

    const discountValueNum = parseFloat(formData.discountValue);
    
    if (discountType === 'percentage' && discountValueNum > 100) {
      Alert.alert('Error', 'Discount percentage cannot exceed 100%');
      return;
    }

    await onSubmit({
      code: formData.code.toUpperCase(),
      discountType: discountType,
      discountValue: discountValueNum,
      minPurchase: parseFloat(formData.minPurchase) || 0,
      maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
      expiryDate: expiryDate.toISOString(),
      isActive: formData.isActive,
    });
  };

  const getInputStyle = (fieldName: string) => [
    styles.input,
    focusedInput === fieldName && styles.inputFocused,
  ];

  const getDiscountPreview = () => {
    const value = parseFloat(formData.discountValue);
    if (isNaN(value)) return null;
    if (discountType === 'percentage') {
      return `${value}% OFF`;
    }
    return `৳${value} OFF`;
  };

  const isEditing = !!initialData;

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Bubbles Decoration */}
      <Bubble size={150} top={-45} right={-35} opacity={0.08} />
      <Bubble size={100} bottom={-30} left={-25} opacity={0.1} color={C.purple} />
      <Bubble size={60} top={80} right={30} opacity={0.12} color={C.cyan} />
      <Bubble size={40} bottom={100} right={50} opacity={0.15} color={C.indigo} />
      <Bubble size={25} top={150} left={20} opacity={0.18} color={C.cyan} />
      <GlowRing size={160} top={-50} right={-40} opacity={0.12} />
      <GlowRing size={110} bottom={-35} left={-30} color={C.purple} />

      {/* Header Section */}
      <LinearGradient
        colors={['#0A1647', '#0D1F6E', '#1034A6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerIcon}>
          <Feather name="tag" size={28} color={C.cyan} />
        </View>
        <Text style={styles.title}>
          {isEditing ? '✏️ Edit Coupon' : '🎟️ Create New Coupon'}
        </Text>
        <Text style={styles.subtitle}>
          {isEditing 
            ? 'Update your existing coupon details' 
            : 'Create a discount coupon for your customers'}
        </Text>
        
        {isEditing && initialData?.usedCount !== undefined && (
          <View style={styles.infoBadge}>
            <Feather name="users" size={14} color={C.cyan} />
            <Text style={styles.infoBadgeText}>
              Used {initialData.usedCount} times
              {initialData.usageLimit ? ` / ${initialData.usageLimit} limit` : ''}
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Form Section */}
      <View style={styles.formSection}>
        {/* Coupon Code */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Feather name="hash" size={16} color={C.cyan} />
            <Text style={styles.label}>Coupon Code *</Text>
          </View>
          <View style={styles.codeRow}>
            <TextInput
              style={[getInputStyle('code'), styles.codeInput]}
              placeholder="e.g., SUMMER2024"
              placeholderTextColor={C.textMuted}
              value={formData.code}
              onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
              onFocus={() => setFocusedInput('code')}
              onBlur={() => setFocusedInput(null)}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.generateBtn} onPress={generateCouponCode}>
              <LinearGradient colors={[C.purple, C.indigo]} style={styles.generateGradient}>
                <Feather name="shuffle" size={16} color={C.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>Use a unique, memorable code (e.g., SAVE20, FLAT50)</Text>
        </View>

        {/* Discount Type Selector */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Feather name="percent" size={16} color={C.cyan} />
            <Text style={styles.label}>Discount Type *</Text>
          </View>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeButton, discountType === 'percentage' && styles.typeButtonActive]}
              onPress={() => setDiscountType('percentage')}
            >
              <Text style={[styles.typeText, discountType === 'percentage' && styles.typeTextActive]}>
                Percentage (%)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, discountType === 'fixed' && styles.typeButtonActive]}
              onPress={() => setDiscountType('fixed')}
            >
              <Text style={[styles.typeText, discountType === 'fixed' && styles.typeTextActive]}>
                Fixed Amount (৳)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Discount Value */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Feather name="gift" size={16} color={C.accentGreen} />
            <Text style={styles.label}>
              {discountType === 'percentage' ? 'Discount Percentage *' : 'Discount Amount *'}
            </Text>
          </View>
          <View style={styles.amountInputContainer}>
            {discountType === 'fixed' && (
              <View style={styles.currencyPrefix}>
                <Text style={styles.currencyText}>৳</Text>
              </View>
            )}
            <TextInput
              style={[
                getInputStyle('discountValue'),
                styles.amountInput,
                discountType === 'fixed' && { paddingLeft: 40 }
              ]}
              placeholder={discountType === 'percentage' ? 'e.g., 20' : 'e.g., 100'}
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={formData.discountValue}
              onChangeText={(text) => setFormData({ ...formData, discountValue: text })}
              onFocus={() => setFocusedInput('discountValue')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>
          {getDiscountPreview() && (
            <View style={styles.discountPreview}>
              <Feather name="zap" size={12} color={C.accentGreen} />
              <Text style={styles.discountPreviewText}>
                Customers will get {getDiscountPreview()}
              </Text>
            </View>
          )}
        </View>

        {/* Minimum Purchase */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Feather name="shopping-bag" size={16} color={C.cyan} />
            <Text style={styles.label}>Minimum Purchase (৳)</Text>
          </View>
          <TextInput
            style={getInputStyle('minPurchase')}
            placeholder="0 (no minimum)"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
            value={formData.minPurchase}
            onChangeText={(text) => setFormData({ ...formData, minPurchase: text })}
            onFocus={() => setFocusedInput('minPurchase')}
            onBlur={() => setFocusedInput(null)}
          />
          <Text style={styles.hintText}>Minimum order amount required to use this coupon</Text>
        </View>

        {/* Maximum Discount (for percentage only) */}
        {discountType === 'percentage' && (
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Feather name="arrow-up" size={16} color={C.accentOrange} />
              <Text style={styles.label}>Maximum Discount (৳)</Text>
            </View>
            <TextInput
              style={getInputStyle('maxDiscount')}
              placeholder="Optional - max discount amount"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={formData.maxDiscount}
              onChangeText={(text) => setFormData({ ...formData, maxDiscount: text })}
              onFocus={() => setFocusedInput('maxDiscount')}
              onBlur={() => setFocusedInput(null)}
            />
            <Text style={styles.hintText}>Example: 20% off, max ৳500 discount</Text>
          </View>
        )}

        {/* Usage Limit */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Feather name="users" size={16} color={C.cyan} />
            <Text style={styles.label}>Usage Limit</Text>
          </View>
          <TextInput
            style={getInputStyle('usageLimit')}
            placeholder="Unlimited (leave empty)"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
            value={formData.usageLimit}
            onChangeText={(text) => setFormData({ ...formData, usageLimit: text })}
            onFocus={() => setFocusedInput('usageLimit')}
            onBlur={() => setFocusedInput(null)}
          />
          <Text style={styles.hintText}>Maximum number of times this coupon can be used</Text>
        </View>

        {/* Expiry Date Picker */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Feather name="calendar" size={16} color={C.accentOrange} />
            <Text style={styles.label}>Expiry Date *</Text>
          </View>
          <TouchableOpacity 
            style={[styles.dateButton, focusedInput === 'expiry' && styles.inputFocused]}
            onPress={() => setShowDatePicker(true)}
            onFocus={() => setFocusedInput('expiry')}
          >
            <Feather name="calendar" size={18} color={C.accentOrange} />
            <Text style={styles.dateText}>
              {expiryDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
            <Feather name="chevron-down" size={16} color={C.textMuted} />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={expiryDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setExpiryDate(selectedDate);
              }}
              minimumDate={new Date()}
            />
          )}
          <Text style={styles.hintText}>Coupon will expire on this date</Text>
        </View>

        {/* Active Status */}
        <View style={styles.statusCard}>
          <LinearGradient
            colors={[C.surface, C.surfaceAlt]}
            style={styles.statusGradient}
          >
            <View style={styles.statusLeft}>
              <View style={styles.statusIcon}>
                <Feather name={formData.isActive ? "check-circle" : "circle"} size={20} color={formData.isActive ? C.accentGreen : C.textMuted} />
              </View>
              <View>
                <Text style={styles.statusLabel}>Coupon Status</Text>
                <Text style={styles.statusText}>
                  {formData.isActive ? 'Coupon is active and usable' : 'Coupon is disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={formData.isActive}
              onValueChange={(value) => setFormData({ ...formData, isActive: value })}
              trackColor={{ false: C.border, true: C.cyan }}
              thumbColor={C.white}
            />
          </LinearGradient>
        </View>

        {/* Preview Card */}
        {formData.code && getDiscountPreview() && (
          <View style={styles.previewCard}>
            <LinearGradient
              colors={[C.surface, C.surfaceAlt]}
              style={styles.previewGradient}
            >
              <View style={styles.previewHeader}>
                <Feather name="eye" size={14} color={C.cyan} />
                <Text style={styles.previewTitle}>Coupon Preview</Text>
              </View>
              <View style={styles.previewContent}>
                <View style={styles.previewCodeBox}>
                  <Text style={styles.previewCode}>{formData.code.toUpperCase()}</Text>
                </View>
                <View style={styles.previewDiscountBox}>
                  <Text style={styles.previewDiscount}>{getDiscountPreview()}</Text>
                  {parseFloat(formData.minPurchase) > 0 && (
                    <Text style={styles.previewMin}>Min: ৳{formData.minPurchase}</Text>
                  )}
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onCancel} 
            disabled={loading}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[C.surfaceAlt, C.surfaceAlt]}
              style={styles.cancelGradient}
            >
              <Feather name="x" size={18} color={C.textSecondary} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handleSubmit} 
            disabled={loading}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[C.blue2, C.cyan]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color={C.bg} size="small" />
              ) : (
                <>
                  <Feather name={isEditing ? "check-circle" : "plus-circle"} size={18} color={C.bg} />
                  <Text style={styles.submitButtonText}>
                    {isEditing ? 'Update Coupon' : 'Create Coupon'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  
  // Header Section
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    overflow: 'hidden',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,229,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.cyan + '30',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: C.blue4,
    textAlign: 'center',
    marginBottom: 12,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,229,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  infoBadgeText: {
    fontSize: 12,
    color: C.cyan,
    fontWeight: '500',
  },
  
  // Form Section
  formSection: {
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: C.textPrimary,
    backgroundColor: C.surface,
  },
  inputFocused: {
    borderColor: C.cyan,
    borderWidth: 2,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  hintText: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 6,
    marginLeft: 4,
  },
  
  // Code Row
  codeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  codeInput: {
    flex: 1,
  },
  generateBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  generateGradient: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Discount Type
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  typeButtonActive: {
    backgroundColor: C.blue1,
    borderColor: C.cyan,
  },
  typeText: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: '500',
  },
  typeTextActive: {
    color: C.white,
    fontWeight: '600',
  },
  
  // Amount Input
  amountInputContainer: {
    position: 'relative',
  },
  currencyPrefix: {
    position: 'absolute',
    left: 14,
    top: 14,
    zIndex: 1,
  },
  currencyText: {
    fontSize: 16,
    color: C.textMuted,
    fontWeight: '600',
  },
  amountInput: {
    width: '100%',
  },
  discountPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: C.accentGreen + '15',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  discountPreviewText: {
    fontSize: 12,
    color: C.accentGreen,
    fontWeight: '500',
  },
  
  // Date Button
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: C.surface,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
  },
  
  // Status Card
  statusCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statusGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,229,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 11,
    color: C.textMuted,
  },
  
  // Preview Card
  previewCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textPrimary,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewCodeBox: {
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewCode: {
    fontSize: 16,
    fontWeight: '700',
    color: C.cyan,
    fontFamily: 'monospace',
  },
  previewDiscountBox: {
    alignItems: 'flex-end',
  },
  previewDiscount: {
    fontSize: 16,
    fontWeight: '700',
    color: C.accentGreen,
  },
  previewMin: {
    fontSize: 11,
    color: C.textMuted,
  },
  
  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelButtonText: {
    color: C.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonText: {
    color: C.bg,
    fontSize: 15,
    fontWeight: '700',
  },
});
