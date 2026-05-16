// app/(admin)/settings.tsx - সম্পূর্ণ আপডেটেড ব্যাকএন্ড সংযুক্ত ভার্সন

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { databases, DATABASE_ID, COLLECTIONS, ID } from '../../appwrite/config';
import { Query } from 'appwrite';
import { useFocusEffect } from 'expo-router';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#060B1F', surface: '#0D1535', surfaceAlt: '#111C42', border: '#1E2D60',
  blue1: '#1565C0', blue2: '#1976D2', blue3: '#42A5F5', blue4: '#90CAF9',
  cyan: '#00E5FF', purple: '#7C4DFF', indigo: '#3D5AFE',
  accentGreen: '#00E676', accentOrange: '#FFB300', accentRed: '#FF5252',
  textPrimary: '#E8EAF6', textSecondary: '#9FA8DA', textMuted: '#4A5580',
  white: '#FFFFFF',
};

type BubbleProps = { size: number; top?: number; bottom?: number; left?: number; right?: number; opacity?: number; color?: string };
const Bubble = ({ size, top, bottom, left, right, opacity = 0.12, color = C.blue3 }: BubbleProps) => (
  <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity, top, bottom, left, right }} />
);
const GlowRing = ({ size, top, bottom, left, right, opacity = 0.18, color = C.cyan }: BubbleProps) => (
  <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: color, opacity, top, bottom, left, right }} />
);

