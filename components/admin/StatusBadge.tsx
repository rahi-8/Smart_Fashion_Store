// components/admin/StatusBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Dark Blue Theme Colors
const C = {
  cyan: '#00E5FF',
  accentGreen: '#00E676',
  accentOrange: '#FFB300',
  accentRed: '#FF5252',
  purple: '#7C4DFF',
  blue3: '#42A5F5',
  textMuted: '#4A5580',
  white: '#FFFFFF',
};

interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'payment' | 'user' | 'stock' | 'status';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  type = 'order',
  size = 'medium',
  showIcon = false,
}) => {
  const getStatusConfig = () => {
    const statusLower = status.toLowerCase();
    
    const configs: Record<string, { color: string; bg: string; text: string }> = {
      // ========== ORDER STATUSES ==========
      pending: { color: C.accentOrange, bg: C.accentOrange + '20', text: 'Pending' },
      confirmed: { color: C.blue3, bg: C.blue3 + '20', text: 'Confirmed' },
      processing: { color: C.purple, bg: C.purple + '20', text: 'Processing' },
      shipped: { color: C.purple, bg: C.purple + '20', text: 'Shipped' },
      out_for_delivery: { color: C.accentOrange, bg: C.accentOrange + '20', text: 'Out for Delivery' },
      delivered: { color: C.accentGreen, bg: C.accentGreen + '20', text: 'Delivered' },
      cancelled: { color: C.accentRed, bg: C.accentRed + '20', text: 'Cancelled' },
      returned: { color: C.accentRed, bg: C.accentRed + '20', text: 'Returned' },
      
      // ========== PAYMENT STATUSES ==========
      paid: { color: C.accentGreen, bg: C.accentGreen + '20', text: 'Paid' },
      payment_pending: { color: C.accentOrange, bg: C.accentOrange + '20', text: 'Pending' },
      unpaid: { color: C.accentOrange, bg: C.accentOrange + '20', text: 'Unpaid' },
      refunded: { color: C.purple, bg: C.purple + '20', text: 'Refunded' },
      failed: { color: C.accentRed, bg: C.accentRed + '20', text: 'Failed' },
      
      // ========== USER STATUSES ==========
      active: { color: C.accentGreen, bg: C.accentGreen + '20', text: 'Active' },
      inactive: { color: C.textMuted, bg: C.textMuted + '20', text: 'Inactive' },
      banned: { color: C.accentRed, bg: C.accentRed + '20', text: 'Banned' },
      
      // ========== STOCK STATUSES ==========
      in_stock: { color: C.accentGreen, bg: C.accentGreen + '20', text: 'In Stock' },
      low_stock: { color: C.accentOrange, bg: C.accentOrange + '20', text: 'Low Stock' },
      out_of_stock: { color: C.accentRed, bg: C.accentRed + '20', text: 'Out of Stock' },
      
      // ========== PRODUCT STATUS (for status type) ==========
      status_active: { color: C.accentGreen, bg: C.accentGreen + '20', text: 'Active' },
      status_inactive: { color: C.textMuted, bg: C.textMuted + '20', text: 'Inactive' },
      
      // ========== ROLE STATUSES ==========
      admin: { color: C.purple, bg: C.purple + '20', text: 'Admin' },
      user: { color: C.blue3, bg: C.blue3 + '20', text: 'User' },
    };

    // Handle product status specially (type = 'status')
    if (type === 'status') {
      if (statusLower === 'active') {
        return configs.status_active;
      } else {
        return configs.status_inactive;
      }
    }

    // Handle payment status specially
    if (type === 'payment') {
      if (statusLower === 'pending') {
        return configs.payment_pending;
      }
      if (configs[statusLower]) {
        return configs[statusLower];
      }
    }

    // Handle stock status
    if (type === 'stock') {
      // Check if status is a number (stock count)
      const stockNum = parseInt(statusLower);
      if (!isNaN(stockNum)) {
        if (stockNum > 10) return configs.in_stock;
        if (stockNum > 0) return configs.low_stock;
        return configs.out_of_stock;
      }
      
      // Check by string
      if (statusLower === 'in' || statusLower === 'in stock') {
        return configs.in_stock;
      }
      if (statusLower === 'low' || statusLower === 'low stock') {
        return configs.low_stock;
      }
      if (statusLower === 'out' || statusLower === 'out of stock') {
        return configs.out_of_stock;
      }
    }

    // Default lookup for order status
    if (configs[statusLower]) {
      return configs[statusLower];
    }

    // Fallback for unknown status
    return { color: C.textMuted, bg: C.textMuted + '20', text: status };
  };

  const config = getStatusConfig();
  
  const getSizeStyles = () => {
    switch (size) {
      case 'small': 
        return { paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, gap: 4 };
      case 'large': 
        return { paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, gap: 8 };
      default: 
        return { paddingHorizontal: 12, paddingVertical: 5, fontSize: 12, gap: 6 };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <LinearGradient
      colors={[config.bg, config.bg]}
      style={[
        styles.badge,
        {
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          borderColor: config.color + '40',
        }
      ]}
    >
      {showIcon && (
        <View style={[styles.iconDot, { backgroundColor: config.color }]} />
      )}
      <Text style={[
        styles.text, 
        { 
          color: config.color, 
          fontSize: sizeStyles.fontSize,
        }
      ]}>
        {config.text}
      </Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});
