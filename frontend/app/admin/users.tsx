// Admin Users Management Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components';
import { apiClient } from '../../src/api/client';
import { COLORS } from '../../src/utils/constants';
import { GradientBackground } from '../../src/components';

interface User {
  user_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const fetchUsers = async () => {
    try {
      const users = await apiClient.getAdminUsers();
      setUsers(users);
      setLoadError(false);
    } catch (error) {
      console.log('Error fetching users:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    Alert.alert(
      currentStatus ? 'Disattiva Utente' : 'Attiva Utente',
      currentStatus 
        ? 'Sei sicuro di voler disattivare questo utente?' 
        : 'Sei sicuro di voler riattivare questo utente?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: currentStatus ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await apiClient.updateAdminUserStatus(userId, !currentStatus);
              setUsers(users.map(u => 
                u.user_id === userId ? { ...u, is_active: !currentStatus } : u
              ));
            } catch (error) {
              Alert.alert('Errore', 'Impossibile aggiornare lo stato utente');
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'super_admin':
        return { bg: COLORS.warning + '20', text: COLORS.warning };
      case 'club_admin':
        return { bg: COLORS.secondary + '20', text: COLORS.secondary };
      default:
        return { bg: COLORS.primary + '20', text: COLORS.primary };
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'club_admin': return 'Circolo';
      default: return 'Giocatore';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !filterRole || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const renderUser = ({ item }: { item: User }) => {
    const roleStyle = getRoleBadgeStyle(item.role);
    
    return (
      <Card style={[styles.userCard, !item.is_active && styles.inactiveCard]}>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Ionicons 
                name={item.role === 'club_admin' ? 'business' : 'person'} 
                size={24} 
                color={item.is_active ? COLORS.text : COLORS.textMuted} 
              />
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, !item.is_active && styles.inactiveText]}>
                {item.name}
              </Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.statusButton}
            onPress={() => toggleUserStatus(item.user_id, item.is_active)}
          >
            <Ionicons 
              name={item.is_active ? 'checkmark-circle' : 'close-circle'}
              size={28}
              color={item.is_active ? COLORS.success : COLORS.error}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.userFooter}>
          <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
            <Text style={[styles.roleBadgeText, { color: roleStyle.text }]}>
              {getRoleLabel(item.role)}
            </Text>
          </View>
          <Text style={styles.dateText}>
            Registrato: {new Date(item.created_at).toLocaleDateString('it-IT')}
          </Text>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.warning} />
        </View>
      </SafeAreaView>
    </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestione Utenti</Text>
        <Text style={styles.subtitle}>{filteredUsers.length} utenti</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca utente..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, !filterRole && styles.filterChipActive]}
          onPress={() => setFilterRole(null)}
        >
          <Text style={[styles.filterChipText, !filterRole && styles.filterChipTextActive]}>
            Tutti
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterRole === 'player' && styles.filterChipActive]}
          onPress={() => setFilterRole('player')}
        >
          <Text style={[styles.filterChipText, filterRole === 'player' && styles.filterChipTextActive]}>
            Giocatori
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterRole === 'club_admin' && styles.filterChipActive]}
          onPress={() => setFilterRole('club_admin')}
        >
          <Text style={[styles.filterChipText, filterRole === 'club_admin' && styles.filterChipTextActive]}>
            Circoli
          </Text>
        </TouchableOpacity>
      </View>

      {loadError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
          <Text style={styles.errorBannerText}>Impossibile caricare gli utenti. Trascina per aggiornare.</Text>
        </View>
      )}

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.warning}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nessun utente trovato</Text>
          </View>
        }
      />
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.error + '15',
    borderWidth: 1,
    borderColor: COLORS.error + '40',
  },
  errorBannerText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: {
    backgroundColor: COLORS.warning,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  userCard: {
    marginBottom: 12,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  inactiveText: {
    color: COLORS.textMuted,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusButton: {
    padding: 4,
  },
  userFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 12,
  },
});
