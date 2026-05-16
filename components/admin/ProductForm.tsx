// components/admin/ProductForm.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageUploader } from './ImageUploader';
import { getCategories } from '../../appwrite/database';

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

// Category interface
interface Category {
  $id: string;
  name: string;
  slug: string;
  image?: string;
  isActive: boolean;
}

interface ProductFormData {
  name: string;
  price: string;
  discountPrice: string;
  description: string;
  categoryId: string;
  sizes: string[];
  colors: string[];
  stock: string;
  images: string[];
}

interface ProductFormProps {
  initialData?: ProductFormData & { $id?: string };
  onSubmit: (data: ProductFormData, images: any[]) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLOR_OPTIONS = ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Purple', 'Pink'];

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    price: '',
    discountPrice: '',
    description: '',
    categoryId: '',
    sizes: [],
    colors: [],
    stock: '',
    images: [],
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        price: String(initialData.price || ''),
        discountPrice: String(initialData.discountPrice || ''),
        description: initialData.description || '',
        categoryId: initialData.categoryId || '',
        sizes: initialData.sizes || [],
        colors: initialData.colors || [],
        stock: String(initialData.stock || ''),
        images: initialData.images || [],
      });
    }
  }, [initialData]);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleAddSize = () => {
    if (selectedSize && !formData.sizes.includes(selectedSize)) {
      setFormData({ ...formData, sizes: [...formData.sizes, selectedSize] });
      setSelectedSize('');
    }
  };

  const handleRemoveSize = (size: string) => {
    setFormData({
      ...formData,
      sizes: formData.sizes.filter((s) => s !== size),
    });
  };

  const handleAddColor = () => {
    if (selectedColor && !formData.colors.includes(selectedColor)) {
      setFormData({ ...formData, colors: [...formData.colors, selectedColor] });
      setSelectedColor('');
    }
  };

  const handleRemoveColor = (color: string) => {
    setFormData({
      ...formData,
      colors: formData.colors.filter((c) => c !== color),
    });
  };

  const getDiscountPercent = () => {
    const price = parseFloat(formData.price);
    const discountPrice = parseFloat(formData.discountPrice);
    if (!isNaN(price) && !isNaN(discountPrice) && price > 0 && discountPrice > 0 && discountPrice < price) {
      return Math.round(((price - discountPrice) / price) * 100);
    }
    return null;
  };

  const discountPercent = getDiscountPercent();

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert('Error', 'Valid price is required');
      return;
    }
    if (!formData.categoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    await onSubmit(formData, []);
  };

  const getInputStyle = (fieldName: string) => [
    styles.input,
    focusedInput === fieldName && styles.inputFocused,
  ];

  const isEditing = !!initialData;

  if (loadingCategories) {
    return (
      <LinearGradient colors={[C.surface, C.surfaceAlt]} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </LinearGradient>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Bubbles Decoration */}
      <Bubble size={150} top={-40} right={-30} opacity={0.06} />
      <Bubble size={90} bottom={-25} left={-20} opacity={0.08} color={C.purple} />
      <Bubble size={50} top={120} right={40} opacity={0.1} color={C.cyan} />

      {/* Header */}
      <LinearGradient
        colors={['#0A1647', '#0D1F6E', '#1034A6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerIcon}>
          <Feather name="package" size={28} color={C.cyan} />
        </View>
        <Text style={styles.headerTitle}>
          {isEditing ? '✏️ Edit Product' : '➕ Add New Product'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {isEditing ? 'Update your product details' : 'Create a new product for your store'}
        </Text>
      </LinearGradient>

      {/* Basic Information Section */}
      <LinearGradient colors={[C.surface, C.surfaceAlt]} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="info" size={18} color={C.cyan} />
          <Text style={styles.sectionTitle}>Basic Information</Text>
        </View>
        
        <TextInput
          style={getInputStyle('name')}
          placeholder="Product Name *"
          placeholderTextColor={C.textMuted}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          onFocus={() => setFocusedInput('name')}
          onBlur={() => setFocusedInput(null)}
        />
        
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>Price (৳)</Text>
            <TextInput
              style={getInputStyle('price')}
              placeholder="0.00"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
              onFocus={() => setFocusedInput('price')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>Discount Price</Text>
            <TextInput
              style={getInputStyle('discountPrice')}
              placeholder="0.00"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={formData.discountPrice}
              onChangeText={(text) => setFormData({ ...formData, discountPrice: text })}
              onFocus={() => setFocusedInput('discountPrice')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>
        </View>

        {discountPercent !== null && (
          <View style={styles.discountBadge}>
            <Feather name="tag" size={12} color={C.accentGreen} />
            <Text style={styles.discountText}>{discountPercent}% OFF</Text>
          </View>
        )}

        <TextInput
          style={[getInputStyle('description'), styles.textArea]}
          placeholder="Product Description"
          placeholderTextColor={C.textMuted}
          multiline
          numberOfLines={4}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          onFocus={() => setFocusedInput('description')}
          onBlur={() => setFocusedInput(null)}
        />
        
        <TextInput
          style={getInputStyle('stock')}
          placeholder="Stock Quantity *"
          placeholderTextColor={C.textMuted}
          keyboardType="numeric"
          value={formData.stock}
          onChangeText={(text) => setFormData({ ...formData, stock: text })}
          onFocus={() => setFocusedInput('stock')}
          onBlur={() => setFocusedInput(null)}
        />
      </LinearGradient>

      {/* Category Section */}
      <LinearGradient colors={[C.surface, C.surfaceAlt]} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="folder" size={18} color={C.cyan} />
          <Text style={styles.sectionTitle}>Category</Text>
        </View>
        
        {categories.length === 0 ? (
          <View style={styles.noCategoriesContainer}>
            <Feather name="alert-circle" size={24} color={C.accentOrange} />
            <Text style={styles.noCategories}>No categories found. Please add categories first.</Text>
          </View>
        ) : (
          <View style={styles.categoryContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.$id}
                style={[
                  styles.categoryChip,
                  formData.categoryId === category.$id && styles.categoryChipActive,
                ]}
                onPress={() => setFormData({ ...formData, categoryId: category.$id })}
              >
                <Text
                  style={[
                    styles.categoryText,
                    formData.categoryId === category.$id && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Sizes Section */}
      <LinearGradient colors={[C.surface, C.surfaceAlt]} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="maximize" size={18} color={C.cyan} />
          <Text style={styles.sectionTitle}>Sizes</Text>
        </View>
        
        <View style={styles.selectorContainer}>
          <View style={styles.selectorRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorOptions}>
              {SIZE_OPTIONS.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[styles.optionChip, selectedSize === size && styles.optionChipSelected]}
                  onPress={() => setSelectedSize(size)}
                >
                  <Text style={[styles.optionText, selectedSize === size && styles.optionTextSelected]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.addButton} onPress={handleAddSize}>
              <LinearGradient colors={[C.blue2, C.cyan]} style={styles.addButtonGradient}>
                <Feather name="plus" size={16} color={C.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          <View style={styles.selectedItems}>
            {formData.sizes.map((size) => (
              <View key={size} style={styles.selectedChip}>
                <Text style={styles.selectedText}>{size}</Text>
                <TouchableOpacity onPress={() => handleRemoveSize(size)}>
                  <Feather name="x" size={12} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      {/* Colors Section */}
      <LinearGradient colors={[C.surface, C.surfaceAlt]} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="droplet" size={18} color={C.cyan} />
          <Text style={styles.sectionTitle}>Colors</Text>
        </View>
        
        <View style={styles.selectorContainer}>
          <View style={styles.selectorRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorOptions}>
              {COLOR_OPTIONS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.optionChip, selectedColor === color && styles.optionChipSelected]}
                  onPress={() => setSelectedColor(color)}
                >
                  <View style={[styles.colorDot, { backgroundColor: color.toLowerCase() }]} />
                  <Text style={[styles.optionText, selectedColor === color && styles.optionTextSelected]}>
                    {color}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.addButton} onPress={handleAddColor}>
              <LinearGradient colors={[C.blue2, C.cyan]} style={styles.addButtonGradient}>
                <Feather name="plus" size={16} color={C.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          <View style={styles.selectedItems}>
            {formData.colors.map((color) => (
              <View key={color} style={styles.selectedChip}>
                <View style={[styles.smallColorDot, { backgroundColor: color.toLowerCase() }]} />
                <Text style={styles.selectedText}>{color}</Text>
                <TouchableOpacity onPress={() => handleRemoveColor(color)}>
                  <Feather name="x" size={12} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      {/* Images Section */}
      <LinearGradient colors={[C.surface, C.surfaceAlt]} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="image" size={18} color={C.cyan} />
          <Text style={styles.sectionTitle}>Product Images</Text>
        </View>
        <ImageUploader
          images={formData.images}
          onImagesChange={(images) => setFormData({ ...formData, images })}
          maxImages={5}
        />
      </LinearGradient>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={loading}>
          <LinearGradient colors={[C.surfaceAlt, C.surfaceAlt]} style={styles.cancelGradient}>
            <Feather name="x" size={18} color={C.textSecondary} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
          <LinearGradient colors={[C.blue2, C.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGradient}>
            {loading ? (
              <ActivityIndicator color={C.bg} size="small" />
            ) : (
              <>
                <Feather name={isEditing ? "check-circle" : "plus-circle"} size={18} color={C.bg} />
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Update Product' : 'Add Product'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={{ height: 30 }} />
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
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: C.textSecondary,
  },
  
  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 16,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.white,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: C.blue4,
  },
  
  // Section
  section: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
  },
  
  // Form Elements
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: C.surfaceAlt,
    color: C.textPrimary,
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
  inputLabel: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 4,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  
  // Discount Badge
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.accentGreen + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  discountText: {
    fontSize: 12,
    color: C.accentGreen,
    fontWeight: '600',
  },
  
  // Category
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.surfaceAlt,
    margin: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryChipActive: {
    backgroundColor: C.blue1,
    borderColor: C.cyan,
  },
  categoryText: {
    fontSize: 13,
    color: C.textSecondary,
  },
  categoryTextActive: {
    color: C.white,
    fontWeight: '600',
  },
  noCategoriesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  noCategories: {
    color: C.textMuted,
    textAlign: 'center',
  },
  
  // Size/Color Selector
  selectorContainer: {
    marginTop: 4,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorOptions: {
    flexDirection: 'row',
    flex: 1,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: C.surfaceAlt,
    margin: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  optionChipSelected: {
    backgroundColor: C.blue1 + '30',
    borderColor: C.cyan,
  },
  optionText: {
    fontSize: 12,
    color: C.textSecondary,
  },
  optionTextSelected: {
    color: C.cyan,
    fontWeight: '600',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  smallColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  addButton: {
    marginLeft: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  selectedText: {
    fontSize: 12,
    color: C.textPrimary,
  },
  
  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 20,
    gap: 12,
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
    flex: 2,
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
