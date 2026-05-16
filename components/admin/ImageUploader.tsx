// components/admin/ImageUploader.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

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

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  title?: string;
  showPreview?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onImagesChange,
  maxImages = 5,
  title = 'Product Images',
  showPreview = true,
}) => {
  const [uploading, setUploading] = useState(false);
  const [focused, setFocused] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permission to upload images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (images.length >= maxImages) {
        Alert.alert('Limit reached', `You can only upload up to ${maxImages} images`);
        return;
      }
      
      setUploading(true);
      // Simulate upload - replace with actual upload logic
      setTimeout(() => {
        onImagesChange([...images, result.assets[0].uri]);
        setUploading(false);
      }, 1000);
    }
  };

  const removeImage = (index: number) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newImages = [...images];
            newImages.splice(index, 1);
            onImagesChange(newImages);
          },
        },
      ]
    );
  };

  const setAsPrimary = (index: number) => {
    const newImages = [...images];
    const [primary] = newImages.splice(index, 1);
    onImagesChange([primary, ...newImages]);
  };

  return (
    <LinearGradient
      colors={[C.surface, C.surfaceAlt]}
      style={[styles.container, focused && styles.containerFocused]}
      onTouchStart={() => setFocused(true)}
      onTouchEnd={() => setFocused(false)}
    >
      {/* Bubbles Decoration */}
      <Bubble size={80} top={-20} right={-15} opacity={0.06} />
      <Bubble size={50} bottom={-10} left={-10} opacity={0.08} color={C.purple} />
      <Bubble size={30} top={40} right={30} opacity={0.1} color={C.cyan} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.titleIcon}>
            <Feather name="image" size={16} color={C.cyan} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        <LinearGradient
          colors={[C.blue1 + '40', C.cyan + '20']}
          style={styles.counterBadge}
        >
          <Text style={styles.counter}>
            {images.length}/{maxImages}
          </Text>
        </LinearGradient>
      </View>

      {/* Image List */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.imageList}
        contentContainerStyle={styles.imageListContent}
      >
        {images.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.image} />
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)']}
              style={styles.imageOverlay}
            >
              {index === 0 && (
                <View style={styles.primaryBadge}>
                  <Feather name="star" size={10} color={C.white} />
                  <Text style={styles.primaryText}>Primary</Text>
                </View>
              )}
              
              <View style={styles.imageActions}>
                {index !== 0 && (
                  <TouchableOpacity 
                    style={styles.imageAction} 
                    onPress={() => setAsPrimary(index)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={[C.accentOrange + 'CC', C.accentOrange]}
                      style={styles.actionGradient}
                    >
                      <Feather name="star" size={14} color={C.white} />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.imageAction} 
                  onPress={() => removeImage(index)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[C.accentRed + 'CC', C.accentRed]}
                    style={styles.actionGradient}
                  >
                    <Feather name="trash-2" size={14} color={C.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        ))}

        {images.length < maxImages && (
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={pickImage} 
            disabled={uploading}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[C.surfaceAlt, C.surfaceAlt]}
              style={styles.addButtonGradient}
            >
              {uploading ? (
                <ActivityIndicator color={C.cyan} size="large" />
              ) : (
                <>
                  <Feather name="plus" size={32} color={C.cyan} />
                  <Text style={styles.addText}>Add Image</Text>
                  <Text style={styles.addHint}>Tap to upload</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Preview Section */}
      {showPreview && images.length > 0 && (
        <View style={styles.previewSection}>
          <LinearGradient
            colors={[C.surfaceAlt + '80', C.surfaceAlt + '40']}
            style={styles.previewCard}
          >
            <View style={styles.previewHeader}>
              <Feather name="eye" size={12} color={C.cyan} />
              <Text style={styles.previewTitle}>Preview</Text>
            </View>
            <View style={styles.previewImages}>
              {images.slice(0, 3).map((image, index) => (
                <View key={index} style={styles.previewImageContainer}>
                  <Image source={{ uri: image }} style={styles.previewImage} />
                  {index === 0 && (
                    <View style={styles.previewPrimaryBadge}>
                      <Text style={styles.previewPrimaryText}>1st</Text>
                    </View>
                  )}
                </View>
              ))}
              {images.length > 3 && (
                <View style={styles.moreImagesBadge}>
                  <Text style={styles.moreImagesText}>+{images.length - 3}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Hint Text */}
      <Text style={styles.hintText}>
        First image will be used as the primary product image
      </Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    position: 'relative',
  },
  containerFocused: {
    borderColor: C.cyan,
    borderWidth: 2,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.cyan + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
  },
  counterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  counter: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '500',
  },
  
  // Image List
  imageList: {
    flexDirection: 'row',
  },
  imageListContent: {
    paddingRight: 8,
  },
  imageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    justifyContent: 'space-between',
    padding: 8,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.accentOrange,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  primaryText: {
    fontSize: 9,
    color: C.white,
    fontWeight: 'bold',
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  imageAction: {
    width: 28,
    height: 28,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Add Button
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    gap: 6,
  },
  addText: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '500',
  },
  addHint: {
    fontSize: 10,
    color: C.textMuted,
  },
  
  // Preview Section
  previewSection: {
    marginTop: 16,
  },
  previewCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  previewTitle: {
    fontSize: 11,
    color: C.textMuted,
  },
  previewImages: {
    flexDirection: 'row',
    gap: 8,
  },
  previewImageContainer: {
    position: 'relative',
  },
  previewImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  previewPrimaryBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: C.accentOrange,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  previewPrimaryText: {
    fontSize: 8,
    color: C.white,
    fontWeight: 'bold',
  },
  moreImagesBadge: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  moreImagesText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  
  // Hint
  hintText: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
});
