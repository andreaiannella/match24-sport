// Admin Local Sponsors Management Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, Input } from '../../src/components';
import { apiClient } from '../../src/api/client';
import { COLORS } from '../../src/utils/constants';
import { GradientBackground } from '../../src/components';
import { LocalSponsor } from '../../src/types';

export default function AdminSponsorsScreen() {
  const [sponsors, setSponsors] = useState<LocalSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [tagline, setTagline] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const fetchSponsors = async () => {
    try {
      const data = await apiClient.getAdminSponsors();
      setSponsors(data);
      setLoadError(false);
    } catch (error) {
      console.log('Error fetching sponsors:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSponsors();
  };

  const resetForm = () => {
    setBusinessName('');
    setTagline('');
    setCity('');
    setPhone('');
    setLinkUrl('');
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!businessName.trim() || !city.trim()) {
      Alert.alert('Campi mancanti', 'Nome attività e città sono obbligatori');
      return;
    }
    setSaving(true);
    try {
      await apiClient.createSponsor({
        business_name: businessName.trim(),
        tagline: tagline.trim() || undefined,
        city: city.trim(),
        phone: phone.trim() || undefined,
        link_url: linkUrl.trim() || undefined,
      });
      resetForm();
      fetchSponsors();
    } catch (error) {
      Alert.alert('Errore', 'Impossibile creare lo sponsor');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (sponsor: LocalSponsor) => {
    try {
      await apiClient.updateSponsor(sponsor.sponsor_id, { is_active: !sponsor.is_active });
      setSponsors(prev =>
        prev.map(s => s.sponsor_id === sponsor.sponsor_id ? { ...s, is_active: !s.is_active } : s)
      );
    } catch (error) {
      Alert.alert('Errore', 'Impossibile aggiornare lo sponsor');
    }
  };

  const handleDelete = (sponsor: LocalSponsor) => {
    Alert.alert(
      'Elimina sponsor',
      `Rimuovere "${sponsor.business_name}"? L'azione non è reversibile.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deleteSponsor(sponsor.sponsor_id);
              setSponsors(prev => prev.filter(s => s.sponsor_id !== sponsor.sponsor_id));
            } catch (error) {
              Alert.alert('Errore', 'Impossibile eliminare lo sponsor');
            }
          },
        },
      ]
    );
  };

  const renderSponsor = ({ item }: { item: LocalSponsor }) => (
    <Card style={styles.sponsorCard}>
      <View style={styles.sponsorHeader}>
        <View style={styles.sponsorIcon}>
          <Ionicons name="storefront-outline" size={22} color={COLORS.accent} />
        </View>
        <View style={styles.sponsorInfo}>
          <Text style={styles.sponsorName}>{item.business_name}</Text>
          <Text style={styles.sponsorCity}>{item.city}</Text>
          {item.tagline ? <Text style={styles.sponsorTagline}>{item.tagline}</Text> : null}
        </View>
        <Switch
          value={item.is_active}
          onValueChange={() => toggleActive(item)}
          trackColor={{ false: COLORS.border, true: COLORS.success + '80' }}
          thumbColor={item.is_active ? COLORS.success : COLORS.textMuted}
        />
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
        <Ionicons name="trash-outline" size={16} color={COLORS.error} />
        <Text style={styles.deleteButtonText}>Elimina</Text>
      </TouchableOpacity>
    </Card>
  );

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
          <View>
            <Text style={styles.title}>Sponsor Locali</Text>
            <Text style={styles.subtitle}>{sponsors.length} sponsor · venduti direttamente ai negozi locali</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
            <Ionicons name={showForm ? 'close' : 'add'} size={24} color={COLORS.background} />
          </TouchableOpacity>
        </View>

        {loadError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
            <Text style={styles.errorBannerText}>Impossibile caricare gli sponsor. Trascina per aggiornare.</Text>
          </View>
        )}

        {showForm && (
          <Card style={styles.formCard}>
            <Input label="Nome attività *" placeholder="Es. Racchette Milano" value={businessName} onChangeText={setBusinessName} />
            <Input label="Città *" placeholder="Es. Milano" value={city} onChangeText={setCity} />
            <Input label="Frase breve" placeholder="Es. -10% racchette ai soci del circolo" value={tagline} onChangeText={setTagline} />
            <Input label="Telefono" placeholder="Facoltativo" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Input label="Link (sito/social)" placeholder="Facoltativo" value={linkUrl} onChangeText={setLinkUrl} autoCapitalize="none" />
            <Button title="Crea sponsor" onPress={handleCreate} loading={saving} fullWidth />
          </Card>
        )}

        <FlatList
          data={sponsors}
          renderItem={renderSponsor}
          keyExtractor={(item) => item.sponsor_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.warning} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="storefront-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Nessuno sponsor ancora</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
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
  formCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sponsorCard: {
    marginBottom: 12,
  },
  sponsorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sponsorIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sponsorName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sponsorCity: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sponsorTagline: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  deleteButtonText: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '600',
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
