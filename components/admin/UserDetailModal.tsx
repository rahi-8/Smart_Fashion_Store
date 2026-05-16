// components/admin/UserDetailModal.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBadge } from './StatusBadge';
import { DataTable } from './DataTable';
import { getAllOrders } from '../../appwrite/admin';

const { width, height } = Dimensions.get('window');

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

interface UserDetailModalProps {
  visible: boolean;
  user: any | null;
  onClose: () => void;
  onEdit?: (user: any) => void;
  onBan?: (user: any) => void;
  onDelete?: (user: any) => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  visible,
  user,
  onClose,
  onEdit,
  onBan,
  onDelete,
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'orders'>('info');

  useEffect(() => {
    if (visible && user && activeTab === 'orders') {
      loadUserOrders();
    }
  }, [visible, user, activeTab]);

  const loadUserOrders = async () => {
    setLoading(true);
    try {
      const allOrders = await getAllOrders();
      const userOrders = allOrders.filter((order: any) => order.userId === user?.userId);
      setOrders(userOrders);
    } catch (error) {
      console.error('Error loading user orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const orderColumns = [
    { 
      key: '$id', 
      title: 'Order ID', 
      width: 100,
      render: (item: any) => <Text style={styles.orderId}>#{item.$id?.slice(-8)}</Text> 
    },
    { 
      key: 'totalAmount', 
      title: 'Amount', 
      width: 100,
      render: (item: any) => <Text style={styles.orderAmount}>৳{item.totalAmount?.toLocaleString()}</Text> 
    },
    { 
      key: 'deliveryStatus', 
      title: 'Status', 
      width: 120,
      render: (item: any) => <StatusBadge status={item.deliveryStatus} size="small" /> 
    },
    { 
      key: 'createdAt', 
      title: 'Date', 
      width: 120,
      render: (item: any) => <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text> 
    },
  ];

  const getInitials = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || 'U';
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Bubbles Decoration */}
          <Bubble size={150} top={-40} right={-30} opacity={0.06} />
          <Bubble size={90} bottom={-25} left={-20} opacity={0.08} color={C.purple} />
          <Bubble size={50} top={100} right={40} opacity={0.1} color={C.cyan} />
          <GlowRing size={160} top={-45} right={-35} opacity={0.08} />

          {/* Header */}
          <LinearGradient
            colors={['#0A1647', '#0D1F6E', '#1034A6']}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <Text style={styles.title}>User Details</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={22} color={C.white} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <LinearGradient
              colors={[C.cyan + '20', C.blue3 + '20']}
              style={styles.avatarRing}
            >
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={[C.blue2, C.cyan]}
                  style={styles.avatarPlaceholder}
                >
                  <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
                </LinearGradient>
              )}
            </LinearGradient>
            
            <View style={styles.userNameContainer}>
              <Text style={styles.userName}>{user.name || 'Unknown User'}</Text>
              <Text style={styles.userEmail}>{user.email || 'No email'}</Text>
            </View>
          </View>

          {/* Tab Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'info' && styles.activeTab]}
              onPress={() => setActiveTab('info')}
            >
              <Feather name="user" size={16} color={activeTab === 'info' ? C.cyan : C.textMuted} />
              <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
                Information
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
              onPress={() => setActiveTab('orders')}
            >
              <Feather name="package" size={16} color={activeTab === 'orders' ? C.cyan : C.textMuted} />
              <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
                Orders ({orders.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'info' ? (
              <View style={styles.infoContainer}>
                <LinearGradient
                  colors={[C.surfaceAlt, C.surfaceAlt]}
                  style={styles.infoCard}
                >
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Feather name="phone" size={16} color={C.cyan} />
                    </View>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{user.phone || 'Not provided'}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Feather name="map-pin" size={16} color={C.cyan} />
                    </View>
                    <Text style={styles.infoLabel}>Address</Text>
                    <Text style={styles.infoValue}>{user.address || 'Not provided'}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Feather name="shield" size={16} color={C.cyan} />
                    </View>
                    <Text style={styles.infoLabel}>Role</Text>
                    <View style={styles.infoBadge}>
                      <StatusBadge status={user.role || 'user'} size="small" />
                    </View>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Feather name="circle" size={16} color={C.cyan} />
                    </View>
                    <Text style={styles.infoLabel}>Status</Text>
                    <View style={styles.infoBadge}>
                      <StatusBadge 
                        status={user.isActive ? 'active' : 'inactive'} 
                        type="user" 
                        size="small" 
                      />
                    </View>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Feather name="calendar" size={16} color={C.cyan} />
                    </View>
                    <Text style={styles.infoLabel}>Joined Date</Text>
                    <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Feather name="hash" size={16} color={C.cyan} />
                    </View>
                    <Text style={styles.infoLabel}>User ID</Text>
                    <Text style={[styles.infoValue, styles.monoText]}>{user.$id?.slice(-12)}</Text>
                  </View>
                </LinearGradient>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {onEdit && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.editBtn]} 
                      onPress={() => {
                        onClose();
                        onEdit(user);
                      }}
                    >
                      <Feather name="edit-2" size={16} color={C.blue3} />
                      <Text style={[styles.actionBtnText, { color: C.blue3 }]}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  
                  {onBan && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, user.isActive ? styles.banBtn : styles.unbanBtn]} 
                      onPress={() => {
                        onClose();
                        onBan(user);
                      }}
                    >
                      <Feather name="slash" size={16} color={user.isActive ? C.accentOrange : C.accentGreen} />
                      <Text style={[styles.actionBtnText, { color: user.isActive ? C.accentOrange : C.accentGreen }]}>
                        {user.isActive ? 'Ban' : 'Unban'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {onDelete && user.role !== 'admin' && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.deleteBtn]} 
                      onPress={() => {
                        onClose();
                        onDelete(user);
                      }}
                    >
                      <Feather name="trash-2" size={16} color={C.accentRed} />
                      <Text style={[styles.actionBtnText, { color: C.accentRed }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.ordersContainer}>
                {loading ? (
                  <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={C.cyan} />
                    <Text style={styles.loaderText}>Loading orders...</Text>
                  </View>
                ) : orders.length === 0 ? (
                  <LinearGradient
                    colors={[C.surfaceAlt, C.surfaceAlt]}
                    style={styles.noOrdersCard}
                  >
                    <View style={styles.noOrdersIcon}>
                      <Feather name="shopping-bag" size={48} color={C.textMuted} />
                    </View>
                    <Text style={styles.noOrdersTitle}>No Orders Yet</Text>
                    <Text style={styles.noOrdersText}>This user hasn't placed any orders</Text>
                  </LinearGradient>
                ) : (
                  <DataTable 
                    columns={orderColumns} 
                    data={orders} 
                    itemsPerPage={5}
                  />
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 11, 31, 0.85)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: C.white,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: C.cyan + '40',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: C.white,
  },
  userNameContainer: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: C.textSecondary,
  },
  
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    marginRight: 24,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: C.cyan,
  },
  tabText: {
    fontSize: 14,
    color: C.textMuted,
    fontWeight: '500',
  },
  activeTabText: {
    color: C.cyan,
    fontWeight: '600',
  },
  
  // Content
  content: {
    padding: 20,
    maxHeight: 500,
  },
  
  // Info Section
  infoContainer: {
    gap: 16,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.cyan + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    width: 80,
    fontSize: 13,
    color: C.textSecondary,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: C.textPrimary,
    textAlign: 'right',
  },
  infoBadge: {
    flex: 1,
    alignItems: 'flex-end',
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: C.blue3 + '15',
    borderColor: C.blue3 + '30',
  },
  banBtn: {
    backgroundColor: C.accentOrange + '15',
    borderColor: C.accentOrange + '30',
  },
  unbanBtn: {
    backgroundColor: C.accentGreen + '15',
    borderColor: C.accentGreen + '30',
  },
  deleteBtn: {
    backgroundColor: C.accentRed + '15',
    borderColor: C.accentRed + '30',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Orders Section
  ordersContainer: {
    minHeight: 200,
  },
  loaderContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: C.textSecondary,
  },
  noOrdersCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  noOrdersIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noOrdersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 8,
  },
  noOrdersText: {
    fontSize: 13,
    color: C.textMuted,
  },
  
  // Order Table Styles
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: C.cyan,
    fontFamily: 'monospace',
  },
  orderAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: C.accentGreen,
  },
  orderDate: {
    fontSize: 11,
    color: C.textMuted,
  },
});
