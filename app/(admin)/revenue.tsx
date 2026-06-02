//revenue.tsx 

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { databases, DATABASE_ID, COLLECTIONS } from '../../appwrite/config';
import { Query } from 'appwrite';

const { width } = Dimensions.get('window');

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

type RevenueData = {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  projectedRevenue: number;
  growth: number;
  pendingPayments: number;
  completedPayments: number;
  refunds: number;
  cancelledRevenue: number;
};

type PeriodData = {
  label: string;
  revenue: number;
  orders: number;
  date: Date;
};

type ProductPerformance = {
  name: string;
  revenue: number;
  units: number;
  productId: string;
};

export default function RevenueScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [stats, setStats] = useState<RevenueData>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    projectedRevenue: 0,
    growth: 0,
    pendingPayments: 0,
    completedPayments: 0,
    refunds: 0,
    cancelledRevenue: 0,
  });
  const [revenueHistory, setRevenueHistory] = useState<PeriodData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductPerformance[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);

  const calculateRevenueStats = useCallback((orders: any[]) => {
    // Calculate total revenue from delivered orders only
    const deliveredOrders = orders.filter(o => o.orderStatus === 'delivered');
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    // Calculate pending payments (confirmed/processing/shipped but not delivered)
    const pendingOrders = orders.filter(o => 
      ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery'].includes(o.orderStatus)
    );
    const pendingPayments = pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    // Calculate completed payments (delivered)
    const completedPayments = totalRevenue;
    
    // Calculate refunds (returned orders)
    const returnedOrders = orders.filter(o => o.orderStatus === 'returned');
    const refunds = returnedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    // Calculate cancelled revenue
    const cancelledOrders = orders.filter(o => o.orderStatus === 'cancelled');
    const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Calculate growth (compare last 30 days with previous 30 days)
    const now = new Date();
    const last30Days = orders.filter(o => {
      const orderDate = new Date(o.$createdAt);
      const daysDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30 && daysDiff > 0 && o.orderStatus === 'delivered';
    });
    const previous30Days = orders.filter(o => {
      const orderDate = new Date(o.$createdAt);
      const daysDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 30 && daysDiff <= 60 && o.orderStatus === 'delivered';
    });
    
    const last30Revenue = last30Days.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const previous30Revenue = previous30Days.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    let growth = 0;
    if (previous30Revenue > 0) {
      growth = ((last30Revenue - previous30Revenue) / previous30Revenue) * 100;
    } else if (last30Revenue > 0) {
      growth = 100;
    }
    
    // Projected revenue 
    const projectedRevenue = last30Revenue * 2;
    
    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      projectedRevenue,
      growth,
      pendingPayments,
      completedPayments,
      refunds,
      cancelledRevenue,
    };
  }, []);

  const generateRevenueHistory = useCallback((orders: any[], range: string) => {
    const deliveredOrders = orders.filter(o => o.orderStatus === 'delivered');
    const now = new Date();
    const history: PeriodData[] = [];
    
    if (range === 'monthly') {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const monthOrders = deliveredOrders.filter(o => {
          const orderDate = new Date(o.$createdAt);
          return orderDate >= date && orderDate <= monthEnd;
        });
        
        const revenue = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        history.push({
          label: date.toLocaleString('default', { month: 'short' }),
          revenue,
          orders: monthOrders.length,
          date,
        });
      }
    } else if (range === 'weekly') {
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (now.getDay() + 7 * i));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekOrders = deliveredOrders.filter(o => {
          const orderDate = new Date(o.$createdAt);
          return orderDate >= weekStart && orderDate <= weekEnd;
        });
        
        const revenue = weekOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        history.push({
          label: `W${Math.abs(i - 7) + 1}`,
          revenue,
          orders: weekOrders.length,
          date: weekStart,
        });
      }
    } else if (range === 'daily') {
      // Last 14 days
      for (let i = 13; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        
        const dayOrders = deliveredOrders.filter(o => {
          const orderDate = new Date(o.$createdAt);
          return orderDate >= date && orderDate < nextDate;
        });
        
        const revenue = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        history.push({
          label: date.toLocaleString('default', { weekday: 'short' }),
          revenue,
          orders: dayOrders.length,
          date,
        });
      }
    } else if (range === 'yearly') {
      // Last 4 years
      for (let i = 3; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        const yearOrders = deliveredOrders.filter(o => {
          const orderDate = new Date(o.$createdAt);
          return orderDate >= yearStart && orderDate <= yearEnd;
        });
        
        const revenue = yearOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        history.push({
          label: year.toString(),
          revenue,
          orders: yearOrders.length,
          date: yearStart,
        });
      }
    }
    
    return history;
  }, []);

  const calculateTopProducts = useCallback((orders: any[]) => {
    const productMap = new Map<string, { name: string; revenue: number; units: number }>();
    
    orders.forEach(order => {
      if (order.orderStatus === 'delivered') {
        let items = [];
        try {
          items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || order.products || []);
        } catch (e) {
          items = [];
        }
        
        items.forEach((item: any) => {
          const productId = item.id || item.productId || item.name;
          const existing = productMap.get(productId);
          if (existing) {
            existing.revenue += (item.price || 0) * (item.quantity || 1);
            existing.units += item.quantity || 1;
          } else {
            productMap.set(productId, {
              name: item.name,
              revenue: (item.price || 0) * (item.quantity || 1),
              units: item.quantity || 1,
            });
          }
        });
      }
    });
    
    const sorted = Array.from(productMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    return sorted;
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ORDERS, [
        Query.orderDesc('$createdAt'),
      ]);
      
      const orders = response.documents;
      setAllOrders(orders);
      
      const newStats = calculateRevenueStats(orders);
      setStats(newStats);
      
      const newHistory = generateRevenueHistory(orders, timeRange);
      setRevenueHistory(newHistory);
      
      const newTopProducts = calculateTopProducts(orders);
      setTopProducts(newTopProducts);
      
    } catch (error: any) {
      console.error('Error loading orders for revenue:', error);
      Alert.alert('Error', 'Failed to load revenue data: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  }, [calculateRevenueStats, generateRevenueHistory, calculateTopProducts, timeRange]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (allOrders.length > 0) {
      const newHistory = generateRevenueHistory(allOrders, timeRange);
      setRevenueHistory(newHistory);
    }
  }, [timeRange, allOrders, generateRevenueHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString()}`;
  };

  const getMaxRevenue = () => {
    return Math.max(...revenueHistory.map(h => h.revenue), 1);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={styles.loadingText}>Loading revenue data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} colors={[C.cyan]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <LinearGradient colors={['#0A1647', '#0D1F6E', '#1034A6']} style={styles.hero}>
        <Bubble size={180} top={-60} right={-50} opacity={0.08} />
        <Bubble size={120} bottom={-40} left={-30} opacity={0.1} color={C.purple} />
        <Bubble size={70} top={30} right={80} opacity={0.12} color={C.cyan} />
        <Bubble size={40} bottom={40} right={140} opacity={0.15} color={C.indigo} />
        <Bubble size={25} top={60} left={50} opacity={0.18} color={C.cyan} />
        <Bubble size={15} top={20} right={40} opacity={0.22} color={C.white} />
        
        <Text style={styles.heroTitle}>💰 Revenue Analytics</Text>
        <Text style={styles.heroSubtitle}>Track your earnings and growth</Text>
        
        <View style={styles.mainRevenueCard}>
          <Text style={styles.mainRevenueLabel}>Total Revenue</Text>
          <Text style={styles.mainRevenueValue}>{formatCurrency(stats.totalRevenue)}</Text>
          <View style={styles.growthBadge}>
            <Feather name={stats.growth >= 0 ? "trending-up" : "trending-down"} size={14} color={stats.growth >= 0 ? C.accentGreen : C.accentRed} />
            <Text style={[styles.growthText, { color: stats.growth >= 0 ? C.accentGreen : C.accentRed }]}>
              {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}% from last month
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((range) => (
          <TouchableOpacity
            key={range}
            style={[styles.timeButton, timeRange === range && styles.timeButtonActive]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[styles.timeText, timeRange === range && styles.timeTextActive]}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <LinearGradient colors={[C.surfaceAlt, C.surface]} style={styles.statCardGradient}>
            <View style={[styles.statIcon, { backgroundColor: C.blue3 + '20' }]}>
              <Feather name="shopping-bag" size={22} color={C.blue3} />
            </View>
            <Text style={styles.statCardValue}>{stats.totalOrders}</Text>
            <Text style={styles.statCardLabel}>Total Orders</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.statCard}>
          <LinearGradient colors={[C.surfaceAlt, C.surface]} style={styles.statCardGradient}>
            <View style={[styles.statIcon, { backgroundColor: C.accentGreen + '20' }]}>
              <Feather name="dollar-sign" size={22} color={C.accentGreen} />
            </View>
            <Text style={styles.statCardValue}>{formatCurrency(stats.averageOrderValue)}</Text>
            <Text style={styles.statCardLabel}>Avg Order Value</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.statCard}>
          <LinearGradient colors={[C.surfaceAlt, C.surface]} style={styles.statCardGradient}>
            <View style={[styles.statIcon, { backgroundColor: C.accentOrange + '20' }]}>
              <Feather name="trending-up" size={22} color={C.accentOrange} />
            </View>
            <Text style={styles.statCardValue}>{formatCurrency(stats.projectedRevenue)}</Text>
            <Text style={styles.statCardLabel}>Projected Revenue</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Revenue Chart - Simple Bar Chart */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📊 Revenue Overview</Text>
        <View style={styles.chartContainer}>
          {revenueHistory.map((item, index) => {
            const barHeight = (item.revenue / getMaxRevenue()) * 120;
            return (
              <View key={index} style={styles.chartBarWrapper}>
                <View style={styles.chartBar}>
                  <View style={[styles.chartBarFill, { height: Math.max(barHeight, 4) }]}>
                    <LinearGradient
                      colors={[C.cyan, C.blue3]}
                      style={styles.chartBarGradient}
                      start={{ x: 0, y: 1 }}
                      end={{ x: 0, y: 0 }}
                    />
                  </View>
                </View>
                <Text style={styles.chartLabel}>{item.label}</Text>
                <Text style={styles.chartValue}>{formatCurrency(item.revenue)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Payment Breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>💳 Payment Breakdown</Text>
        <View style={styles.paymentBreakdown}>
          <View style={styles.paymentItem}>
            <View style={[styles.paymentDot, { backgroundColor: C.accentGreen }]} />
            <Text style={styles.paymentLabel}>Completed (Delivered)</Text>
            <Text style={styles.paymentValue}>{formatCurrency(stats.completedPayments)}</Text>
            <Text style={styles.paymentPercent}>
              {stats.totalRevenue > 0 ? ((stats.completedPayments / (stats.completedPayments + stats.pendingPayments)) * 100).toFixed(0) : 0}%
            </Text>
          </View>
          <View style={styles.paymentItem}>
            <View style={[styles.paymentDot, { backgroundColor: C.accentOrange }]} />
            <Text style={styles.paymentLabel}>Pending (In Progress)</Text>
            <Text style={styles.paymentValue}>{formatCurrency(stats.pendingPayments)}</Text>
            <Text style={styles.paymentPercent}>
              {stats.totalRevenue + stats.pendingPayments > 0 ? ((stats.pendingPayments / (stats.completedPayments + stats.pendingPayments)) * 100).toFixed(0) : 0}%
            </Text>
          </View>
          <View style={styles.paymentItem}>
            <View style={[styles.paymentDot, { backgroundColor: C.accentRed }]} />
            <Text style={styles.paymentLabel}>Refunds (Returned)</Text>
            <Text style={styles.paymentValue}>{formatCurrency(stats.refunds)}</Text>
            <Text style={styles.paymentPercent}>
              {stats.totalRevenue + stats.refunds > 0 ? ((stats.refunds / (stats.totalRevenue + stats.refunds)) * 100).toFixed(0) : 0}%
            </Text>
          </View>
          <View style={styles.paymentItem}>
            <View style={[styles.paymentDot, { backgroundColor: C.textMuted }]} />
            <Text style={styles.paymentLabel}>Cancelled Orders</Text>
            <Text style={styles.paymentValue}>{formatCurrency(stats.cancelledRevenue)}</Text>
            <Text style={styles.paymentPercent}>Lost Revenue</Text>
          </View>
        </View>
      </View>

      {/* Revenue by Period */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📈 Revenue by Period</Text>
        {revenueHistory.slice(-6).map((item, index) => (
          <View key={index} style={styles.historyItem}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyMonth}>{item.label}</Text>
              <Text style={styles.historyOrders}>{item.orders} orders</Text>
            </View>
            <View style={styles.historyBar}>
              <View style={[styles.historyFill, { width: `${(item.revenue / getMaxRevenue()) * 100}%` }]} />
            </View>
            <Text style={styles.historyRevenue}>{formatCurrency(item.revenue)}</Text>
          </View>
        ))}
      </View>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🏆 Top Performing Products</Text>
          {topProducts.map((product, index) => (
            <View key={product.productId} style={styles.topProductItem}>
              <View style={styles.productRank}>
                <LinearGradient colors={[C.cyan, C.blue3]} style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </LinearGradient>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.productUnits}>{product.units} units sold</Text>
              </View>
              <Text style={styles.productRevenue}>{formatCurrency(product.revenue)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Export Options */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📊 Export Reports</Text>
        <View style={styles.exportButtons}>
          <TouchableOpacity style={styles.exportButton}>
            <LinearGradient colors={[C.blue2, C.blue3]} style={styles.exportGradient}>
              <Feather name="download" size={18} color={C.white} />
              <Text style={styles.exportText}>Download CSV</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton}>
            <LinearGradient colors={[C.purple, C.indigo]} style={styles.exportGradient}>
              <Feather name="printer" size={18} color={C.white} />
              <Text style={styles.exportText}>Print Report</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: C.cyan, fontWeight: '600' },
  footer: { height: 40 },
  hero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30, overflow: 'hidden' },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: C.white, marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: C.blue4, marginBottom: 24 },
  mainRevenueCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(0,229,255,0.3)' },
  mainRevenueLabel: { fontSize: 14, color: C.blue4, marginBottom: 8 },
  mainRevenueValue: { fontSize: 36, fontWeight: 'bold', color: C.white, marginBottom: 12 },
  growthBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  growthText: { fontSize: 12 },
  
  timeRangeContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  timeButton: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  timeButtonActive: { backgroundColor: C.blue1, borderColor: C.cyan },
  timeText: { fontSize: 13, color: C.textSecondary },
  timeTextActive: { color: C.white, fontWeight: '600' },
  
  statsGrid: { flexDirection: 'row', paddingHorizontal: 12, gap: 10, marginBottom: 16 },
  statCard: { flex: 1 },
  statCardGradient: { borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statCardValue: { fontSize: 18, fontWeight: 'bold', color: C.white, marginBottom: 4 },
  statCardLabel: { fontSize: 11, color: C.textMuted },
  
  sectionCard: { backgroundColor: C.surface, margin: 12, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: C.textPrimary, marginBottom: 16 },
  
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingVertical: 20 },
  chartBarWrapper: { alignItems: 'center', flex: 1 },
  chartBar: { width: 30, height: 120, backgroundColor: C.border, borderRadius: 15, overflow: 'hidden', marginBottom: 8 },
  chartBarFill: { width: '100%', borderRadius: 15, overflow: 'hidden' },
  chartBarGradient: { flex: 1, width: '100%' },
  chartLabel: { fontSize: 10, color: C.textMuted, marginBottom: 4 },
  chartValue: { fontSize: 9, color: C.textSecondary },
  
  paymentBreakdown: { gap: 12 },
  paymentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  paymentDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  paymentLabel: { flex: 1, fontSize: 13, color: C.textSecondary },
  paymentValue: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginRight: 10 },
  paymentPercent: { fontSize: 11, color: C.textMuted, minWidth: 45, textAlign: 'right' },
  
  historyItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  historyLeft: { width: 60 },
  historyMonth: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  historyOrders: { fontSize: 10, color: C.textMuted },
  historyBar: { flex: 1, height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden', marginHorizontal: 12 },
  historyFill: { height: '100%', backgroundColor: C.cyan, borderRadius: 4 },
  historyRevenue: { fontSize: 13, fontWeight: '600', color: C.accentGreen, minWidth: 70, textAlign: 'right' },
  
  topProductItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 10, backgroundColor: C.surfaceAlt, borderRadius: 12 },
  productRank: { marginRight: 12 },
  rankBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 14, fontWeight: 'bold', color: C.bg },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 3 },
  productUnits: { fontSize: 10, color: C.textMuted },
  productRevenue: { fontSize: 13, fontWeight: 'bold', color: C.accentGreen },
  
  exportButtons: { flexDirection: 'row', gap: 12 },
  exportButton: { flex: 1 },
  exportGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  exportText: { fontSize: 14, fontWeight: '600', color: C.white },
});