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
  MESSAGES: 'messages',
  ORDER_TIMELINE: 'order_timeline',
} as const;

// STORAGE BUCKETS
export const STORAGE_BUCKETS = {
  PRODUCT_IMAGES: 'product_images',
  BANNER_IMAGES: 'product_images',
  USER_AVATARS: 'product_images',
} as const;

// ============================================
// ✅ ফিক্সড: ইমেজ URL ফাংশন (সিঙ্ক্রোনাস)
// ============================================

// Get image URL - এটি সরাসরি URL বানিয়ে দেয়, Promise নয়
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

// ✅ ফিক্সড: Upload product image - returns URL string directly
export const uploadProductImage = async (imageUri: string): Promise<string> => {
  try {
    const filename = `product_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    
    const file = {
      uri: imageUri,
      name: filename,
      type: 'image/jpeg',
    };

    const response = await storage.createFile(
      STORAGE_BUCKETS.PRODUCT_IMAGES,
      ID.unique(),
      file as any
    );

    // Build URL manually instead of using getFileView
    const imageUrl = `${ENDPOINT}/storage/buckets/${STORAGE_BUCKETS.PRODUCT_IMAGES}/files/${response.$id}/view?project=${PROJECT_ID}`;
    console.log('✅ Image uploaded:', imageUrl);
    return imageUrl;
  } catch (error: any) {
    console.error('❌ Upload error:', error.message);
    throw new Error(error.message);
  }
};

// ✅ ফিক্সড: Generic upload function
export const uploadImage = async (
  bucketId: string,
  fileUri: string,
  fileName: string
): Promise<string> => {
  try {
    const file = {
      uri: fileUri,
      name: fileName,
      type: 'image/jpeg',
    };

    const response = await storage.createFile(
      bucketId,
      ID.unique(),
      file as any
    );

    const imageUrl = `${ENDPOINT}/storage/buckets/${bucketId}/files/${response.$id}/view?project=${PROJECT_ID}`;
    console.log('✅ Image uploaded:', imageUrl);
    return imageUrl;
  } catch (error: any) {
    console.error('❌ Upload error:', error.message);
    throw new Error(error.message);
  }
};

// ============================================
// ✅ DATABASE FUNCTIONS
// ============================================

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
        createdAt: new Date().toISOString(),
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

// ============================================
// ✅ AUTH FUNCTIONS
// ============================================

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