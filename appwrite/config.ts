// appwrite/config.ts
import {
  Client,
  Account,
  Databases,
  Storage,
  ID,
  Query,
} from 'appwrite';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const client = new Client();

const extra = Constants.expoConfig?.extra || {};

// ✅ Appwrite Configuration
const ENDPOINT = extra.appwriteEndpoint || 'https://tor.cloud.appwrite.io/v1';
const PROJECT_ID = extra.appwriteProjectId || '69ce028900081643e1c3';

client
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID, Query };
export default client;

export const DATABASE_ID = '69ce0993000e669d574c';

// সব collection যোগ করুন
export const COLLECTIONS = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  ORDERS: 'orders',
  USERS: 'users',
  BANNERS: 'banners',
  COUPONS: 'coupons',
  REVIEWS: 'reviews',
  SETTINGS: 'settings',
  CHATS: 'chats',
  WISHLIST: 'wishlist',      
  MESSAGES: 'messages',
  ORDER_TIMELINE: 'order_timeline',
} as const;

// STORAGE BUCKETS - Fixed
export const STORAGE_BUCKETS = {
  PRODUCT_IMAGES: 'product_images',
  BANNER_IMAGES: 'product_images',   
  USER_AVATARS: 'product_images',      
} as const;

// ------- CORRECTED WISHLIST HELPER FUNCTIONS------


// Add to wishlist
export const addToWishlist = async (userId: string, product: any) => {
  try {
    console.log('📝 Adding to wishlist:', product.name);
    console.log('User ID:', userId);
    console.log('Product ID:', product.$id);
    
    // Check if already exists
    const existing = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.WISHLIST,
      [
        Query.equal('userId', userId),
        Query.equal('productId', product.$id)
      ]
    );

    if (existing.documents.length > 0) {
      console.log('⚠️ Already in wishlist');
      return { success: false, message: 'Already in wishlist' };
    }

    // Prepare product data
    const productData = {
      id: product.$id,
      name: product.name,
      price: product.discountPrice || product.price,
      originalPrice: product.price,
      image: product.images?.[0] || '',
      discountPrice: product.discountPrice || null,
      stock: product.stock || 0,
      description: product.description || '',
      categoryName: product.categoryName || '',
      sizes: product.sizes || [],
      colors: product.colors || [],
    };

    // Create wishlist document
    const wishlistItem = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.WISHLIST,
      ID.unique(),
      {
        userId: userId,
        productId: product.$id,
        product: JSON.stringify(productData),
        createdAt: new Date().toISOString(),
      }
    );

    console.log('✅ Added to wishlist successfully:', wishlistItem.$id);
    return { success: true, data: wishlistItem };
  } catch (error: any) {
    console.error('❌ Add to wishlist error:', error.message);
    console.error('Full error:', error);
    return { success: false, error: error.message };
  }
};

// Remove from wishlist
export const removeFromWishlist = async (userId: string, productId: string) => {
  try {
    console.log('🗑️ Removing from wishlist:', productId);
    
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.WISHLIST,
      [
        Query.equal('userId', userId),
        Query.equal('productId', productId)
      ]
    );

    if (result.documents.length > 0) {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.WISHLIST,
        result.documents[0].$id
      );
      console.log('✅ Removed from wishlist successfully');
      return { success: true };
    }
    
    console.log('⚠️ Item not found in wishlist');
    return { success: false, message: 'Not found in wishlist' };
  } catch (error: any) {
    console.error('❌ Remove from wishlist error:', error.message);
    return { success: false, error: error.message };
  }
};

// Get user's wishlist
export const getUserWishlist = async (userId: string) => {
  try {
    console.log('📥 Getting wishlist for user:', userId);
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.WISHLIST,
      [
        Query.equal('userId', userId),
        Query.orderDesc('createdAt')
      ]
    );

    console.log('📦 Found', response.documents.length, 'items');

    const wishlistItems = response.documents.map(doc => {
      try {
        let productData;
        if (typeof doc.product === 'string') {
          productData = JSON.parse(doc.product);
        } else {
          productData = doc.product;
        }
        
        return {
          ...productData,
          wishlistId: doc.$id,
          id: doc.productId,
        };
      } catch (error) {
        console.error('Parse error for doc:', doc.$id, error);
        return null;
      }
    }).filter(item => item !== null);

    return { success: true, data: wishlistItems };
  } catch (error: any) {
    console.error('❌ Get wishlist error:', error.message);
    return { success: false, data: [], error: error.message };
  }
};


// ===== HELPERS - Fixed base64 handling========


