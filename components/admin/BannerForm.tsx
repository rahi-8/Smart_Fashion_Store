// components/admin/BannerForm.tsx
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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageUploader } from './ImageUploader';

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

interface BannerFormProps {
  initialData?: {
    $id?: string;
    title: string;
    image: string;
    link?: string;
    order: number;
    isActive: boolean;
  };
  onSubmit: (data: any, imageFile?: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const BannerForm: React.FC<BannerFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    link: initialData?.link || '',
    order: String(initialData?.order || 0),
    isActive: initialData?.isActive ?? true,
  });
  const [images, setImages] = useState<string[]>(initialData?.image ? [initialData.image] : []);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (images.length === 0) {
      Alert.alert('Error', 'Banner image is required');
      return;
    }

    await onSubmit({
      ...formData,
      order: parseInt(formData.order) || 0,
      image: images[0],
    }, undefined);
  };

  const getInputStyle = (fieldName: string) => [
    styles.input,
    focusedInput === fieldName && styles.inputFocused,
  ];

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Bubbles Decoration */}
      <Bubble size={150} top={-50} right={-40} opacity={0.08} />
      <Bubble size={100} bottom={-30} left={-25} opacity={0.1} color={C.purple} />
      <Bubble size={60} top={80} right={30} opacity={0.12} color={C.cyan} />
      <Bubble size={40} bottom={100} right={50} opacity={0.15} color={C.indigo} />
      <Bubble size={25} top={150} left={20} opacity={0.18} color={C.cyan} />
      <Bubble size={15} bottom={200} left={80} opacity={0.22} color={C.white} />
      <GlowRing size={160} top={-55} right={-45} opacity={0.12} />
      <GlowRing size={110} bottom={-35} left={-30} color={C.purple} />
      <GlowRing size={65} top={75} right={25} color={C.blue4} />

      {/* Header Section */}
      <LinearGradient
        colors={['#0A1647', '#0D1F6E', '#1034A6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerIcon}>
          <Feather name="image" size={28} color={C.cyan} />
        </View>
        <Text style={styles.title}>{initialData ? '✏️ Edit Banner' : '➕ Add New Banner'}</Text>
        <Text style={styles.subtitle}>
          {initialData ? 'Update your existing banner' : 'Create a new homepage banner'}
        </Text>
      </LinearGradient>

      {/* Form Section */}
      <View style={styles.formSection}>
        {/* Banner Title */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Feather name="flag" size={16} color={C.cyan} />
            <Text style={styles.label}>Banner Title</Text>
          </View>
          <TextInput
            style={getInputStyle('title')}
            placeholder="e.g., Summer Sale 2024"
            placeholderTextColor={C.textMuted}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            onFocus={() => setFocusedInput('title')}
            onBlur={() => setFocusedInput(null)}
          />
          <Text style={styles.hintText}>Optional - Helps identify the banner</Text>
        </View>

        {/* Link URL */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Feather name="link" size={16} color={C.cyan} />
            <Text style={styles.label}>Link URL</Text>
          </View>
          <TextInput
            style={getInputStyle('link')}
            placeholder="https://yourstore.com/category/summer"
            placeholderTextColor={C.textMuted}
            value={formData.link}
            onChangeText={(text) => setFormData({ ...formData, link: text })}
            onFocus={() => setFocusedInput('link')}
            onBlur={() => setFocusedInput(null)}
            autoCapitalize="none"
          />
          <Text style={styles.hintText}>Where users go when they tap the banner</Text>
        </View>

        {/* Display Order */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Feather name="layers" size={16} color={C.cyan} />
            <Text style={styles.label}>Display Order</Text>
          </View>
          <TextInput
            style={getInputStyle('order')}
            placeholder="0"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
            value={formData.order}
            onChangeText={(text) => setFormData({ ...formData, order: text })}
            onFocus={() => setFocusedInput('order')}
            onBlur={() => setFocusedInput(null)}
          />
          <Text style={styles.hintText}>Lower numbers appear first (0 = first position)</Text>
        </View>

        {/* Banner Image Upload */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Feather name="image" size={16} color={C.accentGreen} />
            <Text style={[styles.label, { color: C.accentGreen }]}>Banner Image *</Text>
          </View>
          <View style={styles.imageUploadWrapper}>
            <ImageUploader
              images={images}
              onImagesChange={setImages}
              maxImages={1}
              title="Upload Banner Image"
            />
          </View>
          <Text style={styles.hintText}>Recommended size: 1200 x 400 pixels</Text>
        </View>

        {/* Active Status Toggle */}
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
                <Text style={styles.statusLabel}>Banner Status</Text>
                <Text style={styles.statusText}>
                  {formData.isActive ? 'Banner is visible on homepage' : 'Banner is hidden'}
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
                  <Feather name={initialData ? "check-circle" : "plus-circle"} size={18} color={C.bg} />
                  <Text style={styles.submitButtonText}>
                    {initialData ? 'Update Banner' : 'Create Banner'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Preview Section (if editing) */}
        {initialData && images.length > 0 && (
          <View style={styles.previewSection}>
            <LinearGradient
              colors={[C.surface, C.surfaceAlt]}
              style={styles.previewCard}
            >
              <View style={styles.previewHeader}>
                <Feather name="eye" size={16} color={C.cyan} />
                <Text style={styles.previewTitle}>Preview</Text>
              </View>
              <View style={styles.previewContent}>
                <View style={styles.previewDot} />
                <Text style={styles.previewText}>Banner will appear on homepage</Text>
              </View>
            </LinearGradient>
          </View>
        )}
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
  
  // Image Upload
  imageUploadWrapper: {
    marginTop: 4,
  },
  
  // Status Card
  statusCard: {
    marginBottom: 24,
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
  
  // Button Container
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
  
  // Preview Section
  previewSection: {
    marginTop: 8,
  },
  previewCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textPrimary,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accentGreen,
  },
  previewText: {
    fontSize: 12,
    color: C.textSecondary,
  },
});