interface AppSettings {
  $id?: string;
  appName: string;
  deliveryCharge: number;
  currency: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  minOrderForFreeDelivery?: number;
  taxPercentage?: number;
  shippingPolicy?: string;
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'Smart Fashion Store',
    deliveryCharge: 60,
    currency: '৳',
    contactPhone: '+8801XXXXXXXXX',
    contactEmail: 'support@fashion.com',
    address: 'Dhaka, Bangladesh',
    minOrderForFreeDelivery: 800,
    taxPercentage: 0,
    shippingPolicy: 'Standard delivery within 3-5 business days',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Load settings from Appwrite
  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.SETTINGS,
        [Query.limit(1)]
      );
      
      if (response.documents.length > 0) {
        const doc = response.documents[0];
        setSettingsId(doc.$id);
        setSettings({
          appName: doc.appName || 'Smart Fashion Store',
          deliveryCharge: doc.deliveryCharge || 60,
          currency: doc.currency || '৳',
          contactPhone: doc.contactPhone || '',
          contactEmail: doc.contactEmail || '',
          address: doc.address || '',
          minOrderForFreeDelivery: doc.minOrderForFreeDelivery || 800,
          taxPercentage: doc.taxPercentage || 0,
          shippingPolicy: doc.shippingPolicy || 'Standard delivery within 3-5 business days',
        });
      } else {
        // Create default settings if none exists
        const newSettings = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.SETTINGS,
          ID.unique(),
          {
            appName: 'Smart Fashion Store',
            deliveryCharge: 60,
            currency: '৳',
            contactPhone: '+8801XXXXXXXXX',
            contactEmail: 'support@fashion.com',
            address: 'Dhaka, Bangladesh',
            minOrderForFreeDelivery: 800,
            taxPercentage: 0,
            shippingPolicy: 'Standard delivery within 3-5 business days',
          }
        );
        setSettingsId(newSettings.$id);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadSettings(); }, []));

  const handleSave = async () => {
    if (!settingsId) {
      Alert.alert('Error', 'Settings not initialized');
      return;
    }

    setSaving(true);
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.SETTINGS,
        settingsId,
        {
          appName: settings.appName,
          deliveryCharge: settings.deliveryCharge,
          currency: settings.currency,
          contactPhone: settings.contactPhone,
          contactEmail: settings.contactEmail,
          address: settings.address,
          minOrderForFreeDelivery: settings.minOrderForFreeDelivery,
          taxPercentage: settings.taxPercentage,
          shippingPolicy: settings.shippingPolicy,
        }
      );
      Alert.alert('✅ Success', 'Settings saved successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Header with Bubbles */}
      <LinearGradient colors={['#0A1647', '#0D1F6E', '#1034A6']} style={styles.heroHeader}>
        <Bubble size={150} top={-55} right={-50} opacity={0.08} color={C.blue3} />
        <Bubble size={90} bottom={-35} left={-30} opacity={0.10} color={C.purple} />
        <Bubble size={55} top={15} right={100} opacity={0.12} color={C.cyan} />
        <Bubble size={30} bottom={12} right={170} opacity={0.15} color={C.indigo} />
        <Bubble size={18} top={22} left={90} opacity={0.18} color={C.cyan} />
        <GlowRing size={160} top={-58} right={-54} opacity={0.12} color={C.cyan} />
        <GlowRing size={95} bottom={-38} left={-33} opacity={0.10} color={C.purple} />
        <GlowRing size={60} top={12} right={95} opacity={0.15} color={C.blue4} />

        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroTitle}>⚙️ Settings</Text>
            <Text style={styles.heroSubtitle}>Configure your store preferences</Text>
          </View>
          <TouchableOpacity
            style={[styles.editButton, isEditing && styles.saveButton]}
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={saving}
          >
            <LinearGradient colors={[C.cyan, C.blue3]} style={styles.editButtonGradient}>
              {saving ? (
                <ActivityIndicator size="small" color={C.bg} />
              ) : (
                <>
                  <Feather name={isEditing ? 'check' : 'edit-2'} size={18} color={C.bg} />
                  <Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* General Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏪 General Settings</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>App Name</Text>
          <TextInput
            style={[styles.settingValue, !isEditing && styles.disabledInput]}
            value={settings.appName}
            onChangeText={(text) => setSettings({ ...settings, appName: text })}
            editable={isEditing}
            placeholderTextColor={C.textMuted}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Currency Symbol</Text>
          <TextInput
            style={[styles.settingValue, !isEditing && styles.disabledInput]}
            value={settings.currency}
            onChangeText={(text) => setSettings({ ...settings, currency: text })}
            editable={isEditing}
            placeholderTextColor={C.textMuted}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Delivery Charge (৳)</Text>
          <TextInput
            style={[styles.settingValue, !isEditing && styles.disabledInput]}
            value={String(settings.deliveryCharge)}
            onChangeText={(text) => setSettings({ ...settings, deliveryCharge: parseFloat(text) || 0 })}
            editable={isEditing}
            keyboardType="numeric"
            placeholderTextColor={C.textMuted}
          />
          <Text style={styles.settingHint}>Applied to orders below min order for free delivery</Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Minimum Order for Free Delivery (৳)</Text>
          <TextInput
            style={[styles.settingValue, !isEditing && styles.disabledInput]}
            value={String(settings.minOrderForFreeDelivery)}
            onChangeText={(text) => setSettings({ ...settings, minOrderForFreeDelivery: parseFloat(text) || 0 })}
            editable={isEditing}
            keyboardType="numeric"
            placeholderTextColor={C.textMuted}
          />
          <Text style={styles.settingHint}>Orders above this amount get free delivery</Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Tax Percentage (%)</Text>
          <TextInput
            style={[styles.settingValue, !isEditing && styles.disabledInput]}
            value={String(settings.taxPercentage)}
            onChangeText={(text) => setSettings({ ...settings, taxPercentage: parseFloat(text) || 0 })}
            editable={isEditing}
            keyboardType="numeric"
            placeholderTextColor={C.textMuted}
          />
          <Text style={styles.settingHint}>Applied to all orders</Text>
        </View>
      </View>

      {/* Shipping Policy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚚 Shipping Policy</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Shipping Policy Text</Text>
          <TextInput
            style={[styles.settingValue, styles.textArea, !isEditing && styles.disabledInput]}
            value={settings.shippingPolicy}
            onChangeText={(text) => setSettings({ ...settings, shippingPolicy: text })}
            editable={isEditing}
            multiline
            numberOfLines={4}
            placeholderTextColor={C.textMuted}
          />
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📞 Contact Information</Text>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Phone Number</Text>
          <TextInput
            style={[styles.settingValue, !isEditing && styles.disabledInput]}
            value={settings.contactPhone}
            onChangeText={(text) => setSettings({ ...settings, contactPhone: text })}
            editable={isEditing}
            keyboardType="phone-pad"
            placeholderTextColor={C.textMuted}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Email Address</Text>
          <TextInput
            style={[styles.settingValue, !isEditing && styles.disabledInput]}
            value={settings.contactEmail}
            onChangeText={(text) => setSettings({ ...settings, contactEmail: text })}
            editable={isEditing}
            keyboardType="email-address"
            placeholderTextColor={C.textMuted}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Address</Text>
          <TextInput
            style={[styles.settingValue, styles.textArea, !isEditing && styles.disabledInput]}
            value={settings.address}
            onChangeText={(text) => setSettings({ ...settings, address: text })}
            editable={isEditing}
            multiline
            numberOfLines={3}
            placeholderTextColor={C.textMuted}
          />
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Feather name="info" size={20} color={C.cyan} />
        <Text style={styles.infoText}>
          These settings affect the entire application. Delivery charges and tax calculations will be updated automatically.
        </Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingText: { marginTop: 12, fontSize: 14, color: C.cyan },
  
  heroHeader: { overflow: 'hidden', paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 20 : 20, paddingBottom: 20 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: C.white, marginBottom: 4 },
  heroSubtitle: { fontSize: 13, color: C.blue4 },
  editButton: { borderRadius: 10, overflow: 'hidden' },
  saveButton: { backgroundColor: C.accentGreen },
  editButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  editButtonText: { color: C.bg, fontWeight: '700', fontSize: 14 },
  
  section: { backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 16 },
  
  settingItem: { marginBottom: 16 },
  settingLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
  settingValue: { fontSize: 14, color: C.textPrimary, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, backgroundColor: C.surfaceAlt },
  settingHint: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  disabledInput: { opacity: 0.7 },
  textArea: { height: 80, textAlignVertical: 'top' },
  
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cyan + '10', marginHorizontal: 16, marginBottom: 20, padding: 14, borderRadius: 12, gap: 10, borderWidth: 1, borderColor: C.cyan + '30' },
  infoText: { flex: 1, fontSize: 12, color: C.textSecondary, lineHeight: 18 },
});
