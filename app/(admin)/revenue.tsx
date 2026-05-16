import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

export default function RevenueScreen() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('weekly');
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');

  const stats = {
    totalRevenue: 1250000,
    totalOrders: 342,
    averageOrderValue: 3654,
    projectedRevenue: 1500000,
    growth: 23.5,
    pendingPayments: 125000,
    completedPayments: 1125000,
    refunds: 25000,
  };

  const revenueHistory = [
    { month: 'Jan', revenue: 85000, orders: 45 },
    { month: 'Feb', revenue: 92000, orders: 52 },
    { month: 'Mar', revenue: 108000, orders: 61 },
    { month: 'Apr', revenue: 125000, orders: 68 },
    { month: 'May', revenue: 142000, orders: 75 },
    { month: 'Jun', revenue: 168000, orders: 89 },
  ];

  const topProducts = [
    { name: 'Premium Cotton T-Shirt', revenue: 125000, units: 245 },
    { name: 'Slim Fit Jeans', revenue: 98000, units: 156 },
    { name: 'Winter Jacket', revenue: 156000, units: 89 },
    { name: 'Running Shoes', revenue: 89000, units: 67 },
    { name: 'Leather Belt', revenue: 45000, units: 234 },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />}
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
          <Text style={styles.mainRevenueValue}>৳{stats.totalRevenue.toLocaleString()}</Text>
          <View style={styles.growthBadge}>
            <Feather name="trending-up" size={14} color={C.accentGreen} />
            <Text style={styles.growthText}>+{stats.growth}% from last month</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {['daily', 'weekly', 'monthly', 'yearly'].map((range) => (
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
            <Text style={styles.statCardValue}>৳{stats.averageOrderValue.toLocaleString()}</Text>
            <Text style={styles.statCardLabel}>Avg Order Value</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.statCard}>
          <LinearGradient colors={[C.surfaceAlt, C.surface]} style={styles.statCardGradient}>
            <View style={[styles.statIcon, { backgroundColor: C.accentOrange + '20' }]}>
              <Feather name="trending-up" size={22} color={C.accentOrange} />
            </View>
            <Text style={styles.statCardValue}>৳{stats.projectedRevenue.toLocaleString()}</Text>
            <Text style={styles.statCardLabel}>Projected Revenue</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Payment Breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>💳 Payment Breakdown</Text>
        <View style={styles.paymentBreakdown}>
          <View style={styles.paymentItem}>
            <View style={[styles.paymentDot, { backgroundColor: C.accentGreen }]} />
            <Text style={styles.paymentLabel}>Completed</Text>
            <Text style={styles.paymentValue}>৳{stats.completedPayments.toLocaleString()}</Text>
            <Text style={styles.paymentPercent}>90%</Text>
          </View>
          <View style={styles.paymentItem}>
            <View style={[styles.paymentDot, { backgroundColor: C.accentOrange }]} />
            <Text style={styles.paymentLabel}>Pending</Text>
            <Text style={styles.paymentValue}>৳{stats.pendingPayments.toLocaleString()}</Text>
            <Text style={styles.paymentPercent}>10%</Text>
          </View>
          <View style={styles.paymentItem}>
            <View style={[styles.paymentDot, { backgroundColor: C.accentRed }]} />
            <Text style={styles.paymentLabel}>Refunds</Text>
            <Text style={styles.paymentValue}>৳{stats.refunds.toLocaleString()}</Text>
            <Text style={styles.paymentPercent}>2%</Text>
          </View>
        </View>
      </View>

      {/* Revenue History */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📈 Revenue History</Text>
        {revenueHistory.map((item, index) => (
          <View key={index} style={styles.historyItem}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyMonth}>{item.month}</Text>
              <Text style={styles.historyOrders}>{item.orders} orders</Text>
            </View>
            <View style={styles.historyBar}>
              <View style={[styles.historyFill, { width: `${(item.revenue / 168000) * 100}%` }]} />
            </View>
            <Text style={styles.historyRevenue}>৳{item.revenue.toLocaleString()}</Text>
          </View>
        ))}
      </View>

      {/* Top Products */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🏆 Top Performing Products</Text>
        {topProducts.map((product, index) => (
          <View key={index} style={styles.topProductItem}>
            <View style={styles.productRank}>
              <LinearGradient colors={[C.cyan, C.blue3]} style={styles.rankBadge}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </LinearGradient>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productUnits}>{product.units} units sold</Text>
            </View>
            <Text style={styles.productRevenue}>৳{product.revenue.toLocaleString()}</Text>
          </View>
        ))}
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30, overflow: 'hidden' },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: C.white, marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: C.blue4, marginBottom: 24 },
  mainRevenueCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(0,229,255,0.3)' },
  mainRevenueLabel: { fontSize: 14, color: C.blue4, marginBottom: 8 },
  mainRevenueValue: { fontSize: 36, fontWeight: 'bold', color: C.white, marginBottom: 12 },
  growthBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  growthText: { fontSize: 12, color: C.accentGreen },
  
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
  
  paymentBreakdown: { gap: 12 },
  paymentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  paymentDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  paymentLabel: { flex: 1, fontSize: 14, color: C.textSecondary },
  paymentValue: { fontSize: 14, fontWeight: '600', color: C.textPrimary, marginRight: 10 },
  paymentPercent: { fontSize: 12, color: C.textMuted },
  
  historyItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  historyLeft: { width: 60 },
  historyMonth: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  historyOrders: { fontSize: 10, color: C.textMuted },
  historyBar: { flex: 1, height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden', marginHorizontal: 12 },
  historyFill: { height: '100%', backgroundColor: C.cyan, borderRadius: 4 },
  historyRevenue: { fontSize: 14, fontWeight: '600', color: C.accentGreen },
  
  topProductItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 10, backgroundColor: C.surfaceAlt, borderRadius: 12 },
  productRank: { marginRight: 12 },
  rankBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 14, fontWeight: 'bold', color: C.bg },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: C.textPrimary, marginBottom: 4 },
  productUnits: { fontSize: 11, color: C.textMuted },
  productRevenue: { fontSize: 14, fontWeight: 'bold', color: C.accentGreen },
  
  exportButtons: { flexDirection: 'row', gap: 12 },
  exportButton: { flex: 1 },
  exportGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  exportText: { fontSize: 14, fontWeight: '600', color: C.white },
});
