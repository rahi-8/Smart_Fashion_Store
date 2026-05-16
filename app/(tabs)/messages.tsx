// app/(tabs)/messages.tsx - আপডেটেড ফাইল

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { account, databases, DATABASE_ID, COLLECTIONS, ID } from '../../appwrite/config';
import { Query } from 'appwrite';

interface Chat {
  $id: string;
  orderId: string;
  customerId: string;
  adminId: string;
  customerUnread: number;
  adminUnread: number;
  lastMessage: string;
  lastMessageAt: string;
  status: string;
}

interface Message {
  $id: string;
  chatId: string;
  senderId: string;
  senderType: string;
  message: string;
  type: string;
  read: boolean;
  $createdAt: string;
}

interface Order {
  $id: string;
  orderStatus: string;
  totalAmount: number;
}

export default function MessagesScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useFocusEffect(useCallback(() => {
    loadChats();
  }, []));

  const loadCurrentUser = async () => {
    try {
      const user = await account.get();
      setCurrentUser(user);
    } catch (error) {
      console.error('Load user error:', error);
    }
  };

  const loadChats = async () => {
    setLoading(true);
    try {
      const user = await account.get();
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.CHATS,
        [
          Query.equal('customerId', user.$id),
          Query.equal('status', 'active'),
          Query.orderDesc('lastMessageAt')
        ]
      );
      setChats(response.documents as unknown as Chat[]);
      
      // Mark all chats as read (customer side)
      for (const chat of response.documents) {
        if (chat.customerUnread > 0) {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.CHATS, chat.$id, {
            customerUnread: 0
          });
        }
      }
    } catch (error) {
      console.error('Load chats error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  const loadMessages = async (chat: Chat) => {
    setSelectedChat(chat);
    try {
      // Get messages with proper order
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        [
          Query.equal('chatId', chat.$id),
          Query.orderAsc('$createdAt')
        ]
      );
      console.log('📩 Messages loaded:', response.documents.length);
      setMessages(response.documents as unknown as Message[]);
      
      // Load order details
      try {
        const orderRes = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.ORDERS,
          chat.orderId
        );
        setOrderDetails(orderRes as unknown as Order);
      } catch (err) {
        console.error('Order load error:', err);
      }
      
      // Mark admin messages as read
      const unreadMessages = response.documents.filter(
        (msg: any) => msg.senderType === 'admin' && !msg.read
      );
      for (const msg of unreadMessages) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.MESSAGES, msg.$id, { read: true });
      }
      
      scrollToBottom();
    } catch (error) {
      console.error('Load messages error:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat || !currentUser) return;

    setSending(true);
    try {
      const newMessage = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        ID.unique(),
        {
          chatId: selectedChat.$id,
          senderId: currentUser.$id,
          senderType: 'customer',
          message: messageText.trim(),
          type: 'text',
          read: false,
        }
      );
      
      // Update chat last message
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.CHATS, selectedChat.$id, {
        lastMessage: messageText.trim(),
        lastMessageAt: new Date().toISOString(),
        adminUnread: (selectedChat.adminUnread || 0) + 1
      });
      
      setMessages(prev => [...prev, newMessage as unknown as Message]);
      setMessageText('');
      scrollToBottom();
      loadChats(); // Refresh chats list
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = diff / (1000 * 60 * 60);
      
      if (hours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (hours < 48) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return '#4CAF50';
      case 'shipped': return '#2196F3';
      case 'processing': return '#FF9800';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity 
      style={[styles.chatItem, selectedChat?.$id === item.$id && styles.chatItemActive]}
      onPress={() => loadMessages(item)}
    >
      <View style={styles.chatAvatar}>
        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#19699d" />
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.chatTitle}>Order #{item.orderId?.slice(-8)}</Text>
        <Text style={styles.chatLastMsg} numberOfLines={1}>
          {item.lastMessage || 'Start conversation'}
        </Text>
      </View>
      <View style={styles.chatRight}>
        <Text style={styles.chatTime}>{formatTime(item.lastMessageAt)}</Text>
        {item.adminUnread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.adminUnread}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageRow,
      item.senderType === 'customer' ? styles.customerRow : styles.adminRow
    ]}>
      <View style={[
        styles.messageBubble,
        item.senderType === 'customer' ? styles.customerBubble : styles.adminBubble
      ]}>
        <Text style={[styles.messageText, item.senderType === 'admin' && styles.adminMessageText]}>
          {item.message}
        </Text>
        <Text style={styles.messageTime}>
          {item.$createdAt ? new Date(item.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </Text>
      </View>
    </View>
  );

  if (loading && chats.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#19699d" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0A1647', '#0D1F6E', '#1034A6']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {selectedChat ? (
        <View style={styles.chatView}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setSelectedChat(null)} style={styles.chatBackBtn}>
              <Ionicons name="arrow-back" size={22} color="#19699d" />
            </TouchableOpacity>
            <View>
              <Text style={styles.chatHeaderTitle}>Order #{selectedChat.orderId?.slice(-8)}</Text>
              {orderDetails && (
                <View style={styles.orderStatusBadge}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(orderDetails.orderStatus) }]} />
                  <Text style={styles.orderStatusText}>
                    {orderDetails.orderStatus?.charAt(0).toUpperCase() + orderDetails.orderStatus?.slice(1)}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity>
              <Ionicons name="call-outline" size={22} color="#19699d" />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderMessage}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]} 
              onPress={sendMessage}
              disabled={sending || !messageText.trim()}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {chats.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>No Messages Yet</Text>
              <Text style={styles.emptyText}>
                When you place an order, you can chat with our support team here.
              </Text>
              <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/(tabs)/home')}>
                <Text style={styles.shopBtnText}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={chats}
              keyExtractor={(item) => item.$id}
              renderItem={renderChatItem}
              style={styles.chatsList}
              contentContainerStyle={styles.chatsContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#19699d']} />
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6c757d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  chatsList: {
    flex: 1,
  },
  chatsContent: {
    padding: 12,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chatItemActive: {
    backgroundColor: '#19699d10',
    borderWidth: 1,
    borderColor: '#19699d30',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#19699d15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  chatLastMsg: {
    fontSize: 12,
    color: '#6c757d',
  },
  chatRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chatTime: {
    fontSize: 10,
    color: '#adb5bd',
    marginBottom: 6,
  },
  unreadBadge: {
    backgroundColor: '#dc3545',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  chatView: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  chatBackBtn: {
    padding: 6,
  },
  chatHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  orderStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orderStatusText: {
    fontSize: 11,
    color: '#6c757d',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  customerRow: {
    justifyContent: 'flex-end',
  },
  adminRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  customerBubble: {
    backgroundColor: '#19699d',
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    backgroundColor: '#e9ecef',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#fff',
  },
  adminMessageText: {
    color: '#212529',
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#19699d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 30,
  },
  shopBtn: {
    backgroundColor: '#19699d',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  shopBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
