// Club Edit Profile Screen - Fixed Image Upload and Name Field
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Button, Card, LoadingSpinner } from '../../src/components';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { COLORS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { Club } from '../../src/types';
import { successHaptic, lightHaptic, errorHaptic } from '../../src/utils/haptics';
import { GradientBackground } from '../../src/components';

// Custom Input that works better on iOS for all fields
function ClubInput({ 
  label, 
  value, 
  onChangeText, 
  placeholder,
  multiline = false,
  keyboardType = 'default',
  required = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
  required?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View style={inputStyles.container}>
      <Text style={inputStyles.label}>
        {label}{required ? ' *' : ''}
      </Text>
      <View style={[
        inputStyles.inputContainer,
        isFocused && inputStyles.inputFocused,
      ]}>
        <TextInput
          style={[
            inputStyles.input,
            multiline && inputStyles.multilineInput,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          keyboardType={keyboardType}
          // Prevent iOS autofill completely
          autoCorrect={false}
          autoCapitalize="none"
          autoComplete="off"
          textContentType="none"
          spellCheck={false}
        />
      </View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: COLORS.secondary,
    borderWidth: 2,
  },
  input: {
    color: COLORS.text,
    fontSize: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

export default function EditClubProfileScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { deleteAccount } = useAuth();

  const [club, setClub] = useState<Club | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchClub();
  }, []);

  const fetchClub = async () => {
    try {
      const data = await apiClient.getMyClub();
      setClub(data);
      setName(data.name || '');
      setDescription(data.description || '');
      setAddress(data.address || '');
      setCity(data.city || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setWebsite(data.website || '');
      setLogo(data.logo || null);
    } catch (error) {
      console.error('Error fetching club:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati del circolo');
    } finally {
      setIsLoading(false);
    }
  };

  const compressImage = async (uri: string): Promise<string> => {
    try {
      // Resize and compress the image
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],  // Max width 800px
        { 
          compress: 0.6,  // 60% quality
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      
      return `data:image/jpeg;base64,${manipulated.base64}`;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permesso negato', 'È necessario il permesso per accedere alla galleria');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,  // Initial quality
    });

    if (!result.canceled && result.assets[0]) {
      setIsUploadingPhoto(true);
      try {
        // Compress the image before uploading
        const compressedBase64 = await compressImage(result.assets[0].uri);
        
        console.log('[Upload] Compressed image size:', Math.round(compressedBase64.length / 1024), 'KB');
        
        // Upload to backend
        await apiClient.updateMyClub({ logo: compressedBase64 });
        setLogo(compressedBase64);
        successHaptic();
        Alert.alert('Successo', 'Foto del circolo aggiornata');
      } catch (error: any) {
        console.error('Error uploading photo:', error);
        Alert.alert(
          'Errore', 
          error.response?.data?.detail || 'Impossibile caricare la foto. Prova con un\'immagine più piccola.'
        );
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permesso negato', 'È necessario il permesso per usare la fotocamera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsUploadingPhoto(true);
      try {
        const compressedBase64 = await compressImage(result.assets[0].uri);
        
        await apiClient.updateMyClub({ logo: compressedBase64 });
        setLogo(compressedBase64);
        successHaptic();
        Alert.alert('Successo', 'Foto del circolo aggiornata');
      } catch (error) {
        console.error('Error uploading photo:', error);
        Alert.alert('Errore', 'Impossibile caricare la foto');
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Foto del Circolo',
      'Come vuoi aggiungere la foto?',
      [
        { text: 'Scatta una foto', onPress: handleTakePhoto },
        { text: 'Scegli dalla galleria', onPress: handlePickImage },
        { text: 'Annulla', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim() || !city.trim()) {
      Alert.alert('Errore', 'Nome, indirizzo e città sono obbligatori');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.updateMyClub({
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
      });
      successHaptic();
      Alert.alert('Successo', 'Profilo aggiornato con successo', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Impossibile aggiornare il profilo');
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

    Alert.alert(
      'Elimina Account',
      'ATTENZIONE: Eliminando l\'account del circolo, tutti i dati associati verranno rimossi. Questa azione è PERMANENTE. Sei sicuro?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            setDeleteError('');
            
            try {
              const result = await deleteAccount(deletePassword);
              
              if (result.success) {
                successHaptic();
                setShowDeleteModal(false);
                
                Alert.alert(
                  'Account Eliminato',
                  'Il tuo account è stato eliminato con successo.',
                  [{ text: 'OK', onPress: () => router.replace('/') }]
                );
              }
            } catch (err: any) {
              errorHaptic();
              
              if (err.response?.status === 401) {
                setDeleteError('Password non corretta. Riprova.');
              } else if (err.response?.data?.detail) {
                setDeleteError(err.response.data.detail);
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
    return (
      <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
      </SafeAreaView>
    </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Modifica Circolo</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Club Photo */}
          <Card style={styles.photoCard}>
            <Text style={styles.sectionTitle}>Foto del Circolo</Text>
            <TouchableOpacity 
              style={styles.photoContainer} 
              onPress={showPhotoOptions}
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? (
                <View style={styles.photoPlaceholder}>
                  <ActivityIndicator size="large" color={COLORS.secondary} />
                  <Text style={styles.uploadingText}>Caricamento...</Text>
                </View>
              ) : logo ? (
                <Image source={{ uri: logo }} style={styles.clubPhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.photoPlaceholderText}>Aggiungi foto</Text>
                </View>
              )}
              <View style={styles.photoEditBadge}>
                <Ionicons name="pencil" size={16} color={COLORS.background} />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>
              Tocca per aggiungere o modificare la foto del tuo circolo
            </Text>
          </Card>

          {/* Club Info */}
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Informazioni</Text>
            
            <ClubInput
              label="Nome Circolo"
              value={name}
              onChangeText={setName}
              placeholder="Es. Tennis Club Milano"
              required
            />

            <ClubInput
              label="Descrizione"
              value={description}
              onChangeText={setDescription}
              placeholder="Descrivi il tuo circolo..."
              multiline
            />

            <ClubInput
              label="Indirizzo"
              value={address}
              onChangeText={setAddress}
              placeholder="Via Roma 1"
              required
            />

            <ClubInput
              label="Città"
              value={city}
              onChangeText={setCity}
              placeholder="Milano"
              required
            />

            <ClubInput
              label="Telefono"
              value={phone}
              onChangeText={setPhone}
              placeholder="+39 02 1234567"
              keyboardType="phone-pad"
            />

            <ClubInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="info@tuocircolo.it"
              keyboardType="email-address"
            />

            <ClubInput
              label="Sito Web"
              value={website}
              onChangeText={setWebsite}
              placeholder="https://www.tuocircolo.it"
              keyboardType="url"
            />
          </Card>

          <Button
            title="Salva Modifiche"
            onPress={handleSave}
            loading={isSaving}
            fullWidth
            size="large"
            style={styles.saveButton}
          />

          {/* Danger Zone - Delete Account */}
          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>Zona Pericolosa</Text>
            <Text style={styles.dangerZoneDescription}>
              L'eliminazione dell'account è permanente. Tutti i dati del circolo e le partite associate verranno rimossi.
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
                <Ionicons name="business-outline" size={16} color={COLORS.error} />
                <Text style={styles.modalInfoText}>Il tuo circolo verrà disattivato</Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.error} />
                <Text style={styles.modalInfoText}>Le partite future verranno cancellate</Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="person-remove-outline" size={16} color={COLORS.error} />
                <Text style={styles.modalInfoText}>Il tuo account verrà eliminato</Text>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  photoCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  photoContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    overflow: 'hidden',
  },
  clubPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  uploadingText: {
    fontSize: 14,
    color: COLORS.secondary,
    marginTop: 8,
  },
  photoEditBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  formCard: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
  },
  // Danger Zone Styles
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
