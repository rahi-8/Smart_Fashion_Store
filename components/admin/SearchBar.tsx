// components/admin/SearchBar.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Text,
  Dimensions,
} from 'react-native';
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

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  filters?: { label: string; value: string }[];
  onFilter?: (filter: string) => void;
  initialQuery?: string;
  initialFilter?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search products, orders, users...',
  filters,
  onFilter,
  initialQuery = '',
  initialFilter = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(initialFilter || null);
  const [isFocused, setIsFocused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  const handleSearch = () => {
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const toggleFilters = () => {
    if (showFilters) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setShowFilters(false));
    } else {
      setShowFilters(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const selectFilter = (filterValue: string, filterLabel: string) => {
    const newFilter = filterValue === selectedFilter ? null : filterValue;
    setSelectedFilter(newFilter);
    onFilter?.(newFilter || '');
    if (newFilter) {
      // Show feedback
      console.log(`Filter applied: ${filterLabel}`);
    }
    toggleFilters();
  };

  const clearFilter = () => {
    setSelectedFilter(null);
    onFilter?.('');
  };

  return (
    <LinearGradient
      colors={[C.surface, C.surfaceAlt]}
      style={styles.container}
    >
      {/* Search Input Container */}
      <View style={styles.searchContainer}>
        <LinearGradient
          colors={[C.surfaceAlt, C.surfaceAlt]}
          style={[styles.searchBox, isFocused && styles.searchBoxFocused]}
        >
          <Feather name="search" size={18} color={isFocused ? C.cyan : C.textMuted} />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {query !== '' && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Feather name="x" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </LinearGradient>
        
        {/* Filter Button */}
        {filters && filters.length > 0 && (
          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter && styles.filterButtonActive]} 
            onPress={toggleFilters}
            activeOpacity={0.7}
          >
            <Feather 
              name="sliders" 
              size={18} 
              color={selectedFilter ? C.cyan : C.textSecondary} 
            />
            {selectedFilter && (
              <View style={styles.filterDot} />
            )}
          </TouchableOpacity>
        )}
        
        {/* Search Button */}
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={handleSearch}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[C.blue2, C.cyan]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.searchButtonGradient}
          >
            <Feather name="search" size={18} color={C.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Active Filter Badge */}
      {selectedFilter && filters && (
        <View style={styles.activeFilterContainer}>
          <TouchableOpacity 
            style={styles.activeFilterBadge}
            onPress={clearFilter}
            activeOpacity={0.7}
          >
            <Text style={styles.activeFilterText}>
              Filter: {filters.find(f => f.value === selectedFilter)?.label}
            </Text>
            <Feather name="x" size={14} color={C.cyan} />
          </TouchableOpacity>
        </View>
      )}

      {/* Filters Dropdown */}
      {showFilters && filters && (
        <Animated.View 
          style={[
            styles.filtersContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <LinearGradient
            colors={[C.surfaceAlt, C.surfaceAlt]}
            style={styles.filtersWrapper}
          >
            <View style={styles.filtersHeader}>
              <Feather name="filter" size={14} color={C.cyan} />
              <Text style={styles.filtersTitle}>Filter by</Text>
              {selectedFilter && (
                <TouchableOpacity onPress={clearFilter}>
                  <Text style={styles.clearFilterText}>Clear all</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.filtersList}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    selectedFilter === filter.value && styles.filterChipActive,
                  ]}
                  onPress={() => selectFilter(filter.value, filter.label)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selectedFilter === filter.value && styles.filterTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                  {selectedFilter === filter.value && (
                    <Feather name="check" size={12} color={C.white} style={styles.filterCheck} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  
  // Search Container
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchBoxFocused: {
    borderColor: C.cyan,
    borderWidth: 2,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: C.textPrimary,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  
  // Filter Button
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
  },
  filterButtonActive: {
    borderColor: C.cyan,
    backgroundColor: C.cyan + '10',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.cyan,
  },
  
  // Search Button
  searchButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  searchButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Active Filter Badge
  activeFilterContainer: {
    marginTop: 12,
  },
  activeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: C.cyan + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: C.cyan + '30',
  },
  activeFilterText: {
    fontSize: 12,
    color: C.cyan,
    fontWeight: '500',
  },
  
  // Filters Dropdown
  filtersContainer: {
    marginTop: 12,
  },
  filtersWrapper: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filtersTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearFilterText: {
    fontSize: 11,
    color: C.cyan,
    fontWeight: '500',
  },
  filtersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: C.blue1,
    borderColor: C.cyan,
  },
  filterText: {
    fontSize: 13,
    color: C.textSecondary,
  },
  filterTextActive: {
    color: C.white,
    fontWeight: '500',
  },
  filterCheck: {
    marginLeft: 2,
  },
});
