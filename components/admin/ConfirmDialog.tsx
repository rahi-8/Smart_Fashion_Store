// components/admin/ConfirmDialog.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
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

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor,
  icon = 'alert-triangle',
  onConfirm,
  onCancel,
  loading = false,
  type = 'danger',
}) => {
  // Get color based on type
  const getColorByType = () => {
    if (confirmColor) return confirmColor;
    switch (type) {
      case 'danger': return C.accentRed;
      case 'warning': return C.accentOrange;
      case 'success': return C.accentGreen;
      case 'info': return C.cyan;
      default: return C.accentRed;
    }
  };

  // Get icon based on type
  const getIconByType = () => {
    if (icon) return icon;
    switch (type) {
      case 'danger': return 'alert-triangle';
      case 'warning': return 'alert-circle';
      case 'success': return 'check-circle';
      case 'info': return 'info';
      default: return 'alert-triangle';
    }
  };

  const dialogColor = getColorByType();
  const dialogIcon = getIconByType();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Bubbles Decoration */}
          <Bubble size={100} top={-30} right={-25} opacity={0.06} />
          <Bubble size={60} bottom={-20} left={-15} opacity={0.08} color={C.purple} />
          <Bubble size={35} top={40} right={20} opacity={0.1} color={C.cyan} />
          <Bubble size={20} bottom={50} left={30} opacity={0.12} color={C.indigo} />
          <GlowRing size={110} top={-35} right={-30} opacity={0.08} />
          <GlowRing size={65} bottom={-25} left={-20} color={C.purple} />

          {/* Header Gradient */}
          <LinearGradient
            colors={[C.surface, C.surfaceAlt]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            {/* Icon Container */}
            <View style={[styles.iconContainer, { backgroundColor: dialogColor + '15' }]}>
              <LinearGradient
                colors={[dialogColor, dialogColor + 'CC']}
                style={styles.iconGradient}
              >
                <Feather name={dialogIcon as any} size={32} color={C.white} />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>
            
            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Action Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                disabled={loading}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[C.surfaceAlt, C.surfaceAlt]}
                  style={styles.cancelGradient}
                >
                  <Feather name="x" size={18} color={C.textSecondary} />
                  <Text style={styles.cancelButtonText}>{cancelText}</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={onConfirm}
                disabled={loading}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[dialogColor, dialogColor + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={C.white} size="small" />
                  ) : (
                    <>
                      <Feather name="check" size={18} color={C.white} />
                      <Text style={styles.confirmButtonText}>{confirmText}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 11, 31, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  dialog: {
    width: width - 48,
    maxWidth: 400,
    backgroundColor: 'transparent',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerGradient: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textSecondary,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.white,
  },
});
