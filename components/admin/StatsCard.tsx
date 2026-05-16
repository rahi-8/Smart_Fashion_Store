// components/admin/StatsCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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
const Bubble = ({ size, top, bottom, left, right, opacity = 0.15, color = C.white }: any) => (
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
const GlowRing = ({ size, top, bottom, left, right, opacity = 0.12, color = C.cyan }: any) => (
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

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  gradientColors: [string, string];
  onPress?: () => void;
  trend?: {
    value: number;
    isUp: boolean;
  };
  loading?: boolean;
  subtitle?: string;
  iconColor?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  gradientColors,
  onPress,
  trend,
  loading,
  subtitle,
  iconColor = C.white,
}) => {
  const CardContainer = onPress ? TouchableOpacity : View;

  if (loading) {
    return (
      <View style={styles.card}>
        <LinearGradient 
          colors={[C.surfaceAlt, C.surfaceAlt]} 
          style={styles.gradient}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="small" color={C.cyan} />
            <View style={styles.loadingText} />
            <View style={styles.loadingValue} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Get trend color based on increase/decrease
  const trendColor = trend 
    ? (trend.isUp ? C.accentGreen : C.accentRed)
    : C.textMuted;

  // Format value for better display
  const formattedValue = typeof value === 'number' 
    ? value.toLocaleString() 
    : value;

  return (
    <CardContainer 
      style={styles.card} 
      onPress={onPress} 
      activeOpacity={0.85}
    >
      <LinearGradient 
        colors={gradientColors} 
        style={styles.gradient} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }}
      >
        {/* Bubbles Decoration */}
        <Bubble size={80} top={-20} right={-15} opacity={0.08} />
        <Bubble size={50} bottom={-10} left={-10} opacity={0.06} />
        <Bubble size={30} top={40} right={30} opacity={0.1} />
        <GlowRing size={90} top={-25} right={-20} opacity={0.08} />
        <GlowRing size={55} bottom={-15} left={-15} opacity={0.06} />

        {/* Icon Container */}
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Feather name={icon as any} size={26} color={iconColor} />
        </View>
        
        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.value}>{formattedValue}</Text>
          
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
          
          {trend && (
            <View style={[styles.trendContainer, { backgroundColor: trendColor + '20' }]}>
              <Feather 
                name={trend.isUp ? 'trending-up' : 'trending-down'} 
                size={12} 
                color={trendColor} 
              />
              <Text style={[styles.trendText, { color: trendColor }]}>
                {trend.value}% {trend.isUp ? 'increase' : 'decrease'}
              </Text>
            </View>
          )}
        </View>
        
        {/* Background Icon */}
        <View style={styles.iconBackground}>
          <Feather name={icon as any} size={70} color="rgba(255,255,255,0.06)" />
        </View>

        {/* Click Indicator */}
        {onPress && (
          <View style={styles.clickIndicator}>
            <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.4)" />
          </View>
        )}
      </LinearGradient>
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width - 32,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    zIndex: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 34,
    fontWeight: '800',
    color: C.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconBackground: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    opacity: 0.4,
  },
  clickIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Loading State
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    width: 100,
    height: 12,
    backgroundColor: C.surfaceAlt,
    borderRadius: 6,
  },
  loadingValue: {
    width: 80,
    height: 24,
    backgroundColor: C.surfaceAlt,
    borderRadius: 12,
  },
});
