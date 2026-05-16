// appwrite/admin.ts
import { databases, account, DATABASE_ID, COLLECTIONS, ID, Query } from './config';
import { getUserRole as getConfigUserRole } from './config';

// Types
export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockProducts: number;
  totalSales: number;
  averageOrderValue: number;
}

export interface Order {
  $id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  shippingAddress: string;
  totalAmount: number;
  discountAmount: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';
  trackingNumber?: string;
  courierName?: string;
  notes?: string;
  products: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    size?: string;
    color?: string;
    image?: string;
  }>;
  $createdAt: string;
  $updatedAt: string;
}

export interface User {
  $id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'user' | 'admin' | 'super_admin';
  isActive: boolean;
  emailVerification: boolean;
  $createdAt: string;
  $updatedAt: string;
}

export interface Product {
  $id: string;
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
  $createdAt: string;
  $updatedAt: string;
}

// Check if current user is admin
export const isAdmin = async (): Promise<boolean> => {
  try {
    const user = await account.get();
    const prefs = await account.getPrefs();
    const role = prefs?.role || 'user';
    return role === 'admin' || role === 'super_admin';
  } catch (error) {
    console.error('isAdmin error:', error);
    return false;
  }
};

// Get user role (using config version)
export const getUserRole = async (): Promise<string> => {
  try {
    return await getConfigUserRole();
  } catch (error) {
    console.error('Get user role error:', error);
    return 'user';
  }
};

// Check if user has admin permissions
export const requireAdmin = async (): Promise<boolean> => {
  const isAdminUser = await isAdmin();
  if (!isAdminUser) {
    console.warn('Access denied: Admin privileges required');
    return false;
  }
  return true;
};

// Dashboard Stats (Improved)
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const [users, products, orders] = await Promise.all([
      databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.ORDERS),
    ]);

    let totalRevenue = 0;
    let totalSales = 0;

    orders.documents.forEach((order: any) => {
      if (order.paymentStatus === 'paid' || order.paymentStatus === 'cod') {
        totalRevenue += order.totalAmount || 0;
        totalSales++;
      }
    });

    const pendingOrders = orders.documents.filter(
      (o: any) => o.orderStatus === 'pending'
    ).length;

    const lowStockProducts = products.documents.filter(
      (p: any) => p.stock > 0 && p.stock < 10
    ).length;

    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    return {
      totalUsers: users.total || 0,
      totalProducts: products.total || 0,
      totalOrders: orders.total || 0,
      totalRevenue,
      pendingOrders,
      lowStockProducts,
      totalSales,
      averageOrderValue,
    };
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return {
      totalUsers: 0,
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      lowStockProducts: 0,
      totalSales: 0,
      averageOrderValue: 0,
    };
  }
};

// Get all users (with filters)
export const getAllUsers = async (search?: string, limit: number = 100): Promise<User[]> => {
  try {
    const queries: any[] = [Query.orderDesc('$createdAt'), Query.limit(limit)];
    
    if (search && search.trim()) {
      queries.push(Query.search('name', search));
      queries.push(Query.search('email', search));
    }
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USERS,
      queries
    );
    return response.documents as unknown as User[];
  } catch (error) {
    console.error('Get users error:', error);
    return [];
  }
};

// Get user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const response = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.USERS,
      userId
    );
    return response as unknown as User;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

// Update user profile (name, phone, address, role)
export const updateUser = async (userId: string, userData: {
  name?: string;
  phone?: string;
  address?: string;
  role?: string;
  isActive?: boolean;
}): Promise<User | null> => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.USERS,
      userId,
      userData
    );
    console.log('✅ User updated:', userId);
    return response as unknown as User;
  } catch (error) {
    console.error('Update user error:', error);
    return null;
  }
};

// Update user status (activate/deactivate)
export const updateUserStatus = async (userId: string, isActive: boolean): Promise<User | null> => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.USERS,
      userId,
      { isActive }
    );
    console.log('✅ User status updated:', { userId, isActive });
    return response as unknown as User;
  } catch (error) {
    console.error('Update user status error:', error);
    return null;
  }
};

// Delete user
export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.USERS, userId);
    console.log('✅ User deleted:', userId);
    return true;
  } catch (error: any) {
    if (error?.code === 404) {
      console.log('User already deleted');
      return true;
    }
    console.error('Delete user error:', error);
    return false;
  }
};

// Get all products (admin view)
export const getAllProducts = async (filters?: {
  category?: string;
  isActive?: boolean;
  lowStock?: boolean;
}): Promise<Product[]> => {
  try {
    const queries: any[] = [Query.orderDesc('$createdAt')];
    
    if (filters?.category) {
      queries.push(Query.equal('categoryId', filters.category));
    }
    
    if (filters?.isActive !== undefined) {
      queries.push(Query.equal('isActive', filters.isActive));
    }
    
    if (filters?.lowStock) {
      queries.push(Query.lessThan('stock', 10));
    }
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      queries
    );
    return response.documents as unknown as Product[];
  } catch (error) {
    console.error('Get products error:', error);
    return [];
  }
};

