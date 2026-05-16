// app/(admin)/users.tsx - সম্পূর্ণ ফিক্সড ভার্সন

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DataTable } from '../../components/admin/DataTable';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { getAllUsers, updateUserStatus, deleteUser, updateUser } from '../../appwrite/admin';
import { account, databases, DATABASE_ID, COLLECTIONS, ID } from '../../appwrite/config';
import { Query } from 'appwrite';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#060B1F', surface: '#0D1535', surfaceAlt: '#111C42', border: '#1E2D60',
  blue1: '#1565C0', blue2: '#1976D2', blue3: '#42A5F5', blue4: '#90CAF9',
  cyan: '#00E5FF', purple: '#7C4DFF', indigo: '#3D5AFE',
  accentGreen: '#00E676', accentOrange: '#FFB300', accentRed: '#FF5252',
  accentPurple: '#CE93D8', accentBlue: '#42A5F5',
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

export default function UsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string>('');

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    role: 'user',
  });

  useEffect(() => {
    loadUsers();
    getCurrentUser();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, filterRole]);

  const getCurrentUser = async () => {
    try {
      const user = await account.get();
      setCurrentAdminId(user.$id);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.includes(query)
      );
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    setFilteredUsers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const handleEditUser = (user: any) => {
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || '',
      role: user.role || 'user',
    });
    setSelectedUser(user);
    setEditModalVisible(true);
  };

  const handleUpdateUser = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setUpdating(true);
    try {
      await updateUser(selectedUser.$id, {
        name: editForm.name,
        phone: editForm.phone,
        address: editForm.address,
        role: editForm.role,
      });
      Alert.alert('✅ Success', 'User updated successfully');
      setEditModalVisible(false);
      await loadUsers();
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const handleBanUser = async (user: any) => {
    if (user.userId === currentAdminId) {
      Alert.alert('Error', 'You cannot ban yourself!');
      return;
    }

    const newStatus = !user.isActive;
    Alert.alert(
      newStatus ? 'Unban User' : 'Ban User',
      `Are you sure you want to ${newStatus ? 'unban' : 'ban'} ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus ? 'Unban' : 'Ban',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              await updateUserStatus(user.$id, newStatus);
              await loadUsers();
              Alert.alert('✅ Success', `User ${newStatus ? 'unbanned' : 'banned'} successfully`);
            } catch (error) {
              Alert.alert('Error', 'Failed to update user status');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = (user: any) => {
    if (user.userId === currentAdminId) {
      Alert.alert('Error', 'You cannot delete yourself!');
      return;
    }

    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}?\n\nThis action cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              await deleteUser(user.$id);
              await loadUsers();
              Alert.alert('✅ Success', `${user.name} has been deleted`);
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to delete user');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleBulkAction = async (action: 'ban' | 'delete') => {
    if (selectedUsers.length === 0) return;

    const usersToAction = filteredUsers.filter(u =>
      selectedUsers.includes(u.$id) && u.userId !== currentAdminId
    );

    if (usersToAction.length === 0) {
      Alert.alert('Error', 'You cannot perform this action on yourself!');
      return;
    }

    Alert.alert(
      `${action === 'ban' ? 'Ban' : 'Delete'} Users`,
      `Are you sure you want to ${action} ${usersToAction.length} selected user(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'ban' ? 'Ban' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            let successCount = 0;

            for (const user of usersToAction) {
              try {
                if (action === 'ban') {
                  await updateUserStatus(user.$id, false);
                } else {
                  await deleteUser(user.$id);
                }
                successCount++;
              } catch (error) {
                console.error(`Failed to ${action} user:`, user.name);
              }
            }

            await loadUsers();
            setSelectedUsers([]);
            setShowBulkActions(false);
            setUpdating(false);

            Alert.alert('✅ Success', `${successCount} user(s) ${action === 'ban' ? 'banned' : 'deleted'} successfully`);
          },
        },
      ]
    );
  };

  const toggleUserSelection = (userId: string, userAccountId: string) => {
    if (userAccountId === currentAdminId) {
      Alert.alert('Cannot Select', 'You cannot select yourself');
      return;
    }

    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const selectAllUsers = () => {
    const selectableUsers = filteredUsers.filter(u => u.userId !== currentAdminId);

    if (selectedUsers.length === selectableUsers.length && selectableUsers.length > 0) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(selectableUsers.map(u => u.$id));
    }
  };

  const getStats = () => ({
    total: users.length,
    active: users.filter(u => u.isActive).length,
    banned: users.filter(u => !u.isActive).length,
    admins: users.filter(u => u.role === 'admin').length,
  });

  const stats = getStats();

  const columns = [
    {
      key: 'select',
      title: '',
      width: 50,
      render: (item: any) => (
        <TouchableOpacity onPress={() => toggleUserSelection(item.$id, item.userId)}>
          <View style={[styles.checkbox, selectedUsers.includes(item.$id) && styles.checkboxChecked]}>
            {selectedUsers.includes(item.$id) && <Feather name="check" size={12} color="#fff" />}
          </View>
        </TouchableOpacity>
      )
    },
    { key: 'name', title: 'Name', sortable: true, render: (item: any) => <Text style={styles.cellText}>{item.name || 'N/A'}</Text> },
    { key: 'email', title: 'Email', sortable: true, render: (item: any) => <Text style={styles.cellText}>{item.email || 'N/A'}</Text> },
    { key: 'phone', title: 'Phone', render: (item: any) => <Text style={styles.cellText}>{item.phone || '-'}</Text> },
    {
      key: 'role',
      title: 'Role',
      render: (item: any) => (
        <View style={[styles.roleBadge, { backgroundColor: item.role === 'admin' ? C.purple + '20' : C.blue3 + '20' }]}>
          <Text style={[styles.roleText, { color: item.role === 'admin' ? C.purple : C.blue3 }]}>
            {item.role === 'admin' ? 'Admin' : 'User'}
          </Text>
        </View>
      )
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (item: any) => (
        <View style={[styles.statusBadge, { backgroundColor: item.isActive ? C.accentGreen + '20' : C.accentRed + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: item.isActive ? C.accentGreen : C.accentRed }]} />
          <Text style={[styles.statusText, { color: item.isActive ? C.accentGreen : C.accentRed }]}>
            {item.isActive ? 'Active' : 'Banned'}
          </Text>
        </View>
      )
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
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
            <Text style={styles.heroTitle}>👥 User Management</Text>
            <Text style={styles.heroSubtitle}>Manage, monitor & control user accounts</Text>
          </View>
          <View style={styles.heroBadge}>
            <LinearGradient colors={[C.cyan, C.blue3]} style={styles.heroBadgeGradient}>
              <Feather name="users" size={20} color={C.bg} />
            </LinearGradient>
          </View>
        </View>

        {/* Stats Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          {[
            { label: 'Total', value: stats.total, color: C.blue4, icon: 'users' },
            { label: 'Active', value: stats.active, color: C.accentGreen, icon: 'check-circle' },
            { label: 'Banned', value: stats.banned, color: C.accentRed, icon: 'slash' },
            { label: 'Admins', value: stats.admins, color: C.purple, icon: 'shield' },
          ].map((stat, i) => (
            <View key={i} style={[styles.statChip, { borderColor: stat.color + '50' }]}>
              <Feather name={stat.icon as any} size={14} color={stat.color} />
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Feather name="search" size={18} color={C.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email or phone..."
          placeholderTextColor={C.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
        {['all', 'user', 'admin'].map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.filterChip, filterRole === role && styles.filterChipActive]}
            onPress={() => setFilterRole(role)}
          >
            <Text style={[styles.filterText, filterRole === role && styles.filterTextActive]}>
              {role === 'all' ? 'All Users' : role === 'admin' ? 'Admins' : 'Users'}
              {role !== 'all' && (
                <Text style={styles.filterCount}> ({users.filter(u => u.role === role).length})</Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}

        {selectedUsers.length > 0 && (
          <TouchableOpacity style={styles.bulkChip} onPress={() => setShowBulkActions(true)}>
            <Feather name="settings" size={14} color={C.cyan} />
            <Text style={styles.bulkChipText}>{selectedUsers.length} Selected</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Data Table */}
      <ScrollView
        style={styles.tableContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} colors={[C.cyan]} />}
      >
        <DataTable
          columns={columns}
          data={filteredUsers}
          loading={loading}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
        />
      </ScrollView>

      {/* User Details Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWrapper}>
            <LinearGradient colors={['#0A1647', '#0D1F6E']} style={styles.modalHeaderGradient}>
              <View style={styles.modalHeaderContent}>
                <Text style={styles.modalTitle}>User Details</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                  <Feather name="x" size={20} color={C.white} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              {selectedUser && (
                <>
                  <View style={styles.userAvatar}>
                    <LinearGradient colors={[C.cyan, C.blue3]} style={styles.avatarGradient}>
                      <Text style={styles.avatarText}>
                        {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </LinearGradient>
                    {selectedUser.userId === currentAdminId && (
                      <View style={styles.currentUserBadge}>
                        <Text style={styles.currentUserBadgeText}>You</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Basic Information</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Full Name</Text>
                      <Text style={styles.infoValue}>{selectedUser.name || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Email Address</Text>
                      <Text style={styles.infoValue}>{selectedUser.email || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Phone Number</Text>
                      <Text style={styles.infoValue}>{selectedUser.phone || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Address</Text>
                      <Text style={styles.infoValue}>{selectedUser.address || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔐 Account Information</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Role</Text>
                      <View style={[styles.roleBadge, { backgroundColor: selectedUser.role === 'admin' ? C.purple + '20' : C.blue3 + '20' }]}>
                        <Text style={[styles.roleText, { color: selectedUser.role === 'admin' ? C.purple : C.blue3 }]}>
                          {selectedUser.role === 'admin' ? 'Administrator' : 'Regular User'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Status</Text>
                      <View style={[styles.statusBadge, { backgroundColor: selectedUser.isActive ? C.accentGreen + '20' : C.accentRed + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: selectedUser.isActive ? C.accentGreen : C.accentRed }]} />
                        <Text style={[styles.statusText, { color: selectedUser.isActive ? C.accentGreen : C.accentRed }]}>
                          {selectedUser.isActive ? 'Active' : 'Banned'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>User ID</Text>
                      <Text style={styles.infoValue}>{selectedUser.$id?.slice(-12) || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Joined Date</Text>
                      <Text style={styles.infoValue}>
                        {selectedUser.$createdAt ? new Date(selectedUser.$createdAt).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.editBtn]}
                      onPress={() => {
                        setModalVisible(false);
                        handleEditUser(selectedUser);
                      }}
                    >
                      <Feather name="edit-2" size={16} color={C.white} />
                      <Text style={styles.modalBtnText}>Edit</Text>
                    </TouchableOpacity>

                    {selectedUser.userId !== currentAdminId && (
                      <>
                        <TouchableOpacity
                          style={[styles.modalBtn, selectedUser.isActive ? styles.banBtn : styles.unbanBtn]}
                          onPress={() => {
                            setModalVisible(false);
                            handleBanUser(selectedUser);
                          }}
                        >
                          <Feather name="slash" size={16} color={C.white} />
                          <Text style={styles.modalBtnText}>{selectedUser.isActive ? 'Ban' : 'Unban'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.modalBtn, styles.deleteBtn]}
                          onPress={() => {
                            setModalVisible(false);
                            handleDeleteUser(selectedUser);
                          }}
                        >
                          <Feather name="trash-2" size={16} color={C.white} />
                          <Text style={styles.modalBtnText}>Delete</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal animationType="slide" transparent visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalWrapper, { maxHeight: '80%' }]}>
            <LinearGradient colors={['#0A1647', '#0D1F6E']} style={styles.modalHeaderGradient}>
              <View style={styles.modalHeaderContent}>
                <Text style={styles.modalTitle}>Edit User</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCloseBtn}>
                  <Feather name="x" size={20} color={C.white} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                  placeholder="Enter full name"
                  placeholderTextColor={C.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  placeholderTextColor={C.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editForm.address}
                  onChangeText={(text) => setEditForm({ ...editForm, address: text })}
                  placeholder="Enter address"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={C.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
  <Text style={styles.label}>Role</Text>
  <View style={styles.roleContainer}>
    <TouchableOpacity
      style={[styles.roleOption, editForm.role === 'user' && styles.roleOptionActive]}
      onPress={() => setEditForm({ ...editForm, role: 'user' })}
    >
      <Text style={[styles.roleText, editForm.role === 'user' && styles.roleTextActive]}>
        User
      </Text>
    </TouchableOpacity>
    
    <TouchableOpacity
      style={[styles.roleOption, editForm.role === 'admin' && styles.roleOptionActive]}
      onPress={() => setEditForm({ ...editForm, role: 'admin' })}
    >
      <Text style={[styles.roleText, editForm.role === 'admin' && styles.roleTextActive]}>
        Admin
      </Text>
    </TouchableOpacity>
  </View>
</View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleUpdateUser} disabled={updating}>
                  {updating ? (
                    <ActivityIndicator size="small" color={C.bg} />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bulk Actions Modal */}
      <Modal animationType="fade" transparent visible={showBulkActions} onRequestClose={() => setShowBulkActions(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bulkModal}>
            <Text style={styles.bulkModalTitle}>Bulk Actions</Text>
            <Text style={styles.bulkModalSubtitle}>{selectedUsers.length} users selected</Text>

            <TouchableOpacity style={styles.bulkActionBtn} onPress={() => handleBulkAction('ban')}>
              <Feather name="slash" size={20} color={C.accentOrange} />
              <Text style={styles.bulkActionText}>Ban Selected Users</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bulkActionBtn} onPress={selectAllUsers}>
              <Feather name="check-square" size={20} color={C.blue3} />
              <Text style={styles.bulkActionText}>
                {selectedUsers.length === filteredUsers.filter(u => u.userId !== currentAdminId).length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.bulkActionBtn, styles.dangerBtn]} onPress={() => handleBulkAction('delete')}>
              <Feather name="trash-2" size={20} color={C.accentRed} />
              <Text style={[styles.bulkActionText, styles.dangerText]}>Delete Selected Users</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bulkCancelBtn} onPress={() => setShowBulkActions(false)}>
              <Text style={styles.bulkCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  heroHeader: { overflow: 'hidden', paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 20 : 20, paddingBottom: 16 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: C.white, marginBottom: 4 },
  heroSubtitle: { fontSize: 13, color: C.blue4 },
  heroBadge: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  heroBadgeGradient: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

  statsScroll: { flexDirection: 'row', marginTop: 8 },
  statChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginRight: 10, gap: 6 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: C.textMuted },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, margin: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: C.textPrimary },

  filterBar: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, marginRight: 8 },
  filterChipActive: { backgroundColor: C.blue1, borderColor: C.cyan },
  filterText: { color: C.textMuted, fontSize: 12 },
  filterTextActive: { color: C.cyan, fontWeight: '700' },
  filterCount: { fontSize: 11, opacity: 0.8 },
  bulkChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cyan + '15', borderWidth: 1, borderColor: C.cyan, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, gap: 6 },
  bulkChipText: { color: C.cyan, fontSize: 12, fontWeight: '600' },

  tableContainer: { flex: 1 },

  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: C.cyan, borderColor: C.cyan },

  cellText: { fontSize: 13, color: C.textPrimary },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontWeight: '600', color: C.textSecondary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalWrapper: { backgroundColor: C.surface, borderRadius: 24, width: '90%', maxHeight: '85%', overflow: 'hidden' },
  modalHeaderGradient: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  modalHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: C.white },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 20 },

  userAvatar: { alignItems: 'center', marginBottom: 20, position: 'relative' },
  avatarGradient: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: C.bg },
  currentUserBadge: { position: 'absolute', bottom: -5, backgroundColor: C.accentGreen, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  currentUserBadgeText: { color: C.white, fontSize: 10, fontWeight: 'bold' },

  section: { backgroundColor: C.surfaceAlt, borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  infoLabel: { fontSize: 12, color: C.textSecondary, flex: 1 },
  infoValue: { fontSize: 12, fontWeight: '500', color: C.textPrimary, flex: 1, textAlign: 'right' },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 8 },
  modalBtnText: { color: C.white, fontSize: 14, fontWeight: '600' },
  editBtn: { backgroundColor: C.blue3 },
  banBtn: { backgroundColor: C.accentOrange },
  unbanBtn: { backgroundColor: C.accentGreen },
  deleteBtn: { backgroundColor: C.accentRed },
  cancelBtn: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  cancelBtnText: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },
  saveBtn: { backgroundColor: C.cyan },
  saveBtnText: { color: C.bg, fontSize: 14, fontWeight: '700' },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 14, color: C.textPrimary, backgroundColor: C.surfaceAlt },
  textArea: { height: 80, textAlignVertical: 'top' },

  roleContainer: { flexDirection: 'row', gap: 10 },
  roleOption: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: C.surfaceAlt, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  roleOptionActive: { backgroundColor: C.blue1, borderColor: C.cyan },
  roleOptionText: { color: C.textMuted, fontWeight: '500' },
  roleOptionTextActive: { color: C.cyan, fontWeight: '700' },

  bulkModal: { backgroundColor: C.surface, borderRadius: 20, padding: 20, width: '80%', alignItems: 'center' },
  bulkModalTitle: { fontSize: 18, fontWeight: 'bold', color: C.textPrimary, marginBottom: 8 },
  bulkModalSubtitle: { fontSize: 13, color: C.textMuted, marginBottom: 20 },
  bulkActionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, width: '100%', justifyContent: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  bulkActionText: { fontSize: 15, color: C.textPrimary },
  dangerBtn: { borderBottomWidth: 0 },
  dangerText: { color: C.accentRed },
  bulkCancelBtn: { marginTop: 10, paddingVertical: 12, width: '100%', alignItems: 'center' },
  bulkCancelText: { color: C.textMuted, fontSize: 14 },

   
  roleTextActive: {
    color: C.cyan,
    fontWeight: '700',
  },
});
