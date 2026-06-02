// appwrite/database.ts
import { databases, storage, DATABASE_ID, COLLECTIONS, STORAGE_BUCKETS, ID, Query, account } from './config';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

//TYPES 

export interface Product {
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
  createdAt?: string;
}

export interface CreateProductInput {
  name: string;
  price: number;
  discountPrice?: number;
  description?: string;
  categoryId: string;
  sizes: string[];
  colors: string[];
  stock: number;
  isActive: boolean;
  images?: string[];
}

export interface Category {
  $id: string;
  name: string;
  slug: string;
  image?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  image?: string;
  isActive: boolean;
}

export interface Order {
  $id?: string;
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  products: OrderProduct[];
  totalAmount: number;
  discountAmount?: number;
  couponCode?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: 'cod' | 'bkash' | 'nagad' | 'card';
  paymentStatus: 'pending' | 'paid' | 'failed';
  shippingAddress: Address;
  createdAt?: string;
}

export interface OrderProduct {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
}

export interface Address {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  area?: string;
  landmark?: string;
}


const fileToBase64 = async (uri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',  
    });
    return base64;
  } catch (error) {
    console.error('File to base64 error:', error);
    throw error;
  }
};


export const uploadProductImage = async (imageUri: string): Promise<string> => {
  try {
    console.log('📸 Uploading image:', imageUri);
    
    // Check if it's already a URL
    if (imageUri.startsWith('http')) {
      console.log('Image is already a URL');
      return imageUri;
    }
    
    let fileToUpload: any;
    
    if (Platform.OS === 'web') {
      // Web platform
      const response = await fetch(imageUri);
      const blob = await response.blob();
      fileToUpload = new File([blob], `product_${Date.now()}.jpg`, { type: 'image/jpeg' });
    } else {
      // Mobile platform
      const base64 = await fileToBase64(imageUri);
      fileToUpload = base64;
    }
    
    const response = await storage.createFile(
      STORAGE_BUCKETS.PRODUCT_IMAGES,
      ID.unique(),
      fileToUpload
    );
    
    const imageUrl = `https://tor.cloud.appwrite.io/v1/storage/buckets/${STORAGE_BUCKETS.PRODUCT_IMAGES}/files/${response.$id}/view?project=69ce028900081643e1c3`;
    
    console.log('✅ Image uploaded:', imageUrl);
    return imageUrl;
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
};


export const uploadMultipleImages = async (imageUris: string[]): Promise<string[]> => {
  const uploadedUrls: string[] = [];
  for (let i = 0; i < imageUris.length; i++) {
    try {
      const url = await uploadProductImage(imageUris[i]);
      uploadedUrls.push(url);
    } catch (error) {
      console.error(`Failed to upload image ${i + 1}:`, error);
    }
  }
  return uploadedUrls;
};


export const deleteProductImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract fileId from URL
    const matches = imageUrl.match(/\/files\/(.+?)\/view/);
    if (matches && matches[1]) {
      const fileId = matches[1];
      await storage.deleteFile(STORAGE_BUCKETS.PRODUCT_IMAGES, fileId);
      console.log('✅ Image deleted:', fileId);
      return true;
    }
    return true;
  } catch (error) {
    console.error('❌ Delete error:', error);
    return false;
  }
};


export const getProducts = async (categoryId?: string): Promise<Product[]> => {
  try {
    const queries: any[] = [Query.orderDesc('$createdAt')];
    if (categoryId) {
      queries.push(Query.equal('categoryId', categoryId));
    }
    queries.push(Query.equal('isActive', true));
    
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, queries);
    return response.documents as unknown as Product[];
  } catch (error) {
    console.error('Get products error:', error);
    return [];
  }
};


export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, [Query.orderDesc('$createdAt')]);
    return response.documents as unknown as Product[];
  } catch (error) {
    console.error('Get all products error:', error);
    return [];
  }
};


export const getProductById = async (productId: string): Promise<Product | null> => {
  try {
    const response = await databases.getDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, productId);
    return response as unknown as Product;
  } catch (error) {
    console.error('Get product error:', error);
    return null;
  }
};

export const addProduct = async (
  productData: CreateProductInput,
  imageFiles?: string[]
): Promise<Product> => {
  try {
    let imageUrls: string[] = [];
    
    if (imageFiles && imageFiles.length > 0) {
      imageUrls = await uploadMultipleImages(imageFiles);
    } else if (productData.images && productData.images.length > 0) {
      imageUrls = productData.images;
    }
    
    const productPayload = {
      name: productData.name,
      price: productData.price,
      discountPrice: productData.discountPrice || null,
      description: productData.description || '',
      categoryId: productData.categoryId,
      sizes: productData.sizes || [],
      colors: productData.colors || [],
      stock: productData.stock || 0,
      images: imageUrls,
      isActive: productData.isActive !== undefined ? productData.isActive : true,
    };
    
    const response = await databases.createDocument(
      DATABASE_ID, 
      COLLECTIONS.PRODUCTS, 
      ID.unique(), 
      productPayload
    );
    return response as unknown as Product;
  } catch (error) {
    console.error('Add product error:', error);
    throw error;
  }
};


