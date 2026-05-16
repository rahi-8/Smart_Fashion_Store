import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

export default function Marketing() {
  const campaigns = [
    { id: '1', name: 'Summer Sale', status: 'Active', reach: '10K' },
    { id: '2', name: 'New Collection', status: 'Draft', reach: '0' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marketing Campaigns</Text>
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.campaignCard}>
            <Text style={styles.campaignName}>{item.name}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Reach: {item.reach}</Text>
          </View>
        )}
      />
      <TouchableOpacity style={styles.addButton}>
        <Text style={styles.addButtonText}>+ New Campaign</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', margin: 20 },
  campaignCard: { backgroundColor: 'white', padding: 15, margin: 10, borderRadius: 8 },
  campaignName: { fontSize: 16, fontWeight: 'bold' },
  addButton: { backgroundColor: '#0D1F6E', margin: 20, padding: 15, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: 'white', fontWeight: 'bold' }
});
