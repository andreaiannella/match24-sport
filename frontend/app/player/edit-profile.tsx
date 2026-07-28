// Edit Profile Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, Input, Card, LoadingSpinner, SportImage } from '../../src/components';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS, SPORTS, SKILL_LEVELS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { PlayerProfile } from '../../src/types';
import { lightHaptic, errorHaptic, successHaptic } from '../../src/utils/haptics';
import { GradientBackground } from '../../src/components';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, deleteAccount } = useAuth();
  const { t } = useLanguage();

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [city, setCity] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [skillLevels, setSkillLevels] = useState<Record<string, string>>({});
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiClient.getPlayerProfile();
        setProfile(data);
        setCity(data.city || '');
        setNickname(data.nickname || '');
        setBio(data.bio || '');
        setSelectedSports(data.preferred_sports || []);
        setSkillLevels(data.skill_levels || {});
        setProfilePicture(data.profile_picture || null);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso necessario', 'Abbiamo bisogno del permesso per accedere alle foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfilePicture(base64Image);
    }
  };

  const toggleSport = (sportId: string) => {
    setSelectedSports((prev) =>
      prev.includes(sportId)
        ? prev.filter((s) => s !== sportId)
        : [...prev, sportId]
    );
  };

  const setSkillLevel = (sport: string, level: string) => {
    setSkillLevels((prev) => ({ ...prev, [sport]: level }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.updatePlayerProfile({
        city,
        nickname,
        bio,
        preferred_sports: selectedSports,
        skill_levels: skillLevels,
        profile_picture: profilePicture,
      });
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Errore', 'Impossibile salvare il profilo');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Account Functions
  const handleOpenDeleteModal = () => {
    lightHaptic();
    setShowDeleteModal(true);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleCloseDeleteModal = () => {
    lightHaptic();
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteError('');
    setIsDeleting(false);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Inserisci la password per confermare.');
      errorHaptic();
      return;
    }

    // Show final confirmation
    Alert.alert(
      'Elimina Account',
      'Questa azione è PERMANENTE e non può essere annullata. Tutti i tuoi dati verranno eliminati. Sei assolutamente sicuro?',
      [
        {
          text: 'Annulla',
          style: 'cancel',
        },
        {
          text: 'Elimina il mio account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            setDeleteError('');
            
            try {
              const result = await deleteAccount(deletePassword);
              
              if (result.success) {
                successHaptic();
                setShowDeleteModal(false);
                
                // Show success and redirect
                Alert.alert(
                  'Account Eliminato',
                  'Il tuo account è stato eliminato con successo.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        router.replace('/');
                      },
                    },
                  ]
                );
              }
            } catch (err: any) {
              errorHaptic();
              console.error('Delete account error:', err);
              
              if (err.response?.status === 401) {
                setDeleteError('Password non corretta. Riprova.');
              } else if (err.response?.status === 404) {
                setDeleteError('Account non trovato. Contatta il supporto.');
              } else if (err.response?.data?.detail) {
                setDeleteError(err.response.data.detail);
              } else if (err.message) {
                setDeleteError(err.message);
              } else {
                setDeleteError('Errore durante l\'eliminazione. Riprova più tardi.');
              }
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message={t('loading')} />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('edit')} {t('profile')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Picture */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={48} color={COLORS.textMuted} />
                </View>
              )}
              <View style={styles.editAvatarButton}>
                <Ionicons name="camera" size={16} color={COLORS.background} />
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Cambia foto</Text>
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Input
              label={t('city')}
              placeholder="Es. Milano"
              value={city}
              onChangeText={setCity}
              leftIcon="location-outline"
            />
            <Input
              label={t('nickname')}
              placeholder="Il tuo soprannome in campo"
              value={nickname}
              onChangeText={setNickname}
              leftIcon="at-outline"
            />
            <Input
              label={t('bio')}
              placeholder="Presentati agli altri giocatori..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              leftIcon="document-text-outline"
            />
          </View>

          {/* Sports Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('preferred_sports')}</Text>
            <View style={styles.sportsGrid}>
              {SPORTS.map((sport) => (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.sportCard,
                    selectedSports.includes(sport.id) && {
                      borderColor: sport.color,
                      backgroundColor: sport.color + '20',
                    },
                  ]}
                  onPress={() => toggleSport(sport.id)}
                >
                  <SportImage sport={sport.id} size={28} />
                  <Text
                    style={[
                      styles.sportCardText,
                      selectedSports.includes(sport.id) && { color: sport.color },
                    ]}
                  >
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Skill Levels */}
          {selectedSports.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('level')}</Text>
              {selectedSports.map((sportId) => {
                const sport = SPORTS.find((s) => s.id === sportId)!;
                return (
                  <Card key={sportId} style={styles.levelCard}>
                    <Text style={styles.levelCardTitle}>{sport.name}</Text>
                    <View style={styles.levelOptions}>
                      {SKILL_LEVELS.filter((l) => l.id !== 'all').map((level) => (
                        <TouchableOpacity
                          key={level.id}
                          style={[
                            styles.levelOption,
                            skillLevels[sportId] === level.id && {
                              backgroundColor: sport.color,
                            },
                          ]}
                          onPress={() => setSkillLevel(sportId, level.id)}
                        >
                          <Text
                            style={[
                              styles.levelOptionText,
                              skillLevels[sportId] === level.id && { color: COLORS.background },
                            ]}
                          >
                            {level.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </Card>
                );
              })}
            </View>
          )}

          <Button
            title={t('save')}
            onPress={handleSave}
            loading={isSaving}
            fullWidth
            size="large"
            style={styles.submitButton}
          />

          {/* Danger Zone - Delete Account */}
          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>Zona Pericolosa</Text>
            <Text style={styles.dangerZoneDescription}>
              L'eliminazione dell'account è permanente e non può essere annullata.
            </Text>
            <TouchableOpacity
              style={styles.deleteAccountButton}
              onPress={handleOpenDeleteModal}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={styles.deleteAccountButtonText}>Elimina Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.warningIcon}>
                <Ionicons name="warning" size={32} color={COLORS.error} />
              </View>
              <Text style={styles.modalTitle}>Elimina Account</Text>
              <Text style={styles.modalSubtitle}>
                Questa azione è permanente e non può essere annullata.
              </Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalInfoTitle}>Cosa succederà:</Text>
              <View style={styles.modalInfoRow}>
                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                <Text style={styles.modalInfoText}>I tuoi dati personali verranno eliminati</Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="person-remove-outline" size={16} color={COLORS.error} />
                <Text style={styles.modalInfoText}>Il tuo profilo e account saranno rimossi</Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="chatbubbles-outline" size={16} color={COLORS.error} />
                <Text style={styles.modalInfoText}>I tuoi messaggi saranno anonimizzati</Text>
              </View>

              <Text style={styles.passwordLabel}>Conferma la tua password</Text>
              <View style={styles.passwordInputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textMuted}
                  value={deletePassword}
                  onChangeText={(text) => {
                    setDeletePassword(text);
                    setDeleteError('');
                  }}
                  secureTextEntry={!showDeletePassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isDeleting}
                />
                <TouchableOpacity onPress={() => setShowDeletePassword(!showDeletePassword)}>
                  <Ionicons
                    name={showDeletePassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {deleteError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.errorText}>{deleteError}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseDeleteModal}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmDeleteButton,
                  (!deletePassword.trim() || isDeleting) && styles.confirmDeleteButtonDisabled
                ]}
                onPress={handleDeleteAccount}
                disabled={!deletePassword.trim() || isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Elimina Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  sportsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  sportCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sportCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 8,
  },
  levelCard: {
    marginBottom: 12,
  },
  levelCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  levelOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  levelOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
  },
  levelOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  submitButton: {
    marginTop: 8,
  },
  // Danger Zone - Delete Account Styles
  dangerZone: {
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.error + '30',
  },
  dangerZoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: 8,
  },
  dangerZoneDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '10',
  },
  deleteAccountButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.error,
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  warningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.error,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalInfoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 10,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 10,
    marginRight: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginLeft: 6,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  confirmDeleteButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteButtonDisabled: {
    backgroundColor: COLORS.error + '50',
  },
  confirmDeleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.background,
  },
});