// Get active products (for users)
export const getActiveProducts = async (categoryId?: string): Promise<Product[]> => {
  try {
    const queries: any[] = [Query.equal('isActive', true), Query.orderDesc('$createdAt')];
    
    if (categoryId) {
      queries.push(Query.equal('categoryId', categoryId));
    }
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      queries
    );
    return response.documents as unknown as Product[];
  } catch (error) {
    console.error('Get active products error:', error);
    return [];
  }
};

// Get single product by ID
export const getProductById = async (productId: string): Promise<Product | null> => {
  try {
    const response = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      productId
    );
    return response as unknown as Product;
  } catch (error) {
    console.error('Get product error:', error);
    return null;
  }
};

// Get low stock products
export const getLowStockProducts = async (threshold: number = 10): Promise<Product[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      [
        Query.lessThan('stock', threshold),
        Query.equal('isActive', true),
        Query.orderAsc('stock')
      ]
    );
    return response.documents as unknown as Product[];
  } catch (error) {
    console.error('Low stock error:', error);
    return [];
  }
};

// Get all orders (with filters)
export const getAllOrders = async (status?: string, limit: number = 100): Promise<Order[]> => {
  try {
    const queries: any[] = [Query.orderDesc('$createdAt'), Query.limit(limit)];
    
    if (status && status !== 'all') {
      queries.push(Query.equal('orderStatus', status));
    }
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      queries
    );
    return response.documents as unknown as Order[];
  } catch (error) {
    console.error('Get orders error:', error);
    return [];
  }
};

// Get single order by ID
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const response = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      orderId
    );
    return response as unknown as Order;
  } catch (error) {
    console.error('Get order error:', error);
    return null;
  }
};

// Update order status
export const updateOrderStatus = async (
  orderId: string,
  status: Order['orderStatus']
): Promise<Order | null> => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      orderId,
      { orderStatus: status }
    );
    console.log('✅ Order status updated:', { orderId, status });
    return response as unknown as Order;
  } catch (error) {
    console.error('Update order status error:', error);
    return null;
  }
};

// Update order payment status
export const updatePaymentStatus = async (
  orderId: string,
  status: Order['paymentStatus']
): Promise<Order | null> => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      orderId,
      { paymentStatus: status }
    );
    console.log('✅ Payment status updated:', { orderId, status });
    return response as unknown as Order;
  } catch (error) {
    console.error('Update payment status error:', error);
    return null;
  }
};

// Get recent orders (for dashboard)
export const getRecentOrders = async (limit: number = 5): Promise<Order[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      [Query.orderDesc('$createdAt'), Query.limit(limit)]
    );
    return response.documents as unknown as Order[];
  } catch (error) {
    console.error('Get recent orders error:', error);
    return [];
  }
};

// Get orders by user ID
export const getOrdersByUser = async (userId: string): Promise<Order[]> => {
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

// Get monthly revenue stats
export const getMonthlyRevenue = async (year?: number): Promise<{ month: string; revenue: number }[]> => {
  try {
    const orders = await getAllOrders();
    const currentYear = year || new Date().getFullYear();
    
    const monthlyRevenue = Array(12).fill(0);
    
    orders.forEach((order: any) => {
      const orderDate = new Date(order.$createdAt);
      if (orderDate.getFullYear() === currentYear && 
          (order.paymentStatus === 'paid' || order.paymentStatus === 'cod')) {
        const month = orderDate.getMonth();
        monthlyRevenue[month] += order.totalAmount || 0;
      }
    });
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return months.map((month, index) => ({
      month,
      revenue: monthlyRevenue[index],
    }));
  } catch (error) {
    console.error('Get monthly revenue error:', error);
    return [];
  }
};

// Make a user admin
export const makeAdmin = async (userId: string): Promise<boolean> => {
  try {
    // First get the user's Appwrite account ID
    const user = await getUserById(userId);
    if (!user) return false;
    
    // Update user preferences (this needs to be done via Appwrite account API)
    // Note: This requires special permissions
    console.log('⚠️ Making user admin requires Appwrite Console or admin API key');
    return false;
  } catch (error) {
    console.error('Make admin error:', error);
    return false;
  }
};

// Export all functions
export default {
  // Admin check
  isAdmin,
  getUserRole,
  requireAdmin,
  
  // Dashboard
  getDashboardStats,
  getRecentOrders,
  getMonthlyRevenue,
  
  // Users
  getAllUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
  makeAdmin,
  
  // Products
  getAllProducts,
  getActiveProducts,
  getProductById,
  getLowStockProducts,
  
  // Orders
  getAllOrders,
  getOrderById,
  getOrdersByUser,
  updateOrderStatus,
  updatePaymentStatus,
};
