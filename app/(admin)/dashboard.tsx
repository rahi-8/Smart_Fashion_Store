//dashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getDashboardStats, DashboardStats } from '../../appwrite/admin';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  SlideInRight,
} from 'react-native-reanimated';

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

type BubbleProps = {
  size: number;
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  opacity?: number;
  color?: string;
};

const Bubble = ({ size, top, bottom, left, right, opacity = 0.12, color = C.blue3 }: BubbleProps) => (
  <View
    style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      opacity,
      top: top as any,
      bottom: bottom as any,
      left: left as any,
      right: right as any,
    }}
  />
);

const GlowRing = ({ size, top, bottom, left, right, color = C.cyan }: BubbleProps) => (
  <View
    style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 1.5,
      borderColor: color,
      opacity: 0.18,
      top: top as any,
      bottom: bottom as any,
      left: left as any,
      right: right as any,
    }}
  />
);

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error loading stats:', error);
      setStats({
        totalUsers: 1250,
        totalProducts: 342,
        totalOrders: 856,
        pendingOrders: 124,
        totalRevenue: 125000,
        lowStockProducts: 8,
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX 1: onRefresh কে return এর আগে define করো
  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const navigateTo = (route: string, params?: string) => {
    try {
      if (params) {
        const statusValue = params.split('=')[1];
        router.push({
          pathname: `/(admin)/${route}` as any,
          params: { status: statusValue },
        });
      } else {
        router.push(`/(admin)/${route}` as any);
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <LinearGradient colors={[C.bg, C.blue1]} style={s.loadingGradient}>
          <ActivityIndicator size="large" color={C.cyan} />
          <Text style={s.loadingText}>Loading Dashboard...</Text>
        </LinearGradient>
      </View>
    );
  }

  const completedOrders = (stats?.totalOrders || 0) - (stats?.pendingOrders || 0);
  const completionRate = stats?.totalOrders
    ? Math.round((completedOrders / stats.totalOrders) * 100)
    : 0;
  const averageOrderValue = stats?.totalOrders
    ? Math.round((stats.totalRevenue || 0) / stats.totalOrders)
    : 0;
  const userEngagement = stats?.totalUsers
    ? Math.round((stats.totalOrders / stats.totalUsers) * 100)
    : 0;
  const revenueGrowth = 15;

  return (
    <ScrollView
      style={s.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={C.cyan}
          colors={[C.cyan]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/*  Hero Section */}
      <Animated.View entering={FadeInDown.duration(600).springify()} style={s.heroSection}>
        <LinearGradient
          colors={['#0A1647', '#0D1F6E', '#1034A6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroGradient}
        >
          <Bubble size={180} top={-60} right={-60} opacity={0.1} color={C.blue3} />
          <Bubble size={120} bottom={-40} left={-40} opacity={0.12} color={C.purple} />
          <Bubble size={80} top={20} right={80} opacity={0.14} color={C.cyan} />
          <Bubble size={50} bottom={30} right={130} opacity={0.18} color={C.indigo} />
          <Bubble size={35} top={60} left={120} opacity={0.2} color={C.cyan} />
          <GlowRing size={200} top={-70} right={-70} color={C.cyan} />
          <GlowRing size={130} bottom={-50} left={-50} color={C.purple} />
          <GlowRing size={90} top={15} right={70} color={C.blue4} />

          <View style={s.heroContent}>
            <View>
              <Text style={s.greeting}>{greeting}!</Text>
              <Text style={s.welcomeText}>Admin Dashboard</Text>
              <View style={s.updateBadge}>
                <Feather name="clock" size={12} color={C.cyan} />
                <Text style={s.updateText}>
                  Updated {lastUpdated.toLocaleTimeString()}
                </Text>
              </View>
            </View>
            <View style={s.adminBadge}>
              <LinearGradient colors={[C.cyan, C.blue3]} style={s.adminBadgeGradient}>
                <FontAwesome5 name="crown" size={20} color={C.bg} />
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Stats Grid */}
      <View style={s.statsGrid}>
        {[
          {
            delay: 100,
            colors: [C.blue1, C.blue2],
            icon: 'users',
            val: stats?.totalUsers || 0,
            label: 'Total Users',
            trend: '+12%',
            route: 'users',
          },
          {
            delay: 200,
            colors: ['#006064', '#00838F'],
            icon: 'shopping-bag',
            val: stats?.totalProducts || 0,
            label: 'Products',
            trend: '+5%',
            route: 'products',
          },
          {
            delay: 300,
            colors: ['#1565C0', '#1E88E5'],
            icon: 'package',
            val: stats?.totalOrders || 0,
            label: 'Total Orders',
            trend: '+8%',
            route: 'orders',
          },
          {
            delay: 400,
            colors: ['#283593', '#3949AB'],
            icon: 'dollar-sign',
            val: `৳${stats?.totalRevenue?.toLocaleString() || 0}`,
            label: 'Revenue',
            trend: '+18%',
            route: 'revenue',
          },
        ].map((item, i) => (
          <Animated.View
            key={i}
            entering={FadeInUp.delay(item.delay).springify()}
            style={s.statCard}
          >
            <TouchableOpacity onPress={() => navigateTo(item.route)} activeOpacity={0.8}>
              <LinearGradient colors={item.colors as [string, string]} style={s.statGradient}>
                <Bubble size={60} top={-20} right={-20} opacity={0.15} color={C.cyan} />
                <Bubble size={30} bottom={-10} left={-10} opacity={0.12} color={C.white} />
                <GlowRing size={55} top={-18} right={-18} color={C.cyan} />
                <View style={s.statIconContainer}>
                  <Feather name={item.icon as any} size={22} color={C.cyan} />
                </View>
                <Text style={s.statValue}>{item.val}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
                <View style={s.statTrend}>
                  <Feather name="trending-up" size={11} color={C.accentGreen} />
                  <Text style={[s.statTrendText, { color: C.accentGreen }]}>{item.trend}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/*  Quick Stats Row*/}
      <Animated.View entering={SlideInRight.delay(500).springify()} style={s.quickStatsRow}>
        {[
          { icon: 'check-circle', val: `${completionRate}%`, label: 'Completion', bg: '#0D2137', tint: C.cyan },
          { icon: 'trending-up', val: `৳${averageOrderValue.toLocaleString()}`, label: 'Avg Order', bg: '#0D1C37', tint: C.blue3 },
          { icon: 'users', val: `${userEngagement}%`, label: 'Engagement', bg: '#0D1C2E', tint: C.indigo },
          { icon: 'activity', val: `+${revenueGrowth}%`, label: 'Growth', bg: '#1A1530', tint: C.purple },
        ].map((q, i) => (
          <View key={i} style={s.quickStatItem}>
            <View style={[s.quickStatIcon, { backgroundColor: q.bg }]}>
              <Feather name={q.icon as any} size={18} color={q.tint} />
            </View>
            <Text style={[s.quickStatValue, { color: q.tint }]}>{q.val}</Text>
            <Text style={s.quickStatLabel}>{q.label}</Text>
          </View>
        ))}
      </Animated.View>

      {/*Order Status*/}
      <Animated.View entering={FadeInUp.delay(600).springify()} style={s.sectionCard}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>📊 Order Status</Text>
          <TouchableOpacity onPress={() => navigateTo('orders')}>
            <Text style={s.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={s.statusContainer}>
          <TouchableOpacity
            style={s.statusCard}
            onPress={() => navigateTo('orders', 'status=pending')}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#E65100', '#F57C00']} style={s.statusCircle}>
              <Feather name="clock" size={22} color={C.white} />
            </LinearGradient>
            <Text style={s.statusCount}>{stats?.pendingOrders || 0}</Text>
            <Text style={s.statusLabel}>Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.statusCard}
            onPress={() => navigateTo('orders', 'status=completed')}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#1B5E20', '#2E7D32']} style={s.statusCircle}>
              <Feather name="check" size={22} color={C.white} />
            </LinearGradient>
            <Text style={s.statusCount}>{completedOrders}</Text>
            <Text style={s.statusLabel}>Completed</Text>
          </TouchableOpacity>
        </View>

        <View style={s.progressSection}>
          <View style={s.progressLabelRow}>
            <Text style={s.progressLabel}>Order Completion Rate</Text>
            <Text style={[s.progressPercentage, { color: C.accentGreen }]}>{completionRate}%</Text>
          </View>
          <View style={s.progressBarContainer}>
            <LinearGradient
              colors={[C.blue3, C.cyan]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.progressBar, { width: `${Math.min(100, completionRate)}%` as any }]}
            />
          </View>
        </View>
      </Animated.View>

      {/*  Low Stock Alert  */}
      {stats?.lowStockProducts && stats.lowStockProducts > 0 && (
        <Animated.View entering={ZoomIn.delay(700).springify()} style={s.alertCard}>
          <LinearGradient colors={['#7B0000', '#C62828']} style={s.alertGradient}>
            <Bubble size={80} top={-30} right={-20} opacity={0.15} color={C.white} />
            <Bubble size={40} bottom={-15} left={30} opacity={0.12} color={C.white} />
            <GlowRing size={75} top={-28} right={-18} color={C.white} />
            <View style={s.alertContent}>
              <View style={s.alertIconContainer}>
                <Feather name="alert-triangle" size={28} color={C.white} />
              </View>
              <View style={s.alertTextContainer}>
                <Text style={s.alertTitle}>Low Stock Alert!</Text>
                <Text style={s.alertMessage}>
                  {stats.lowStockProducts} product
                  {stats.lowStockProducts > 1 ? 's are' : ' is'} running low
                </Text>
              </View>
              <TouchableOpacity
                style={s.alertButton}
                onPress={() => navigateTo('products')}
                activeOpacity={0.7}
              >
                <Text style={s.alertButtonText}>View</Text>
                <Feather name="arrow-right" size={13} color={C.accentRed} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Quick Actions*/}
      <Animated.View entering={FadeInUp.delay(800).springify()} style={s.sectionCard}>
        <Text style={s.sectionTitle}>⚡ Quick Actions</Text>
        <View style={s.actionGrid}>
          {[
            { route: 'products', color: C.cyan, icon: 'box', label: 'Products' },
            { route: 'users', color: C.blue3, icon: 'users', label: 'Users' },
            { route: 'orders', color: C.accentGreen, icon: 'package', label: 'Orders' },
            { route: 'coupons', color: C.accentOrange, icon: 'tag', label: 'Coupons' },
            { route: 'revenue', color: C.purple, icon: 'bar-chart-2', label: 'Revenue' },
            { route: 'settings', color: C.indigo, icon: 'settings', label: 'Settings' },
          ].map((a, i) => (
            <TouchableOpacity
              key={i}
              style={s.actionCard}
              onPress={() => navigateTo(a.route)}
              activeOpacity={0.7}
            >
              <View style={[s.actionCardInner, { borderColor: `${a.color}30` }]}>
                <View style={[s.actionIcon, { backgroundColor: `${a.color}20` }]}>
                  <Feather name={a.icon as any} size={22} color={a.color} />
                </View>
                <Text style={[s.actionTitle, { color: a.color }]}>{a.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/*  Recent Activity */}
      <Animated.View entering={FadeInUp.delay(900).springify()} style={s.sectionCard}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>🕒 Recent Activity</Text>
          <Feather name="more-horizontal" size={20} color={C.textMuted} />
        </View>
        <View style={s.activityList}>
          {[
            { dot: C.accentOrange, title: 'New order received', time: '2 minutes ago', route: 'orders' },
            { dot: C.accentGreen, title: 'Product added: Summer Collection', time: '1 hour ago', route: 'products' },
            { dot: C.blue3, title: 'New user registered', time: '3 hours ago', route: 'users' },
            { dot: C.purple, title: 'Coupon code applied', time: '5 hours ago', route: 'coupons' },
          ].map((act, i) => (
            <TouchableOpacity
              key={i}
              style={s.activityItem}
              onPress={() => navigateTo(act.route)}
              activeOpacity={0.7}
            >
              <View style={[s.activityDot, { backgroundColor: act.dot }]} />
              <View style={s.activityContent}>
                <Text style={s.activityTitle}>{act.title}</Text>
                <Text style={s.activityTime}>{act.time}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={C.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1 },
  loadingGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: C.cyan, fontWeight: '600' },
  heroSection: { marginBottom: 16 },
  heroGradient: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 52 : Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 44,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 28, fontWeight: 'bold', color: C.white, marginBottom: 4 },
  welcomeText: { fontSize: 16, color: C.blue4, marginBottom: 14 },
  updateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  updateText: { fontSize: 11, color: C.cyan },
  adminBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  adminBadgeGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginTop: -22 },
  statCard: { width: '50%', padding: 5 },
  statGradient: {
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    elevation: 5,
    shadowColor: C.blue3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,229,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', color: C.white, marginBottom: 4 },
  statLabel: { fontSize: 11, color: C.blue4, marginBottom: 8 },
  statTrend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statTrendText: { fontSize: 11 },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 14,
    marginBottom: 4,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.surface,
    marginHorizontal: 3,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 2,
  },
  quickStatIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickStatValue: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  quickStatLabel: { fontSize: 9, color: C.textMuted },
  sectionCard: {
    backgroundColor: C.surface,
    marginHorizontal: 10,
    marginTop: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: C.textPrimary },
  seeAllText: { fontSize: 12, color: C.cyan, fontWeight: '600' },
  statusContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statusCard: { alignItems: 'center', flex: 1 },
  statusCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  statusCount: { fontSize: 20, fontWeight: 'bold', color: C.textPrimary, marginBottom: 4 },
  statusLabel: { fontSize: 12, color: C.textSecondary },
  progressSection: { marginTop: 4 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, color: C.textSecondary },
  progressPercentage: { fontSize: 12, fontWeight: 'bold' },
  progressBarContainer: { height: 8, backgroundColor: C.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  alertCard: {
    marginHorizontal: 10,
    marginTop: 14,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: C.accentRed,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  alertGradient: { padding: 16 },
  alertContent: { flexDirection: 'row', alignItems: 'center' },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertTextContainer: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: 'bold', color: C.white, marginBottom: 4 },
  alertMessage: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  alertButtonText: { fontSize: 12, fontWeight: '600', color: C.accentRed },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  actionCard: { width: '33.33%', padding: 5 },
  actionCardInner: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  activityList: { marginTop: 4 },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 13, color: C.textPrimary, marginBottom: 3 },
  activityTime: { fontSize: 11, color: C.textMuted },
});
