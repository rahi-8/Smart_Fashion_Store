//product.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert,
  ActivityIndicator, SafeAreaView, Image, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { DataTable } from '../../components/admin/DataTable';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { databases, DATABASE_ID, COLLECTIONS, ID, storage, STORAGE_BUCKETS } from '../../appwrite/config';
import { Query } from 'appwrite';

// Palette 
const C = {
  bg: '#060B1F', surface: '#0D1535', surfaceAlt: '#111C42', border: '#1E2D60',
  blue1: '#1565C0', blue2: '#1976D2', blue3: '#42A5F5', blue4: '#90CAF9',
  cyan: '#00E5FF', purple: '#7C4DFF', indigo: '#3D5AFE',
  accentGreen: '#00E676', accentOrange: '#FFB300', accentRed: '#FF5252',
  textPrimary: '#E8EAF6', textSecondary: '#9FA8DA', textMuted: '#4A5580', white: '#FFFFFF',
};

export default function ProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [productModalVisible, setProductModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  const [productForm, setProductForm] = useState({
    name: '', price: '', discountPrice: '', description: '', categoryId: '',
    sizes: [] as string[], colors: [] as string[], stock: '',
  });
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '' });
  const [customColor, setCustomColor] = useState('');
  const [customSize, setCustomSize] = useState('');

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newLocalImages, setNewLocalImages] = useState<string[]>([]);

  const allDisplayImages = [...existingImages, ...newLocalImages];

  const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const COLOR_OPTIONS = ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Purple', 'Pink', 'Orange', 'Brown', 'Gray', 'Navy', 'Maroon', 'Cyan'];

  const discountPercent = (() => {
    const p = parseFloat(productForm.price), d = parseFloat(productForm.discountPrice);
    if (!isNaN(p) && !isNaN(d) && p > 0 && d > 0 && d < p) return Math.round(((p - d) / p) * 100);
    return null;
  })();

  // Filter products by category
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.$id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: products.length,
    active: products.filter(p => p.isActive).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
    outOfStock: products.filter(p => p.stock === 0).length,
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, [Query.orderDesc('$createdAt')]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.CATEGORIES, [Query.orderAsc('name')])
      ]);
      setProducts(productsRes.documents);
      setCategories(categoriesRes.documents);
      console.log('📦 Loaded:', productsRes.documents.length, 'products,', categoriesRes.documents.length, 'categories');
    } catch (err: any) {
      console.error('Load error:', err);
      Alert.alert('Error', 'Failed to load data: ' + err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ✅ SIMPLE UPLOAD FUNCTION (No FileSystem issues)
  const uploadImageToAppwrite = async (imageUri: string): Promise<string> => {
    try {
      const filename = `product_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      console.log('📤 Starting upload:', filename);

      // Fetch image as blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'image/jpeg' });

      console.log('📄 File size:', file.size, 'bytes');

      const uploadResponse = await storage.createFile(
        STORAGE_BUCKETS.PRODUCT_IMAGES,
        ID.unique(),
        file
      );

      const imageUrl = `https://tor.cloud.appwrite.io/v1/storage/buckets/${STORAGE_BUCKETS.PRODUCT_IMAGES}/files/${uploadResponse.$id}/view?project=69ce028900081643e1c3`;
      console.log('✅ Upload success:', imageUrl);
      return imageUrl;
    } catch (err: any) {
      console.error('❌ Upload error:', err);
      throw new Error(err.message || 'Upload failed');
    }
  };

  // ✅ Pick multiple images
  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant camera roll permission');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uris = result.assets.map(asset => asset.uri);
        setNewLocalImages(prev => [...prev, ...uris]);
        Alert.alert('Success', `${uris.length} image(s) selected`);
      }
    } catch (error) {
      console.error('Pick images error:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    Alert.alert('Remove Image', 'Remove this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (index < existingImages.length) {
            const imgs = [...existingImages];
            imgs.splice(index, 1);
            setExistingImages(imgs);
          } else {
            const imgs = [...newLocalImages];
            imgs.splice(index - existingImages.length, 1);
            setNewLocalImages(imgs);
          }
        },
      },
    ]);
  };

  const setPrimaryImage = (index: number) => {
    if (index === 0) return;
    const combined = [...allDisplayImages];
    const [primary] = combined.splice(index, 1);
    const reordered = [primary, ...combined];
    const newExisting: string[] = [];
    const newLocal: string[] = [];
    reordered.forEach(uri => {
      if (uri.includes('appwrite.io')) newExisting.push(uri);
      else newLocal.push(uri);
    });
    setExistingImages(newExisting);
    setNewLocalImages(newLocal);
  };

  const toggleSize = (size: string) => {
    setProductForm(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter(s => s !== size) : [...prev.sizes, size]
    }));
  };

  const addCustomSize = () => {
    if (customSize.trim() && !productForm.sizes.includes(customSize.trim())) {
      setProductForm(prev => ({
        ...prev,
        sizes: [...prev.sizes, customSize.trim().toUpperCase()]
      }));
      setCustomSize('');
    }
  };

  const toggleColor = (color: string) => {
    setProductForm(prev => ({
      ...prev,
      colors: prev.colors.includes(color) ? prev.colors.filter(c => c !== color) : [...prev.colors, color]
    }));
  };

  const addCustomColor = () => {
    if (customColor.trim() && !productForm.colors.includes(customColor.trim())) {
      setProductForm(prev => ({
        ...prev,
        colors: [...prev.colors, customColor.trim()]
      }));
      setCustomColor('');
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '', price: '', discountPrice: '', description: '',
      categoryId: categories[0]?.$id || '', sizes: [], colors: [], stock: ''
    });
    setExistingImages([]);
    setNewLocalImages([]);
    setProductModalVisible(true);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: String(product.price),
      discountPrice: product.discountPrice ? String(product.discountPrice) : '',
      description: product.description || '',
      categoryId: product.categoryId,
      sizes: product.sizes || [],
      colors: product.colors || [],
      stock: String(product.stock),
    });
    setExistingImages(product.images || []);
    setNewLocalImages([]);
    setProductModalVisible(true);
  };

  const handleViewProduct = (product: any) => {
    setViewingProduct(product);
    setViewModalVisible(true);
  };

  const handleDeleteProduct = async (product: any) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoadingAction(true);
            try {
              if (product.images && product.images.length > 0) {
                for (const imageUrl of product.images) {
                  try {
                    const match = imageUrl.match(/files\/([^\/]+)\/view/);
                    const fileId = match ? match[1] : null;
                    if (fileId) {
                      await storage.deleteFile(STORAGE_BUCKETS.PRODUCT_IMAGES, fileId);
                    }
                  } catch (err) {
                    console.error('Failed to delete image:', err);
                  }
                }
              }

              await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, product.$id);
              Alert.alert('✅ Success', 'Product deleted successfully');
              await loadData();
            } catch (err: any) {
              console.error('Delete error:', err);
              Alert.alert('Delete Failed', err?.message || 'Could not delete product');
            } finally {
              setLoadingAction(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) {
      Alert.alert('Error', 'Product name required');
      return;
    }
    if (!productForm.price || parseFloat(productForm.price) <= 0) {
      Alert.alert('Error', 'Valid price required');
      return;
    }
    if (!productForm.categoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setLoadingAction(true);
    try {
      const uploadedUrls: string[] = [];
      if (newLocalImages.length > 0) {
        for (const localUri of newLocalImages) {
          try {
            const url = await uploadImageToAppwrite(localUri);
            uploadedUrls.push(url);
          } catch (err) {
            console.error('Failed to upload image:', err);
            Alert.alert('Upload Error', 'Some images failed to upload');
          }
        }
      }

      const allImages = [...existingImages, ...uploadedUrls];

      if (editingProduct) {
        const oldImages = editingProduct.images || [];
        const removedImages = oldImages.filter((img: string) => !existingImages.includes(img));

        for (const oldImageUrl of removedImages) {
          try {
            const match = oldImageUrl.match(/files\/([^\/]+)\/view/);
            const fileId = match ? match[1] : null;
            if (fileId) {
              await storage.deleteFile(STORAGE_BUCKETS.PRODUCT_IMAGES, fileId);
            }
          } catch (err) {
            console.error('Failed to delete old image:', err);
          }
        }
      }

      const productData = {
        name: productForm.name,
        price: parseFloat(productForm.price),
        discountPrice: productForm.discountPrice ? parseFloat(productForm.discountPrice) : null,
        description: productForm.description,
        categoryId: productForm.categoryId,
        sizes: productForm.sizes,
        colors: productForm.colors,
        stock: parseInt(productForm.stock) || 0,
        isActive: true,
        images: allImages,
      };

      if (editingProduct) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, editingProduct.$id, productData);
        Alert.alert('✅ Success', 'Product updated successfully');
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, ID.unique(), productData);
        Alert.alert('✅ Success', 'Product added successfully');
      }

      setProductModalVisible(false);
      await loadData();
    } catch (err: any) {
      console.error('Save error:', err);
      Alert.alert('Error', err.message || 'Failed to save product');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleActive = async (product: any) => {
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, product.$id, { isActive: !product.isActive });
      await loadData();
      Alert.alert('✅ Success', `Product ${!product.isActive ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      Alert.alert('Error', 'Status update failed');
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', slug: '', description: '' });
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, slug: cat.slug, description: cat.description || '' });
    setCategoryModalVisible(true);
  };

  const handleDeleteCategory = async (cat: any) => {
    const productsInCategory = products.filter(p => p.categoryId === cat.$id);
    if (productsInCategory.length > 0) {
      Alert.alert('Cannot Delete', `This category has ${productsInCategory.length} products. Please move or delete them first.`);
      return;
    }

    Alert.alert('Delete Category', `Delete "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoadingAction(true);
          try {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CATEGORIES, cat.$id);
            Alert.alert('✅ Success', 'Category deleted successfully');
            await loadData();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setLoadingAction(false);
          }
        },
      },
    ]);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      Alert.alert('Error', 'Category name required');
      return;
    }

    setLoadingAction(true);
    const slug = categoryForm.slug || categoryForm.name.toLowerCase().replace(/\s+/g, '-');
    const data = { 
      name: categoryForm.name, 
      slug, 
      description: categoryForm.description,
      isActive: true,
    };

    try {
      if (editingCategory) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.CATEGORIES, editingCategory.$id, data);
        Alert.alert('✅ Success', 'Category updated');
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.CATEGORIES, ID.unique(), data);
        Alert.alert('✅ Success', 'Category added');
      }
      setCategoryModalVisible(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save category');
    } finally {
      setLoadingAction(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.$id === categoryId);
    return cat?.name || 'Uncategorized';
  };

  const productColumns = [
    {
      key: 'images', title: 'IMG', width: 60,
      render: (item: any) => (
        <TouchableOpacity onPress={() => handleViewProduct(item)}>
          {item.images?.length > 0 ?
            <Image source={{ uri: item.images[0] }} style={s.tableImage} resizeMode="cover" /> :
            <View style={s.tableImagePlaceholder}>
              <Feather name="image" size={20} color={C.textMuted} />
            </View>
          }
        </TouchableOpacity>
      )
    },
    { key: 'name', title: 'PRODUCT', sortable: true, render: (item: any) => (
      <TouchableOpacity onPress={() => handleViewProduct(item)}>
        <Text style={s.productName}>{item.name}</Text>
        <Text style={s.productCategory}>{getCategoryName(item.categoryId)}</Text>
      </TouchableOpacity>
    )},
    {
      key: 'price', title: 'PRICE', sortable: true, width: 100,
      render: (item: any) => {
        const hasDiscount = item.discountPrice && item.discountPrice < item.price;
        return (
          <View>
            {hasDiscount && <Text style={s.originalPrice}>৳{item.price}</Text>}
            <Text style={[s.currentPrice, hasDiscount && { color: C.accentGreen }]}>
              ৳{hasDiscount ? item.discountPrice : item.price}
            </Text>
          </View>
        );
      }
    },
    {
      key: 'stock', title: 'STOCK', width: 80,
      render: (item: any) => (
        <View style={{ alignItems: 'center' }}>
          <StatusBadge status={item.stock > 10 ? 'in' : item.stock > 0 ? 'low' : 'out'} type="stock" />
          <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{item.stock} left</Text>
        </View>
      )
    },
    {
      key: 'isActive', title: 'STATUS', width: 80,
      render: (item: any) => (
        <TouchableOpacity onPress={() => handleToggleActive(item)}>
          <StatusBadge status={item.isActive ? 'active' : 'inactive'} type="status" />
        </TouchableOpacity>
      )
    },
  ];

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#0A1647', '#0D1F6E', '#1034A6']} style={s.statsHeader}>
        <View style={s.statsBarInner}>
          {[
            { val: stats.total, label: 'Total', color: C.blue4, icon: 'package' },
            { val: stats.active, label: 'Active', color: C.accentGreen, icon: 'check-circle' },
            { val: stats.lowStock, label: 'Low Stock', color: C.accentOrange, icon: 'alert-triangle' },
            { val: stats.outOfStock, label: 'No Stock', color: C.accentRed, icon: 'x-circle' },
          ].map((item, i, arr) => (
            <React.Fragment key={i}>
              <View style={s.statItem}>
                <Feather name={item.icon as any} size={13} color={item.color} />
                <Text style={[s.statValue, { color: item.color }]}>{item.val}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={s.statDivider} />}
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
        <TouchableOpacity 
          style={[s.filterChip, selectedCategory === 'all' && s.filterChipActive]}
          onPress={() => setSelectedCategory('all')}>
          <Text style={[s.filterChipText, selectedCategory === 'all' && s.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.$id}
            style={[s.filterChip, selectedCategory === cat.$id && s.filterChipActive]}
            onPress={() => setSelectedCategory(cat.$id)}>
            <Text style={[s.filterChipText, selectedCategory === cat.$id && s.filterChipTextActive]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search Bar */}
      <View style={s.searchBar}>
        <Feather name="search" size={18} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search products..."
          placeholderTextColor={C.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Header with Add Button */}
      <View style={s.header}>
        <Text style={s.title}>Products ({filteredProducts.length})</Text>
        <TouchableOpacity style={s.addButton} onPress={handleAddProduct} disabled={loadingAction}>
          <LinearGradient colors={[C.blue2, C.cyan]} style={s.addButtonGradient}>
            <Feather name="plus" size={16} color={C.bg} />
            <Text style={s.addButtonText}>Add Product</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Category Management Section */}
      <View style={s.categorySection}>
        <Text style={s.categorySectionTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map(cat => (
            <View key={cat.$id} style={s.categoryCard}>
              <Text style={s.categoryCardName}>{cat.name}</Text>
              <View style={s.categoryCardActions}>
                <TouchableOpacity onPress={() => handleEditCategory(cat)}>
                  <Feather name="edit-2" size={14} color={C.cyan} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteCategory(cat)}>
                  <Feather name="trash-2" size={14} color={C.accentRed} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity style={s.addCategoryCard} onPress={handleAddCategory}>
            <Feather name="plus" size={20} color={C.cyan} />
            <Text style={s.addCategoryCardText}>Add Category</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Data Table - FIXED SCROLLING */}
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}>
        <DataTable 
          columns={productColumns} 
          data={filteredProducts} 
          loading={loading} 
          onEdit={handleEditProduct} 
          onDelete={handleDeleteProduct} 
        />
      </ScrollView>

      {/* PRODUCT MODAL  */}
      <Modal animationType="slide" transparent visible={productModalVisible} onRequestClose={() => setProductModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalWrapper}>
            <LinearGradient colors={['#0A1647', '#0D1F6E']} style={s.modalHeaderGradient}>
              <View style={s.modalHeaderContent}>
                <Text style={s.modalTitle}>{editingProduct ? '✏️ Edit Product' : '➕ Add Product'}</Text>
                <TouchableOpacity onPress={() => setProductModalVisible(false)} style={s.modalCloseBtn}>
                  <Feather name="x" size={22} color={C.white} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
              {/* Category Selection */}
              <Text style={s.label}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categorySelectScroll}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.$id}
                    style={[s.categorySelectChip, productForm.categoryId === cat.$id && s.categorySelectChipActive]}
                    onPress={() => setProductForm({ ...productForm, categoryId: cat.$id })}>
                    <Text style={[s.categorySelectText, productForm.categoryId === cat.$id && s.categorySelectTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Basic Info */}
              <Text style={s.label}>Product Name *</Text>
              <TextInput style={s.input} placeholder="Product name" placeholderTextColor={C.textMuted} value={productForm.name} onChangeText={t => setProductForm({ ...productForm, name: t })} />

              <View style={s.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={s.label}>Price *</Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={productForm.price} onChangeText={t => setProductForm({ ...productForm, price: t })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Discount Price</Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={productForm.discountPrice} onChangeText={t => setProductForm({ ...productForm, discountPrice: t })} />
                </View>
              </View>

              {discountPercent && (
                <View style={s.discountInfo}>
                  <Text style={s.discountInfoText}>🔥 {discountPercent}% OFF Applied!</Text>
                </View>
              )}

              <View style={s.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={s.label}>Stock</Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={productForm.stock} onChangeText={t => setProductForm({ ...productForm, stock: t })} />
                </View>
              </View>

              <Text style={s.label}>Description</Text>
              <TextInput style={[s.input, s.textArea]} placeholder="Description" placeholderTextColor={C.textMuted} multiline numberOfLines={3} value={productForm.description} onChangeText={t => setProductForm({ ...productForm, description: t })} />

              {/* Sizes Section */}
              <View style={s.section}>
                <Text style={s.label}>📏 Sizes</Text>
                <View style={s.optionsGrid}>
                  {SIZE_OPTIONS.map(size => (
                    <TouchableOpacity key={size} style={[s.optionChip, productForm.sizes.includes(size) && s.optionChipActive]} onPress={() => toggleSize(size)}>
                      <Text style={[s.optionChipText, productForm.sizes.includes(size) && s.optionChipTextActive]}>{size}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.customInputRow}>
                  <TextInput style={s.customInput} placeholder="Custom size (e.g., 3XL)" placeholderTextColor={C.textMuted} value={customSize} onChangeText={setCustomSize} />
                  <TouchableOpacity style={s.customAddBtn} onPress={addCustomSize}>
                    <LinearGradient colors={[C.blue2, C.cyan]} style={s.customAddGradient}>
                      <Feather name="plus" size={14} color={C.bg} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Colors Section */}
              <View style={s.section}>
                <Text style={s.label}>🎨 Colors</Text>
                <View style={s.optionsGrid}>
                  {COLOR_OPTIONS.map(color => (
                    <TouchableOpacity key={color} style={[s.colorChip, productForm.colors.includes(color) && s.colorChipActive]} onPress={() => toggleColor(color)}>
                      <View style={[s.colorDot, { backgroundColor: color.toLowerCase() }]} />
                      <Text style={[s.colorText, productForm.colors.includes(color) && s.colorTextActive]}>{color}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.customInputRow}>
                  <TextInput style={s.customInput} placeholder="Custom color..." placeholderTextColor={C.textMuted} value={customColor} onChangeText={setCustomColor} />
                  <TouchableOpacity style={s.customAddBtn} onPress={addCustomColor}>
                    <LinearGradient colors={[C.blue2, C.cyan]} style={s.customAddGradient}>
                      <Feather name="plus" size={14} color={C.bg} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Images Section */}
              <View style={s.section}>
                <Text style={s.label}>🖼️ Product Images</Text>
                <Text style={s.imageHint}>First image is primary | Tap star to set primary</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {allDisplayImages.map((uri, index) => (
                    <View key={index} style={s.imageItem}>
                      <Image source={{ uri }} style={s.productImage} resizeMode="cover" />
                      <View style={s.imageOverlay}>
                        {index === 0 && (
                          <View style={s.primaryBadge}>
                            <Text style={s.primaryBadgeText}>PRIMARY</Text>
                          </View>
                        )}
                        <View style={s.imageActions}>
                          {index !== 0 && (
                            <TouchableOpacity onPress={() => setPrimaryImage(index)} style={s.imageActionBtn}>
                              <Feather name="star" size={12} color={C.accentOrange} />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => removeImage(index)} style={s.imageActionBtn}>
                            <Feather name="trash-2" size={12} color={C.accentRed} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {index >= existingImages.length && (
                        <View style={s.newBadge}>
                          <Text style={s.newBadgeText}>NEW</Text>
                        </View>
                      )}
                    </View>
                  ))}
                  <TouchableOpacity style={s.addImageBtn} onPress={pickImages}>
                    <Feather name="plus" size={28} color={C.cyan} />
                    <Text style={s.addImageText}>Add</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              <View style={s.modalButtons}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setProductModalVisible(false)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleSaveProduct} disabled={loadingAction}>
                  <LinearGradient colors={[C.blue2, C.cyan]} style={s.saveBtnGradient}>
                    {loadingAction ? <ActivityIndicator color={C.bg} size="small" /> : <Text style={s.saveBtnText}>Save Product</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* VIEW PRODUCT MODAL */}
      <Modal animationType="slide" transparent visible={viewModalVisible} onRequestClose={() => setViewModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalWrapper, { maxHeight: '85%' }]}>
            <LinearGradient colors={['#0A1647', '#0D1F6E']} style={s.modalHeaderGradient}>
              <View style={s.modalHeaderContent}>
                <Text style={s.modalTitle}>📦 Product Details</Text>
                <TouchableOpacity onPress={() => setViewModalVisible(false)} style={s.modalCloseBtn}>
                  <Feather name="x" size={22} color={C.white} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {viewingProduct && (
              <ScrollView style={s.modalBody} nestedScrollEnabled={true}>
                {viewingProduct.images?.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.viewImageScroll}>
                    {viewingProduct.images.map((img: string, idx: number) => (
                      <Image key={idx} source={{ uri: img }} style={s.viewImage} resizeMode="cover" />
                    ))}
                  </ScrollView>
                )}
                
                <Text style={s.viewProductName}>{viewingProduct.name}</Text>
                <Text style={s.viewCategory}>{getCategoryName(viewingProduct.categoryId)}</Text>
                
                <View style={s.viewPriceRow}>
                  {viewingProduct.discountPrice && viewingProduct.discountPrice < viewingProduct.price ? (
                    <>
                      <Text style={s.viewDiscountPrice}>৳{viewingProduct.discountPrice}</Text>
                      <Text style={s.viewOriginalPrice}>৳{viewingProduct.price}</Text>
                      <View style={s.viewDiscountBadge}>
                        <Text style={s.viewDiscountText}>
                          {Math.round(((viewingProduct.price - viewingProduct.discountPrice) / viewingProduct.price) * 100)}% OFF
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text style={s.viewPrice}>৳{viewingProduct.price}</Text>
                  )}
                </View>

                <View style={s.viewInfoCard}>
                  <View style={s.viewInfoRow}>
                    <Feather name="box" size={16} color={C.cyan} />
                    <Text style={s.viewInfoLabel}>Stock:</Text>
                    <Text style={[s.viewInfoValue, viewingProduct.stock === 0 && { color: C.accentRed }]}>
                      {viewingProduct.stock} units
                    </Text>
                  </View>
                  {viewingProduct.sizes?.length > 0 && (
                    <View style={s.viewInfoRow}>
                      <Feather name="maximize-2" size={16} color={C.cyan} />
                      <Text style={s.viewInfoLabel}>Sizes:</Text>
                      <Text style={s.viewInfoValue}>{viewingProduct.sizes.join(', ')}</Text>
                    </View>
                  )}
                  {viewingProduct.colors?.length > 0 && (
                    <View style={s.viewInfoRow}>
                      <Feather name="droplet" size={16} color={C.cyan} />
                      <Text style={s.viewInfoLabel}>Colors:</Text>
                      <Text style={s.viewInfoValue}>{viewingProduct.colors.join(', ')}</Text>
                    </View>
                  )}
                </View>

                {viewingProduct.description && (
                  <>
                    <Text style={s.viewSectionTitle}>Description</Text>
                    <Text style={s.viewDescription}>{viewingProduct.description}</Text>
                  </>
                )}

                <View style={s.viewActionButtons}>
                  <TouchableOpacity style={s.viewEditBtn} onPress={() => {
                    setViewModalVisible(false);
                    handleEditProduct(viewingProduct);
                  }}>
                    <LinearGradient colors={[C.blue2, C.cyan]} style={s.viewEditGradient}>
                      <Feather name="edit-2" size={16} color={C.bg} />
                      <Text style={s.viewEditText}>Edit Product</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* CATEGORY MODAL */}
      <Modal animationType="slide" transparent visible={categoryModalVisible} onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalWrapper, { maxHeight: 450 }]}>
            <LinearGradient colors={['#0A1647', '#0D1F6E']} style={s.modalHeaderGradient}>
              <View style={s.modalHeaderContent}>
                <Text style={s.modalTitle}>{editingCategory ? '✏️ Edit Category' : '➕ Add Category'}</Text>
                <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={s.modalCloseBtn}>
                  <Feather name="x" size={22} color={C.white} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView style={s.modalBody}>
              <Text style={s.label}>Category Name *</Text>
              <TextInput style={s.input} placeholder="Category name" placeholderTextColor={C.textMuted} value={categoryForm.name} onChangeText={t => setCategoryForm({ ...categoryForm, name: t, slug: t.toLowerCase().replace(/\s+/g, '-') })} />

              <Text style={s.label}>Slug</Text>
              <TextInput style={s.input} placeholder="category-slug" placeholderTextColor={C.textMuted} value={categoryForm.slug} onChangeText={t => setCategoryForm({ ...categoryForm, slug: t })} />

              <Text style={s.label}>Description (Optional)</Text>
              <TextInput style={[s.input, s.textArea]} placeholder="Category description" placeholderTextColor={C.textMuted} multiline numberOfLines={2} value={categoryForm.description} onChangeText={t => setCategoryForm({ ...categoryForm, description: t })} />

              <View style={s.modalButtons}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setCategoryModalVisible(false)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleSaveCategory} disabled={loadingAction}>
                  <LinearGradient colors={[C.blue2, C.cyan]} style={s.saveBtnGradient}>
                    {loadingAction ? <ActivityIndicator color={C.bg} size="small" /> : <Text style={s.saveBtnText}>Save</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {loadingAction && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={C.cyan} />
          <Text style={s.loadingText}>Processing...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  statsHeader: { paddingTop: 18, paddingBottom: 16 },
  statsBarInner: { flexDirection: 'row', paddingHorizontal: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, color: C.white, opacity: 0.8, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },

  filterScroll: { paddingHorizontal: 14, marginTop: 12, marginBottom: 8, maxHeight: 50 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surfaceAlt, marginRight: 8, borderWidth: 1, borderColor: C.border },
  filterChipActive: { backgroundColor: C.blue1, borderColor: C.cyan },
  filterChipText: { color: C.textMuted, fontSize: 13 },
  filterChipTextActive: { color: C.cyan, fontWeight: '600' },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, marginHorizontal: 14, marginVertical: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: C.border, gap: 8 },
  searchInput: { flex: 1, color: C.textPrimary, fontSize: 13 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 17, fontWeight: '800', color: C.textPrimary },
  addButton: { borderRadius: 10, overflow: 'hidden' },
  addButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, gap: 6 },
  addButtonText: { color: C.bg, fontWeight: '700', fontSize: 13 },

  categorySection: { paddingHorizontal: 14, marginVertical: 12 },
  categorySectionTitle: { fontSize: 14, fontWeight: '600', color: C.textSecondary, marginBottom: 10, textTransform: 'uppercase' },
  categoryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginRight: 10, borderWidth: 1, borderColor: C.border, gap: 10 },
  categoryCardName: { color: C.textPrimary, fontSize: 14 },
  categoryCardActions: { flexDirection: 'row', gap: 12 },
  addCategoryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.cyan + '40', borderStyle: 'dashed', gap: 6 },
  addCategoryCardText: { color: C.cyan, fontSize: 13, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalWrapper: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', overflow: 'hidden' },
  modalHeaderGradient: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  modalHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.white },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 20, maxHeight: '100%' },

  label: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 6, marginTop: 8, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 14, color: C.textPrimary, backgroundColor: C.surfaceAlt },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },

  categorySelectScroll: { flexDirection: 'row', marginBottom: 8, maxHeight: 50 },
  categorySelectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surfaceAlt, marginRight: 8, borderWidth: 1, borderColor: C.border },
  categorySelectChipActive: { backgroundColor: C.blue1, borderColor: C.cyan },
  categorySelectText: { color: C.textMuted, fontSize: 13 },
  categorySelectTextActive: { color: C.cyan, fontWeight: '600' },

  tableImage: { width: 40, height: 40, borderRadius: 8 },
  tableImagePlaceholder: { width: 40, height: 40, borderRadius: 8, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  productName: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  productCategory: { color: C.textMuted, fontSize: 10, marginTop: 2 },
  originalPrice: { fontSize: 10, color: C.textMuted, textDecorationLine: 'line-through' },
  currentPrice: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  discountInfo: { backgroundColor: C.accentGreen + '20', padding: 10, borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  discountInfoText: { fontSize: 12, color: C.accentGreen, fontWeight: '600' },

  section: { marginBottom: 20 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  optionChipActive: { backgroundColor: C.blue1, borderColor: C.cyan },
  optionChipText: { color: C.textMuted, fontSize: 13 },
  optionChipTextActive: { color: C.cyan, fontWeight: '600' },

  colorChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, gap: 6 },
  colorChipActive: { backgroundColor: C.blue1, borderColor: C.cyan },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  colorText: { color: C.textMuted, fontSize: 12 },
  colorTextActive: { color: C.cyan, fontWeight: '600' },

  customInputRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  customInput: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, fontSize: 13, color: C.textPrimary, backgroundColor: C.surfaceAlt },
  customAddBtn: { borderRadius: 10, overflow: 'hidden' },
  customAddGradient: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  imageHint: { fontSize: 11, color: C.textMuted, marginBottom: 10 },
  imageItem: { position: 'relative', marginRight: 10 },
  productImage: { width: 80, height: 80, borderRadius: 10 },
  imageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, justifyContent: 'space-between', padding: 6 },
  primaryBadge: { backgroundColor: C.accentOrange, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  primaryBadgeText: { fontSize: 7, fontWeight: 'bold', color: C.bg },
  imageActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  imageActionBtn: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 5, borderRadius: 6 },
  newBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: C.cyan, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
  newBadgeText: { fontSize: 8, fontWeight: 'bold', color: C.bg },
  addImageBtn: { width: 80, height: 80, borderRadius: 10, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.cyan + '60', borderStyle: 'dashed' },
  addImageText: { fontSize: 10, color: C.cyan, marginTop: 4 },

  viewImageScroll: { flexDirection: 'row', marginBottom: 16 },
  viewImage: { width: 100, height: 100, borderRadius: 10, marginRight: 8 },
  viewProductName: { fontSize: 22, fontWeight: 'bold', color: C.textPrimary, marginBottom: 4 },
  viewCategory: { fontSize: 14, color: C.cyan, marginBottom: 12 },
  viewPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  viewPrice: { fontSize: 24, fontWeight: 'bold', color: C.accentGreen },
  viewDiscountPrice: { fontSize: 24, fontWeight: 'bold', color: C.accentGreen },
  viewOriginalPrice: { fontSize: 16, color: C.textMuted, textDecorationLine: 'line-through' },
  viewDiscountBadge: { backgroundColor: C.accentRed + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  viewDiscountText: { fontSize: 12, color: C.accentRed, fontWeight: 'bold' },
  viewInfoCard: { backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 14, marginBottom: 16, gap: 8 },
  viewInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewInfoLabel: { fontSize: 13, color: C.textSecondary, width: 50 },
  viewInfoValue: { fontSize: 13, color: C.textPrimary, flex: 1 },
  viewSectionTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary, marginTop: 12, marginBottom: 8 },
  viewDescription: { fontSize: 14, color: C.textSecondary, lineHeight: 20 },
  viewActionButtons: { marginTop: 20, marginBottom: 30 },
  viewEditBtn: { borderRadius: 10, overflow: 'hidden' },
  viewEditGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 8 },
  viewEditText: { color: C.bg, fontSize: 15, fontWeight: '700' },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 30 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  cancelBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '500' },
  saveBtn: { flex: 1.5, borderRadius: 10, overflow: 'hidden' },
  saveBtnGradient: { padding: 14, alignItems: 'center' },
  saveBtnText: { color: C.bg, fontSize: 15, fontWeight: '700' },

  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  loadingText: { marginTop: 12, fontSize: 14, color: C.cyan, fontWeight: '600' },
});