// Convert base64 to Blob (works with React Native)
const base64ToBlob = (base64: string, mimeType: string): Blob => {
  // Remove data URL prefix if present
  let cleanBase64 = base64;
  if (base64.includes(',')) {
    cleanBase64 = base64.split(',')[1];
  }
  
  try {
    // For React Native, use Buffer if available
    if (typeof Buffer !== 'undefined') {
      const byteArray = Buffer.from(cleanBase64, 'base64');
      return new Blob([byteArray], { type: mimeType });
    }
    
    // Fallback to atob (works in web)
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  } catch (error) {
    console.error('Base64 to Blob error:', error);
    throw error;
  }
};

// Alternative: Create file directly from URI using FormData 
const createFormDataFromUri = async (uri: string, filename: string): Promise<FormData> => {
  const formData = new FormData();
  
  // Get file info
  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists) {
    throw new Error('File does not exist');
  }
  
  // Get file extension
  const extension = uri.split('.').pop() || 'jpg';
  const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  
  // For React Native, we need to use the uri directly with a special format
  formData.append('file', {
    uri: uri,
    name: filename,
    type: mimeType,
  } as any);
  
  return formData;
};


// ==== UPLOAD FUNCTION - SIMPLIFIED FOR MOBILE====


// Upload product image 
export const uploadProductImage = async (imageUri: string): Promise<string> => {
  try {
    const filename = `product_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    console.log('📤 Starting upload:', filename);
    console.log('📱 Platform:', Platform.OS);
    console.log('📍 Image URI:', imageUri);

    let fileToUpload: any;

    if (Platform.OS === 'web') {
      // Web: Direct fetch works
      const response = await fetch(imageUri);
      const blob = await response.blob();
      fileToUpload = new File([blob], filename, { type: 'image/jpeg' });
    } else {
      // Mobile: Use fetch with blob 
      // First, read the file as blob using fetch
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Create File from blob
      fileToUpload = new File([blob], filename, { type: blob.type || 'image/jpeg' });
    }

    console.log('📄 File ready, size:', fileToUpload.size, 'bytes');

    const response = await storage.createFile(
      STORAGE_BUCKETS.PRODUCT_IMAGES,
      ID.unique(),
      fileToUpload
    );

    const imageUrl = `${ENDPOINT}/storage/buckets/${STORAGE_BUCKETS.PRODUCT_IMAGES}/files/${response.$id}/view?project=${PROJECT_ID}`;
    console.log('✅ Upload success:', imageUrl);
    return imageUrl;
  } catch (error: any) {
    console.error('❌ Upload error:', error.message);
    console.error('Full error:', error);
    throw new Error(error.message || 'Upload failed');
  }
};

// Alternative upload method using FormData (if the above doesn't work)
export const uploadProductImageFormData = async (imageUri: string): Promise<string> => {
  try {
    const filename = `product_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    console.log('📤 Starting upload (FormData):', filename);
    
    // Create FormData
    const formData = new FormData();
    
    // Get file extension and mime type
    const extension = imageUri.split('.').pop() || 'jpg';
    const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
    
    // Append file
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as any);
    
    // For Appwrite, we need to use fetch directly with FormData
    // This is a workaround if storage.createFile doesn't work with FormData
    const uploadUrl = `${ENDPOINT}/storage/buckets/${STORAGE_BUCKETS.PRODUCT_IMAGES}/files`;
    const projectId = PROJECT_ID;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Response-Format': '1.0.0',
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const result = await response.json();
    const imageUrl = `${ENDPOINT}/storage/buckets/${STORAGE_BUCKETS.PRODUCT_IMAGES}/files/${result.$id}/view?project=${PROJECT_ID}`;
    console.log('✅ Upload success:', imageUrl);
    return imageUrl;
  } catch (error: any) {
    console.error('❌ Upload error:', error.message);
    throw error;
  }
};

// Upload multiple images
export const uploadMultipleImages = async (imageUris: string[]): Promise<string[]> => {
  const uploadedUrls: string[] = [];
  
  for (const uri of imageUris) {
    try {
      const url = await uploadProductImage(uri);
      uploadedUrls.push(url);
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  }
  
  return uploadedUrls;
};


// ==== IMAGE URL FUNCTIONS =====


// Get image URL
export const getImageUrl = (bucketId: string, fileId: string): string => {
  return `${ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/view?project=${PROJECT_ID}`;
};

// Get product image URL
export const getProductImageUrl = (fileId: string): string => {
  if (!fileId) return '';
  if (fileId.startsWith('http')) return fileId;
  return `${ENDPOINT}/storage/buckets/${STORAGE_BUCKETS.PRODUCT_IMAGES}/files/${fileId}/view?project=${PROJECT_ID}`;
};

// Delete image from storage
export const deleteProductImage = async (fileId: string): Promise<boolean> => {
  try {
    await storage.deleteFile(STORAGE_BUCKETS.PRODUCT_IMAGES, fileId);
    console.log('✅ Image deleted:', fileId);
    return true;
  } catch (error: any) {
    console.error('❌ Delete image error:', error.message);
    return false;
  }
};


// === DATABASE FUNCTIONS ======


// Create user document in database
export const createUserDocument = async (userId: string, name: string, email: string, phone?: string) => {
  try {
    console.log('📝 Creating user document for:', email);
    
    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.USERS,
      ID.unique(),
      {
        userId: userId,
        name: name,
        email: email.toLowerCase(),
        phone: phone || '',
        role: 'user',
        isActive: true,
      }
    );
    console.log('✅ User document created:', doc.$id);
    return doc;
  } catch (error: any) {
    console.error('❌ Create user document error:', error.message);
    throw error;
  }
};

