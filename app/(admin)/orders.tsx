// orders.tsx 

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  FlatList,
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { DataTable } from '../../components/admin/DataTable';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { databases, DATABASE_ID, COLLECTIONS, ID } from '../../appwrite/config';
import { Query } from 'appwrite';

//  Palette 
const C = {
  bg: '#060B1F', surface: '#0D1535', surfaceAlt: '#111C42', border: '#1E2D60',
  blue1: '#1565C0', blue2: '#1976D2', blue3: '#42A5F5', blue4: '#90CAF9',
  cyan: '#00E5FF', purple: '#7C4DFF', indigo: '#3D5AFE',
  accentGreen: '#00E676', accentOrange: '#FFB300', accentRed: '#FF5252',
  accentPurple: '#CE93D8', accentBlue: '#42A5F5',
  textPrimary: '#E8EAF6', textSecondary: '#9FA8DA', textMuted: '#4A5580',
  white: '#FFFFFF',
};

// Status Pipeline
const STATUS_PIPELINE = [
  { key: 'pending', label: 'Pending', icon: 'clock', color: '#FFB300', bg: '#FFB30020', order: 0 },
  { key: 'confirmed', label: 'Confirmed', icon: 'check-circle', color: '#42A5F5', bg: '#42A5F520', order: 1 },
  { key: 'processing', label: 'Processing', icon: 'settings', color: '#CE93D8', bg: '#CE93D820', order: 2 },
  { key: 'shipped', label: 'Shipped', icon: 'truck', color: '#FF9800', bg: '#FF980020', order: 3 },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'map-pin', color: '#FF6B00', bg: '#FF6B0020', order: 4 },
  { key: 'delivered', label: 'Delivered', icon: 'package', color: '#00E676', bg: '#00E67620', order: 5 },
  { key: 'cancelled', label: 'Cancelled', icon: 'x-circle', color: '#FF5252', bg: '#FF525220', order: 6 },
  { key: 'returned', label: 'Returned', icon: 'rotate-ccw', color: '#FF6B6B', bg: '#FF6B6B20', order: 7 },
];

const getStatusConfig = (key: string) =>
  STATUS_PIPELINE.find(s => s.key === key) || STATUS_PIPELINE[0];

const getStatusIndex = (key: string) => {
  const idx = STATUS_PIPELINE.findIndex(s => s.key === key);
  return idx === -1 ? 0 : idx;
};

const getStatusColor = (status: string) => {
  const config = getStatusConfig(status);
  return { bg: config.bg, color: config.color, icon: config.icon, label: config.label };
};