export const updateProduct = async (
  productId: string,
  updatedData: Partial<CreateProductInput>
): Promise<Product | null> => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID, 
      COLLECTIONS.PRODUCTS, 
      productId, 
      updatedData
    );
    return response as unknown as Product;
  } catch (error) {
    console.error('Update product error:', error);
    return null;
  }
};


export const deleteProduct = async (productId: string): Promise<boolean> => {
  try {
    // First get product to delete its images
    const product = await getProductById(productId);
    if (product && product.images) {
      for (const imageUrl of product.images) {
        await deleteProductImage(imageUrl);
      }
    }
    
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, productId);
    console.log('✅ Product deleted:', productId);
    return true;
  } catch (error) {
    console.error('Delete product error:', error);
    return false;
  }
};

// ==================== CATEGORIES ====================

export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID, 
      COLLECTIONS.CATEGORIES, 
      [Query.equal('isActive', true), Query.orderAsc('name')]
    );
    return response.documents as unknown as Category[];
  } catch (error) {
    console.error('Get categories error:', error);
    return [];
  }
};

export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID, 
      COLLECTIONS.CATEGORIES, 
      [Query.orderAsc('name')]
    );
    return response.documents as unknown as Category[];
  } catch (error) {
    console.error('Get all categories error:', error);
    return [];
  }
};


export const addCategory = async (categoryData: CreateCategoryInput): Promise<Category | null> => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID, 
      COLLECTIONS.CATEGORIES, 
      ID.unique(), 
      {
        name: categoryData.name,
        slug: categoryData.slug,
        image: categoryData.image || null,
        isActive: categoryData.isActive !== undefined ? categoryData.isActive : true,
      }
    );
    return response as unknown as Category;
  } catch (error) {
    console.error('Add category error:', error);
    return null;
  }
};


export const updateCategory = async (
  categoryId: string, 
  updatedData: Partial<CreateCategoryInput>
): Promise<Category | null> => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID, 
      COLLECTIONS.CATEGORIES, 
      categoryId, 
      updatedData
    );
    return response as unknown as Category;
  } catch (error) {
    console.error('Update category error:', error);
    return null;
  }
};

// delete catagory
export const deleteCategory = async (categoryId: string): Promise<boolean> => {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CATEGORIES, categoryId);
    console.log('✅ Category deleted:', categoryId);
    return true;
  } catch (error) {
    console.error('Delete category error:', error);
    return false;
  }
};

// ==================== STOCK MANAGEMENT ====================

export const updateProductStock = async (productId: string, newStock: number): Promise<Product | null> => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID, 
      COLLECTIONS.PRODUCTS, 
      productId, 
      { stock: newStock }
    );
    return response as unknown as Product;
  } catch (error) {
    console.error('Update stock error:', error);
    return null;
  }
};


export const decreaseProductStock = async (productId: string, quantity: number): Promise<boolean> => {
  try {
    const product = await getProductById(productId);
    if (!product) return false;
    const newStock = Math.max(0, product.stock - quantity);
    await updateProductStock(productId, newStock);
    console.log('✅ Stock decreased:', { productId, oldStock: product.stock, newStock });
    return true;
  } catch (error) {
    console.error('Decrease stock error:', error);
    return false;
  }
};

// ==================== ORDERS ====================


export const createOrder = async (orderData: Omit<Order, '$id' | 'createdAt'>): Promise<Order | null> => {
  try {
    const order = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      ID.unique(),
      {
        ...orderData,
        orderId: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        createdAt: new Date().toISOString(),
      }
    );
    console.log('✅ Order created:', order.$id);
    return order as unknown as Order;
  } catch (error) {
    console.error('Create order error:', error);
    return null;
  }
};


export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      [Query.equal('userId', userId), Query.orderDesc('$createdAt')]
    );
    return response.documents as unknown as Order[];
  } catch (error) {
    console.error('Get user orders error:', error);
    return [];
  }
};


export const getAllOrders = async (): Promise<Order[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      [Query.orderDesc('$createdAt')]
    );
    return response.documents as unknown as Order[];
  } catch (error) {
    console.error('Get all orders error:', error);
    return [];
  }
};


export const updateOrderStatus = async (
  orderId: string, 
  status: Order['status']
): Promise<boolean> => {
  try {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.ORDERS, orderId, { status });
    console.log('✅ Order status updated:', { orderId, status });
    return true;
  } catch (error) {
    console.error('Update order status error:', error);
    return false;
  }
};

// ==================== USERS ====================


export const getUserProfile = async () => {
  try {
    const user = await account.get();
    return user;
  } catch (error) {
    console.error('Get user profile error:', error);
    return null;
  }
};


export const makeAdmin = async (userId: string): Promise<boolean> => {
  try {
    // Update user preferences
    await account.updatePrefs({ role: 'admin' });
    console.log('✅ User made admin:', userId);
    return true;
  } catch (error) {
    console.error('Make admin error:', error);
    return false;
  }
};

export default {
  // Products
  getProducts,
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  
  // Categories
  getCategories,
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  
  // Stock
  updateProductStock,
  decreaseProductStock,
  
  // Orders
  createOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  
  // Users
  getUserProfile,
  makeAdmin,
};
