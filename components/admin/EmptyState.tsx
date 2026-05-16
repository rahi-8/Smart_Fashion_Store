// components/admin/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: string;
  buttonText?: string;
  onButtonPress?: () => void;
  type?: 'default' | 'search' | 'cart' | 'orders' | 'products' | 'users';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon = 'inbox',
  buttonText,
  onButtonPress,
  type = 'default',
}) => {
  // Get icon based on type
  const getIconByType = () => {
    if (icon !== 'inbox') return icon;
    switch (type) {
      case 'search': return 'search';
      case 'cart': return 'shopping-cart';
      case 'orders': return 'package';
      case 'products': return 'box';
      case 'users': return 'users';
      default: return 'inbox';
    }
  };

  // Get gradient colors based on type - type assertion added
  const getGradientColors = (): [string, string] => {
    switch (type) {
      case 'search': return [C.blue1, C.blue2];
      case 'cart': return [C.accentOrange, C.blue1];
      case 'orders': return [C.purple, C.indigo];
      case 'products': return [C.cyan, C.blue3];
      case 'users': return [C.accentGreen, C.blue2];
      default: return [C.blue2, C.cyan];
    }
  };

  // Get icon color based on type
  const getIconColor = (): string => {
    switch (type) {
      case 'search': return C.blue3;
      case 'cart': return C.accentOrange;
      case 'orders': return C.purple;
      case 'products': return C.cyan;
      case 'users': return C.accentGreen;
      default: return C.cyan;
    }
  };

  const finalIcon = getIconByType();
  const gradientColors: [string, string] = getGradientColors(); // ✅ Explicit type
  const iconColor: string = getIconColor();

  return (
    <LinearGradient
      colors={[C.surface, C.surfaceAlt]}
      style={styles.container}
    >
      {/* Bubbles Decoration */}
      <Bubble size={120} top={-30} right={-25} opacity={0.06} />
      <Bubble size={80} bottom={-20} left={-15} opacity={0.08} color={C.purple} />
      <Bubble size={45} top={60} right={40} opacity={0.1} color={C.cyan} />
      <Bubble size={25} bottom={80} left={50} opacity={0.12} color={C.indigo} />
      <Bubble size={15} top={120} left={30} opacity={0.15} color={C.cyan} />
      <GlowRing size={130} top={-35} right={-30} opacity={0.08} />
      <GlowRing size={85} bottom={-25} left={-20} color={C.purple} />
      <GlowRing size={50} top={55} right={35} color={C.blue4} />

      {/* Animated Icon Container */}
      <View style={styles.iconWrapper}>
        <LinearGradient
          colors={[iconColor + '20', iconColor + '10']}
          style={styles.iconOuterRing}
        >
          <LinearGradient
            colors={[iconColor + '40', iconColor + '20']}
            style={styles.iconInnerRing}
          >
            <View style={styles.iconContainer}>
              <Feather name={finalIcon as any} size={48} color={iconColor} />
            </View>
          </LinearGradient>
        </LinearGradient>
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>
      
      {/* Message */}
      {message && <Text style={styles.message}>{message}</Text>}
      
      {/* Button */}
      {buttonText && onButtonPress && (
        <TouchableOpacity 
          style={styles.button} 
          onPress={onButtonPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Feather name="plus" size={18} color={C.white} />
            <Text style={styles.buttonText}>{buttonText}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Decorative Bottom Line */}
      <View style={styles.bottomLine}>
        <LinearGradient
          colors={[C.cyan + '40', 'transparent']}
          style={styles.bottomLineGradient}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    margin: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  // Icon Section
  iconWrapper: {
    marginBottom: 24,
  },
  iconOuterRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInnerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  // Text Section
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
    maxWidth: width * 0.7,
  },

  // Button Section
  button: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
  },
  buttonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Decoration
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  bottomLineGradient: {
    flex: 1,
  },
});