// Tracking Timeline 
function TrackingTimeline({ currentStatus, timeline }: { currentStatus: string; timeline: any[] }) {
  const steps = STATUS_PIPELINE.filter(s => !['cancelled', 'returned'].includes(s.key));
  const currentIdx = getStatusIndex(currentStatus);
  const isCancelled = currentStatus === 'cancelled';
  const isReturned = currentStatus === 'returned';

  if (isCancelled || isReturned) {
    return (
      <View style={[tl.cancelledBox, { backgroundColor: C.accentRed + '15', borderColor: C.accentRed + '40' }]}>
        <Feather name={isCancelled ? 'x-circle' : 'rotate-ccw'} size={22} color={C.accentRed} />
        <Text style={[tl.cancelledText, { color: C.accentRed }]}>
          This order has been {isCancelled ? 'cancelled' : 'returned'}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={tl.container}>
        {steps.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const pending = i > currentIdx;
          return (
            <React.Fragment key={step.key}>
              <View style={tl.step}>
                <View style={[
                  tl.circle,
                  done && { backgroundColor: C.accentGreen, borderColor: C.accentGreen },
                  active && { borderColor: step.color, backgroundColor: step.bg },
                  pending && { borderColor: C.border, backgroundColor: C.surfaceAlt },
                ]}>
                  {done
                    ? <Feather name="check" size={14} color={C.bg} />
                    : <Feather name={step.icon as any} size={14} color={active ? step.color : C.textMuted} />
                  }
                </View>
                <Text style={[
                  tl.label,
                  done && { color: C.accentGreen },
                  active && { color: step.color, fontWeight: '700' },
                  pending && { color: C.textMuted },
                ]} numberOfLines={1}>{step.label}</Text>
              </View>
              {i < steps.length - 1 && (
                <View style={[tl.line, { backgroundColor: i < currentIdx ? C.accentGreen : C.border }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {timeline && timeline.length > 0 && (
        <View style={tl.timelineHistory}>
          <Text style={[tl.timelineTitle, { color: C.textSecondary }]}>📜 History</Text>
          {timeline.map((item, idx) => {
            const cfg = getStatusConfig(item.status);
            return (
              <View key={idx} style={tl.historyItem}>
                <View style={[tl.historyDot, { backgroundColor: cfg.color }]} />
                <View style={tl.historyContent}>
                  <Text style={[tl.historyStatus, { color: cfg.color }]}>{cfg.label}</Text>
                  <Text style={[tl.historyMessage, { color: C.textMuted }]}>{item.message}</Text>
                  <Text style={[tl.historyTime, { color: C.textMuted }]}>
                    {new Date(item.$createdAt || item.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const tl = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 16, paddingHorizontal: 4, flexWrap: 'wrap' },
  step: { alignItems: 'center', flex: 0, minWidth: 60, marginBottom: 8 },
  circle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 9, textAlign: 'center', width: 60 },
  line: { flex: 1, height: 2, marginTop: 15, borderRadius: 1, minWidth: 20 },
  cancelledBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginVertical: 12 },
  cancelledText: { fontWeight: '600', fontSize: 14, flex: 1 },
  timelineHistory: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1E2D60' },
  timelineTitle: { fontSize: 12, fontWeight: '600', marginBottom: 10 },
  historyItem: { flexDirection: 'row', marginBottom: 12, gap: 10 },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  historyContent: { flex: 1 },
  historyStatus: { fontSize: 12, fontWeight: '600' },
  historyMessage: { fontSize: 11, marginTop: 2 },
  historyTime: { fontSize: 10, marginTop: 2 },
});

//  Messenger Modal (Chat System like - Both sides) 
function MessengerModal({ visible, onClose, order, chatMessages, onSendMessage, updating }: any) {
  const [message, setMessage] = useState('');
  const flatListRef = React.useRef<any>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  React.useEffect(() => {
    if (visible) scrollToBottom();
  }, [visible, chatMessages]);

  const sendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      scrollToBottom();
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={msg.modalOverlay}>
        <View style={msg.modalWrapper}>
          <LinearGradient colors={['#0A1647', '#0D1F6E']} style={msg.header}>
            <View style={msg.headerContent}>
              <TouchableOpacity onPress={onClose} style={msg.backButton}>
                <Feather name="arrow-left" size={22} color={C.white} />
              </TouchableOpacity>
              <View>
                <Text style={msg.headerTitle}>Order #{order?.$id?.slice(-8)}</Text>
                <Text style={msg.headerSubtitle}>{order?.customerName}</Text>
              </View>
              <View style={[msg.statusBadge, { backgroundColor: getStatusColor(order?.orderStatus).bg, borderColor: getStatusColor(order?.orderStatus).color }]}>
                <Feather name={getStatusColor(order?.orderStatus).icon as any} size={12} color={getStatusColor(order?.orderStatus).color} />
                <Text style={[msg.statusBadgeText, { color: getStatusColor(order?.orderStatus).color }]}>
                  {getStatusColor(order?.orderStatus).label}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Messages List - Both Admin and Customer messages (Chat style) */}
          <FlatList
            ref={flatListRef}
            data={chatMessages}
            keyExtractor={(item, idx) => idx.toString()}
            style={msg.messagesList}
            contentContainerStyle={msg.messagesContent}
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
            renderItem={({ item }) => (
              <View style={[msg.messageRow, item.senderType === 'admin' ? msg.adminRow : msg.customerRow]}>
                <View style={[msg.messageBubble, item.senderType === 'admin' ? msg.adminBubble : msg.customerBubble]}>
                  <Text style={[msg.messageText, item.senderType === 'admin' && msg.adminText]}>
                    {item.message}
                  </Text>
                  <Text style={msg.messageTime}>
                    {new Date(item.$createdAt || item.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            )}
          />

          {/* Input Section */}
          <View style={msg.inputContainer}>
            <TextInput
              style={msg.input}
              placeholder="Type a message..."
              placeholderTextColor={C.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <TouchableOpacity style={msg.sendButton} onPress={sendMessage} disabled={updating}>
              <LinearGradient colors={[C.cyan, C.blue3]} style={msg.sendGradient}>
                <Feather name="send" size={18} color={C.bg} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const msg = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  modalWrapper: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 14, fontWeight: '600', color: C.white },
  headerSubtitle: { fontSize: 12, color: C.textMuted },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  messagesList: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  messageRow: { flexDirection: 'row' },
  adminRow: { justifyContent: 'flex-end' },
  customerRow: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  adminBubble: { backgroundColor: C.cyan + '20', borderWidth: 1, borderColor: C.cyan + '40' },
  customerBubble: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  messageText: { fontSize: 14, color: C.textPrimary },
  adminText: { color: C.cyan },
  messageTime: { fontSize: 10, color: C.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  inputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface, gap: 8 },
  input: { flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: C.textPrimary, maxHeight: 80 },
  sendButton: { borderRadius: 25, overflow: 'hidden' },
  sendGradient: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});

// ─── Main Orders Screen ───────────────────────────────────────────────────────
export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [messengerVisible, setMessengerVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState(false);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('');

  const selectedOrderRef = useRef<any>(null);
  useEffect(() => { selectedOrderRef.current = selectedOrder; }, [selectedOrder]);

  const filterRef = useRef(filter);
  useEffect(() => { filterRef.current = filter; }, [filter]);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const currentFilter = filterRef.current;
      const queries: any[] = [Query.orderDesc('$createdAt')];
      if (currentFilter !== 'all') {
        queries.push(Query.equal('orderStatus', [currentFilter]));
      }
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ORDERS, queries);
      setOrders(response.documents);
      setFilteredOrders(response.documents);
    } catch (error: any) {
      console.error('Error loading orders:', error);
      if (!silent) Alert.alert('Error', 'Failed to load orders: ' + (error?.message || error));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [filter, loadOrders]);
  useEffect(() => { filterOrders(); }, [orders, searchQuery]);

  const loadTimeline = async (orderId: string) => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ORDER_TIMELINE, [
        Query.equal('orderId', [orderId]),
        Query.orderAsc('$createdAt')
      ]);
      setTimeline(response.documents);
    } catch (error) {
      console.error('Error loading timeline:', error);
    }
  };

  const loadChatMessages = async (orderId: string, customerId: string) => {
    try {
      const chats = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CHATS, [
        Query.equal('orderId', [orderId]),
      ]);
      let chatId: string;
      if (chats.documents.length === 0) {
        const newChat = await databases.createDocument(DATABASE_ID, COLLECTIONS.CHATS, ID.unique(), {
          orderId, customerId, adminId: 'admin', customerUnread: 0, adminUnread: 0,
          status: 'active', lastMessage: '', lastMessageAt: new Date().toISOString()
        });
        chatId = newChat.$id;
      } else {
        chatId = chats.documents[0].$id;
      }
      const messages = await databases.listDocuments(DATABASE_ID, COLLECTIONS.MESSAGES, [
        Query.equal('chatId', [chatId]),
        Query.orderAsc('$createdAt'),
      ]);
      setChatMessages(messages.documents);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const filterOrders = () => {
    if (!searchQuery.trim()) { setFilteredOrders(orders); return; }
    const q = searchQuery.toLowerCase();
    setFilteredOrders(orders.filter(o =>
      o.$id?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.customerEmail?.toLowerCase().includes(q) ||
      o.phone?.includes(q)
    ));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const addToTimeline = async (orderId: string, status: string, message: string, createdBy: string) => {
    try {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.ORDER_TIMELINE, ID.unique(), {
        orderId, status, message, createdBy,
      });
    } catch (error) {
      console.error('Timeline write failed (non-critical):', error);
    }
  };

  const sendAutoNotification = async (orderId: string, statusLabel: string, trackingNumber?: string) => {
    try {
      const chats = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CHATS, [
        Query.equal('orderId', [orderId]),
      ]);

      let message = `📢 Your order has been ${statusLabel.toLowerCase()}`;
      if (statusLabel === 'Shipped' && trackingNumber) {
        message = `📢 Your order has been shipped! Tracking number: ${trackingNumber}`;
      } else if (statusLabel === 'Delivered') {
        message = `🎉 Your order has been delivered! Thank you for shopping with us.`;
      } else if (statusLabel === 'Cancelled') {
        message = `⚠️ Your order has been cancelled. Please contact support.`;
      }

      if (chats.documents.length === 0) {
        const orderDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.ORDERS, orderId);
        const newChat = await databases.createDocument(DATABASE_ID, COLLECTIONS.CHATS, ID.unique(), {
          orderId, customerId: orderDoc.userId, adminId: 'admin',
          customerUnread: 1, adminUnread: 0, status: 'active',
          lastMessage: message, lastMessageAt: new Date().toISOString()
        });
        await databases.createDocument(DATABASE_ID, COLLECTIONS.MESSAGES, ID.unique(), {
          chatId: newChat.$id, senderId: 'system', senderType: 'system',
          message, type: 'notification', read: false,
        });
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.MESSAGES, ID.unique(), {
          chatId: chats.documents[0].$id, senderId: 'system', senderType: 'system',
          message, type: 'notification', read: false,
        });
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.CHATS, chats.documents[0].$id, {
          lastMessage: message,
          lastMessageAt: new Date().toISOString(),
          customerUnread: (chats.documents[0].customerUnread || 0) + 1,
        });
      }
    } catch (error) {
      console.error('Auto-notification failed (non-critical):', error);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const cfg = getStatusConfig(newStatus);
    const currentOrder = selectedOrderRef.current;

    Alert.alert(
      'Confirm Update',
      `Mark this order as "${cfg.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Update',
          onPress: async () => {
            setUpdating(true);
            try {
              await databases.updateDocument(DATABASE_ID, COLLECTIONS.ORDERS, orderId, {
                orderStatus: newStatus
              });

              setOrders(prev =>
                prev.map(o => o.$id === orderId ? { ...o, orderStatus: newStatus } : o)
              );
              setFilteredOrders(prev =>
                prev.map(o => o.$id === orderId ? { ...o, orderStatus: newStatus } : o)
              );
              setSelectedOrder((prev: any) => {
                if (prev && prev.$id === orderId) {
                  return { ...prev, orderStatus: newStatus };
                }
                return prev;
              });

              await loadTimeline(orderId);

              addToTimeline(orderId, newStatus, `Order status updated to ${cfg.label}`, 'admin');
              sendAutoNotification(orderId, cfg.label, currentOrder?.trackingNumber);

              Alert.alert('✅ Updated', `Order is now "${cfg.label}"`);

            } catch (error: any) {
              console.error('Status update error:', error);
              Alert.alert(
                '❌ Update Failed',
                'Could not update order status.\n\n' +
                'Reason: ' + (error?.message || JSON.stringify(error))
              );
            } finally {
              setUpdating(false);
              setSelectedStatus('');
            }
          },
        },
      ]
    );
  };

  const sendMessage = async (message: string) => {
    const order = selectedOrderRef.current;
    if (!order) return;
    try {
      const chats = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CHATS, [
        Query.equal('orderId', [order.$id]),
      ]);
      let chatId: string;
      if (chats.documents.length === 0) {
        const newChat = await databases.createDocument(DATABASE_ID, COLLECTIONS.CHATS, ID.unique(), {
          orderId: order.$id, customerId: order.userId, adminId: 'admin',
          customerUnread: 1, adminUnread: 0, status: 'active',
          lastMessage: message, lastMessageAt: new Date().toISOString()
        });
        chatId = newChat.$id;
      } else {
        chatId = chats.documents[0].$id;
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.CHATS, chatId, {
          customerUnread: (chats.documents[0].customerUnread || 0) + 1,
          lastMessage: message,
          lastMessageAt: new Date().toISOString(),
        });
      }
      await databases.createDocument(DATABASE_ID, COLLECTIONS.MESSAGES, ID.unique(), {
        chatId, senderId: 'admin', senderType: 'admin',
        message, type: 'text', read: false,
      });
      await loadChatMessages(order.$id, order.userId);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleOrderPress = async (order: any) => {
    setSelectedOrder(order);
    setSelectedStatus('');
    await loadTimeline(order.$id);
    setModalVisible(true);
  };

  const openMessenger = async () => {
    const order = selectedOrderRef.current;
    if (!order) return;
    await loadChatMessages(order.$id, order.userId);
    setMessengerVisible(true);
  };

  const getStatusOptions = (current: string) => {
    if (['delivered', 'cancelled', 'returned'].includes(current)) return [];
    const currentIdx = getStatusIndex(current);
    const forward = STATUS_PIPELINE
      .filter(s => !['cancelled', 'returned'].includes(s.key))
      .slice(currentIdx + 1)
      .map(s => s.key);
    return [...forward, 'cancelled', 'returned'];
  };

  const stats = {
    total: filteredOrders.length,
    pending: filteredOrders.filter(o => o.orderStatus === 'pending').length,
    confirmed: filteredOrders.filter(o => o.orderStatus === 'confirmed').length,
    processing: filteredOrders.filter(o => o.orderStatus === 'processing').length,
    shipped: filteredOrders.filter(o => o.orderStatus === 'shipped').length,
    out_for_delivery: filteredOrders.filter(o => o.orderStatus === 'out_for_delivery').length,
    delivered: filteredOrders.filter(o => o.orderStatus === 'delivered').length,
    cancelled: filteredOrders.filter(o => o.orderStatus === 'cancelled').length,
    revenue: filteredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0),
  };

  const columns = [
    {
      key: '$id', title: 'Order ID', width: 100,
      render: (item: any) => <Text style={s.orderId}>#{item.$id?.slice(-8)}</Text>,
    },
    {
      key: 'customerName', title: 'Customer', width: 150,
      render: (item: any) => (
        <View>
          <Text style={s.customerName}>{item.customerName || 'N/A'}</Text>
          <Text style={s.customerEmail}>{item.phone || ''}</Text>
        </View>
      ),
    },
    {
      key: 'totalAmount', title: 'Total', width: 100,
      render: (item: any) => <Text style={s.amount}>৳{item.totalAmount?.toLocaleString()}</Text>,
    },
    {
      key: 'paymentStatus', title: 'Payment', width: 100,
      render: (item: any) => <StatusBadge status={item.paymentStatus} type="payment" />,
    },
    {
      key: 'orderStatus', title: 'Status', width: 120,
      render: (item: any) => {
        const cfg = getStatusConfig(item.orderStatus);
        return (
          <View style={[s.statusPill, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
            <Feather name={cfg.icon as any} size={11} color={cfg.color} />
            <Text style={[s.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        );
      },
    },
    {
      key: '$createdAt', title: 'Date', width: 100,
      render: (item: any) => (
        <Text style={s.dateText}>
          {item.$createdAt ? new Date(item.$createdAt).toLocaleDateString() : 'N/A'}
        </Text>
      ),
    },
    {
      key: 'actions', title: '', width: 50,
      render: (item: any) => (
        <TouchableOpacity onPress={() => handleOrderPress(item)}>
          <Feather name="eye" size={16} color={C.cyan} />
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#0A1647', '#0D1F6E', '#1034A6']} style={s.heroHeader}>
        <View style={s.heroRow}>
          <View>
            <Text style={s.heroTitle}>📦 Order Management</Text>
            <Text style={s.heroSubtitle}>Track, manage & communicate with customers</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
          {[
            { label: 'Total', val: stats.total, color: C.blue4 },
            { label: 'Pending', val: stats.pending, color: '#FFB300' },
            { label: 'Confirmed', val: stats.confirmed, color: '#42A5F5' },
            { label: 'Processing', val: stats.processing, color: '#CE93D8' },
            { label: 'Shipped', val: stats.shipped, color: '#FF9800' },
            { label: 'Out for Delivery', val: stats.out_for_delivery, color: '#FF6B00' },
            { label: 'Delivered', val: stats.delivered, color: '#00E676' },
            { label: 'Cancelled', val: stats.cancelled, color: '#FF5252' },
            { label: 'Revenue', val: `৳${stats.revenue.toLocaleString()}`, color: C.cyan },
          ].map((item, i) => (
            <View key={i} style={[s.heroChip, { borderColor: item.color + '50' }]}>
              <Text style={[s.heroChipVal, { color: item.color }]}>{item.val}</Text>
              <Text style={s.heroChipLabel}>{item.label}</Text>
            </View>
          ))}
        </ScrollView>
      </LinearGradient>

      <View style={s.searchBar}>
        <Feather name="search" size={18} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by Order ID, Customer, Phone..."
          placeholderTextColor={C.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar}>
        {['all', ...STATUS_PIPELINE.map(sp => sp.key)].map(status => {
          const cfg = status === 'all' ? null : getStatusConfig(status);
          const active = filter === status;
          const count = status === 'all' ? stats.total : (stats as any)[status] ?? 0;
          return (
            <TouchableOpacity
              key={status}
              style={[
                s.filterChip,
                active && { backgroundColor: cfg?.bg || C.blue1 + '30', borderColor: cfg?.color || C.cyan },
              ]}
              onPress={() => setFilter(status)}
            >
              {cfg && (
                <Feather
                  name={cfg.icon as any}
                  size={12}
                  color={active ? cfg.color : C.textMuted}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[s.filterText, active && { color: cfg?.color || C.cyan, fontWeight: '700' }]}>
                {status === 'all' ? 'All' : cfg!.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} colors={[C.cyan]} />}>
        <DataTable columns={columns} data={filteredOrders} loading={loading} onPress={handleOrderPress} />
      </ScrollView>

      {/* Order Detail Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalWrapper}>
            <LinearGradient colors={['#0A1647', '#0D1F6E']} style={s.modalHeader}>
              <View style={s.modalHeaderContent}>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalHeaderLabel}>Order Details</Text>
                  {selectedOrder && (
                    <Text style={s.modalHeaderId}>#{selectedOrder.$id?.slice(-12)}</Text>
                  )}
                </View>
                <View style={s.modalHeaderActions}>
                  <TouchableOpacity onPress={openMessenger} style={s.messengerButton}>
                    <Feather name="message-circle" size={20} color={C.cyan} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={s.modalCloseBtn}
                  >
                    <Feather name="x" size={20} color={C.white} />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>

            <ScrollView style={s.modalBody}>
              {selectedOrder && (
                <>
                  <TrackingTimeline
                    currentStatus={selectedOrder.orderStatus}
                    timeline={timeline}
                  />

                  <View style={s.section}>
                    <Text style={s.sectionTitle}>👤 Customer Details</Text>
                    {[
                      { label: 'Name', value: selectedOrder.customerName },
                      { label: 'Phone', value: selectedOrder.phone },
                      { label: 'Email', value: selectedOrder.customerEmail },
                      { label: 'Address', value: selectedOrder.shippingAddress || selectedOrder.address },
                    ].map(row => (
                      <View key={row.label} style={s.infoRow}>
                        <Text style={s.infoLabel}>{row.label}</Text>
                        <Text style={s.infoValue}>{row.value}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={s.section}>
                    <Text style={s.sectionTitle}>💰 Payment Details</Text>
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Payment Method</Text>
                      <Text style={s.infoValue}>
                        {selectedOrder.paymentMethod?.toUpperCase() || 'COD'}
                      </Text>
                    </View>
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Payment Status</Text>
                      <StatusBadge status={selectedOrder.paymentStatus} type="payment" />
                    </View>
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Total Amount</Text>
                      <Text style={[s.infoValue, { color: C.accentGreen, fontWeight: '800' }]}>
                        ৳{selectedOrder.totalAmount?.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={s.section}>
                    <Text style={s.sectionTitle}>🛍️ Products</Text>
                    {(selectedOrder.items
                      ? JSON.parse(selectedOrder.items)
                      : selectedOrder.products || []
                    ).map((item: any, i: number) => (
                      <View key={i} style={s.productCard}>
                        <View style={s.productIconBox}>
                          <Feather name="box" size={20} color={C.blue3} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.productName}>{item.name}</Text>
                          <View style={s.productMeta}>
                            {item.size && <View style={s.metaTag}><Text style={s.metaTagText}>Size: {item.size}</Text></View>}
                            {item.color && <View style={s.metaTag}><Text style={s.metaTagText}>Color: {item.color}</Text></View>}
                            <View style={s.metaTag}><Text style={s.metaTagText}>Qty: {item.quantity}</Text></View>
                          </View>
                        </View>
                        <Text style={s.productPrice}>৳{item.price?.toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={s.section}>
                    <Text style={s.sectionTitle}>🚚 Shipping Details</Text>
                    <TextInput
                      style={s.input}
                      placeholder="Tracking Number"
                      placeholderTextColor={C.textMuted}
                      value={selectedOrder.trackingNumber || ''}
                      onChangeText={async text => {
                        try {
                          await databases.updateDocument(
                            DATABASE_ID, COLLECTIONS.ORDERS, selectedOrder.$id,
                            { trackingNumber: text }
                          );
                          setSelectedOrder((prev: any) => ({ ...prev, trackingNumber: text }));
                        } catch (e) {
                          console.error('Tracking number update failed:', e);
                        }
                      }}
                    />
                    <TextInput
                      style={[s.input, { marginTop: 8 }]}
                      placeholder="Courier Name"
                      placeholderTextColor={C.textMuted}
                      value={selectedOrder.courierName || ''}
                      onChangeText={async text => {
                        try {
                          await databases.updateDocument(
                            DATABASE_ID, COLLECTIONS.ORDERS, selectedOrder.$id,
                            { courierName: text }
                          );
                          setSelectedOrder((prev: any) => ({ ...prev, courierName: text }));
                        } catch (e) {
                          console.error('Courier name update failed:', e);
                        }
                      }}
                    />
                  </View>

                  {getStatusOptions(selectedOrder.orderStatus).length > 0 ? (
                    <View style={s.section}>
                      <Text style={s.sectionTitle}>⚙️ Update Status</Text>

                      <View style={s.pickerContainer}>
                        <Picker
                          selectedValue={selectedStatus}
                          onValueChange={value => setSelectedStatus(value)}
                          style={s.picker}
                          dropdownIconColor={C.cyan}
                          prompt="Select order status"
                        >
                          <Picker.Item label="-- Select Status --" value="" color={C.textMuted} />
                          {getStatusOptions(selectedOrder.orderStatus).map(statusKey => {
                            const cfg = getStatusConfig(statusKey);
                            return (
                              <Picker.Item
                                key={statusKey}
                                label={cfg.label}
                                value={statusKey}
                                color={cfg.color}
                              />
                            );
                          })}
                        </Picker>
                      </View>

                      <TouchableOpacity
                        style={[
                          s.updateStatusBtn,
                          (!selectedStatus || updating) && s.updateStatusBtnDisabled,
                        ]}
                        onPress={() => {
                          if (selectedStatus && !updating) {
                            handleStatusUpdate(selectedOrder.$id, selectedStatus);
                          }
                        }}
                        disabled={!selectedStatus || updating}
                      >
                        <LinearGradient
                          colors={[C.blue2, C.cyan]}
                          style={s.updateStatusGradient}
                        >
                          <Feather name="refresh-cw" size={16} color={C.bg} />
                          <Text style={s.updateStatusText}>Update Status</Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <Text style={s.quickActionLabel}>Quick Actions:</Text>
                      <View style={s.statusButtonsGrid}>
                        {getStatusOptions(selectedOrder.orderStatus).slice(0, 4).map(statusKey => {
                          const cfg = getStatusConfig(statusKey);
                          return (
                            <TouchableOpacity
                              key={statusKey}
                              style={[s.statusButton, { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                              onPress={() => !updating && handleStatusUpdate(selectedOrder.$id, statusKey)}
                              disabled={updating}
                            >
                              <Feather name={cfg.icon as any} size={14} color={cfg.color} />
                              <Text style={[s.statusButtonText, { color: cfg.color }]}>{cfg.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ) : (
                    <View style={[
                      s.finalStatusBox,
                      {
                        backgroundColor: selectedOrder.orderStatus === 'delivered'
                          ? C.accentGreen + '20'
                          : C.accentRed + '20',
                      },
                    ]}>
                      <Feather
                        name={selectedOrder.orderStatus === 'delivered' ? 'check-circle' : 'x-circle'}
                        size={24}
                        color={selectedOrder.orderStatus === 'delivered' ? C.accentGreen : C.accentRed}
                      />
                      <Text style={[s.finalStatusText, {
                        color: selectedOrder.orderStatus === 'delivered' ? C.accentGreen : C.accentRed,
                      }]}>
                        Order {selectedOrder.orderStatus === 'delivered'
                          ? 'Completed Successfully'
                          : 'Cancelled/Returned'}
                      </Text>
                    </View>
                  )}
                </>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Messenger Modal - Chat System like (Both sides) */}
      <MessengerModal
        visible={messengerVisible}
        onClose={() => setMessengerVisible(false)}
        order={selectedOrder}
        chatMessages={chatMessages}
        onSendMessage={sendMessage}
        updating={updating}
      />

      {updating && (
        <View style={s.globalLoader}>
          <ActivityIndicator size="large" color={C.cyan} />
          <Text style={s.globalLoaderText}>Updating order...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// Styles 
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  heroHeader: { overflow: 'hidden', paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 20 : 20, paddingBottom: 18 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: C.white, marginBottom: 4 },
  heroSubtitle: { fontSize: 13, color: C.blue4 },
  heroChip: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, minWidth: 80 },
  heroChipVal: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  heroChipLabel: { fontSize: 9, color: C.textMuted },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, margin: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: C.textPrimary },
  filterBar: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, marginRight: 8 },
  filterText: { color: C.textMuted, fontSize: 12 },
  orderId: { fontFamily: 'monospace', fontWeight: 'bold', fontSize: 12, color: C.cyan },
  customerName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  customerEmail: { fontSize: 10, color: C.textMuted },
  amount: { fontWeight: 'bold', color: C.accentGreen, fontSize: 14 },
  dateText: { fontSize: 11, color: C.textSecondary },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalWrapper: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', overflow: 'hidden' },
  modalHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  modalHeaderContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalHeaderLabel: { fontSize: 12, color: C.blue4, textTransform: 'uppercase', marginBottom: 4 },
  modalHeaderId: { fontSize: 16, fontWeight: 'bold', color: C.white },
  modalHeaderActions: { flexDirection: 'row', gap: 10 },
  messengerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cyan + '20', justifyContent: 'center', alignItems: 'center' },
  modalCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 16 },
  section: { backgroundColor: C.surfaceAlt, borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  infoLabel: { fontSize: 13, color: C.textSecondary, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '500', color: C.textPrimary, flex: 1.5, textAlign: 'right' },
  productCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  productIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.blue1 + '30', justifyContent: 'center', alignItems: 'center' },
  productName: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 6 },
  productMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaTag: { backgroundColor: C.surfaceAlt, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: C.border },
  metaTagText: { fontSize: 10, color: C.textSecondary },
  productPrice: { fontSize: 14, fontWeight: '800', color: C.accentGreen },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 14, color: C.textPrimary, backgroundColor: C.surface },
  pickerContainer: { backgroundColor: C.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: 'hidden' },
  picker: { color: C.textPrimary, height: 50 },
  updateStatusBtn: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  updateStatusBtnDisabled: { opacity: 0.5 },
  updateStatusGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  updateStatusText: { fontSize: 14, fontWeight: '700', color: C.bg },
  quickActionLabel: { fontSize: 12, color: C.textMuted, marginBottom: 8 },
  statusButtonsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  statusButtonText: { fontSize: 12, fontWeight: '600' },
  finalStatusBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, borderRadius: 16, marginBottom: 14, borderWidth: 1 },
  finalStatusText: { fontSize: 15, fontWeight: '700' },
  globalLoader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,11,31,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  globalLoaderText: { marginTop: 12, fontSize: 14, color: C.cyan, fontWeight: '600' },
});
