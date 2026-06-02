// components/admin/DataTable.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Column {
  key: string;
  title: string;
  width?: number;
  sortable?: boolean;
  render?: (item: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onPress?: (item: any) => void;  
}

export const DataTable: React.FC<DataTableProps> = ({ 
  columns, 
  data, 
  loading, 
  onEdit, 
  onDelete,
  onPress  
}) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00E5FF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const handleRowPress = (item: any) => {
    if (onPress) {
      onPress(item);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        {columns.map((col, index) => (
          <View key={col.key} style={[styles.headerCell, { width: col.width || 100 }]}>
            <Text style={styles.headerText}>{col.title}</Text>
          </View>
        ))}
        {(onEdit || onDelete) && (
          <View style={[styles.headerCell, { width: 80 }]}>
            <Text style={styles.headerText}>Actions</Text>
          </View>
        )}
      </View>

      {/* Rows */}
      {data.map((item, rowIndex) => (
        <TouchableOpacity 
          key={item.$id || rowIndex} 
          style={styles.row}
          onPress={() => handleRowPress(item)}
          activeOpacity={onPress ? 0.7 : 1}
        >
          {columns.map((col) => (
            <View key={col.key} style={[styles.cell, { width: col.width || 100 }]}>
              {col.render ? col.render(item) : <Text style={styles.cellText}>{item[col.key]}</Text>}
            </View>
          ))}
          {(onEdit || onDelete) && (
            <View style={[styles.cell, styles.actionsCell]}>
              {onEdit && (
                <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionBtn}>
                  <Feather name="edit-2" size={16} color="#42A5F5" />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity onPress={() => onDelete(item)} style={styles.actionBtn}>
                  <Feather name="trash-2" size={16} color="#FF5252" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </TouchableOpacity>
      ))}

      {data.length === 0 && (
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={48} color="#4A5580" />
          <Text style={styles.emptyText}>No data found</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#0D1535', borderRadius: 12, margin: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#1E2D60' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#00E5FF', fontSize: 14 },
  headerRow: { flexDirection: 'row', backgroundColor: '#111C42', borderBottomWidth: 1, borderBottomColor: '#1E2D60' },
  headerCell: { padding: 12, justifyContent: 'center' },
  headerText: { color: '#9FA8DA', fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1E2D60', minHeight: 50 },
  cell: { padding: 12, justifyContent: 'center' },
  cellText: { color: '#E8EAF6', fontSize: 13 },
  actionsCell: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  actionBtn: { padding: 4 },
  emptyContainer: { padding: 40, alignItems: 'center', gap: 10 },
  emptyText: { color: '#4A5580', fontSize: 14 },
});