// Check if user exists in database
export const checkUserExists = async (email: string): Promise<boolean> => {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USERS,
      [Query.equal('email', email.toLowerCase())]
    );
    return result.total > 0;
  } catch (error) {
    console.log('Check user error:', error);
    return false;
  }
};

// Get user role from database
export const getUserRoleFromDB = async (userId: string): Promise<string> => {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USERS,
      [Query.equal('userId', userId)]
    );
    
    if (result.documents.length > 0) {
      const userDoc = result.documents[0];
      return userDoc.role || 'user';
    }
    return 'user';
  } catch (error) {
    console.log('Error getting role from DB:', error);
    return 'user';
  }
};

// Get user by email from database
export const getUserByEmail = async (email: string) => {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USERS,
      [Query.equal('email', email.toLowerCase())]
    );
    
    if (result.documents.length > 0) {
      return result.documents[0];
    }
    return null;
  } catch (error) {
    console.log('Error getting user by email:', error);
    return null;
  }
};

// Create product document (NO timestamps)
export const createProduct = async (productData: any) => {
  try {
    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      ID.unique(),
      productData
    );
    console.log('✅ Product created:', doc.$id);
    return doc;
  } catch (error: any) {
    console.error('❌ Create product error:', error.message);
    throw error;
  }
};

// Update product document 
export const updateProduct = async (productId: string, productData: any) => {
  try {
    const doc = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      productId,
      productData
    );
    console.log('✅ Product updated:', doc.$id);
    return doc;
  } catch (error: any) {
    console.error('❌ Update product error:', error.message);
    throw error;
  }
};

// Delete product with images
export const deleteProductWithImages = async (product: any) => {
  try {
    // Delete all associated images from storage
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        try {
          const match = imageUrl.match(/files\/([^\/]+)\/view/);
          const fileId = match ? match[1] : null;
          if (fileId) {
            await storage.deleteFile(STORAGE_BUCKETS.PRODUCT_IMAGES, fileId);
            console.log('✅ Deleted image:', fileId);
          }
        } catch (err) {
          console.error('Failed to delete image:', err);
        }
      }
    }
    
    // Delete product document
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, product.$id);
    console.log('✅ Product deleted:', product.$id);
    return true;
  } catch (error: any) {
    console.error('❌ Delete product error:', error.message);
    throw error;
  }
};


// ------ AUTH FUNCTIONS ---------
// 

// Create session (login)
export const createSession = async (email: string, password: string) => {
  try {
    try {
      await account.deleteSession('current');
    } catch {}
    
    const session = await account.createEmailPasswordSession(email, password);
    console.log('✅ Session created:', session.$id);
    return session;
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  }
};

// Register user
export const registerUser = async (email: string, password: string, name: string) => {
  try {
    const user = await account.create(ID.unique(), email, password, name);
    console.log('✅ Appwrite user created:', user.$id);
    return user;
  } catch (error) {
    console.error('❌ Register error:', error);
    throw error;
  }
};

// Check if logged in
export const isLoggedIn = async (): Promise<boolean> => {
  try {
    await account.get();
    return true;
  } catch {
    return false;
  }
};

// Logout
export const logout = async (): Promise<boolean> => {
  try {
    await account.deleteSession('current');
    console.log('✅ Logout success');
    return true;
  } catch (error) {
    console.log('❌ Logout error:', error);
    return false;
  }
};

// Get user role from preferences
export const getUserRole = async (): Promise<string> => {
  try {
    const prefs = await account.getPrefs();
    return (prefs?.role as string) || 'user';
  } catch {
    return 'user';
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const user = await account.get();
    console.log('✅ Current user:', user?.email);
    return user;
  } catch (error) {
    console.log('No current user:', error);
    return null;
  }
};

// Update user role in database
export const updateUserRoleInDB = async (userId: string, role: string) => {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USERS,
      [Query.equal('userId', userId)]
    );
    
    if (result.documents.length > 0) {
      const doc = result.documents[0];
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        doc.$id,
        { role: role }
      );
      console.log('✅ User role updated in DB:', role);
    }
  } catch (error) {
    console.log('Error updating role:', error);
  }
};
