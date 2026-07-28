// Club Detail Screen for Players - with Reviews
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, EmptyState, ListSkeleton } from '../../../src/components';
import { COLORS } from '../../../src/utils/constants';
import { apiClient } from '../../../src/api/client';
import { useAuth } from '../../../src/contexts/AuthContext';
import { lightHaptic, successHaptic, errorHaptic } from '../../../src/utils/haptics';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { GradientBackground } from '../../../src/components';

interface Review {
  review_id: string;
  user_id: string;
  user_name: string;
  user_nickname?: string;
  user_profile_picture?: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

interface Club {
  club_id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  photos?: string[];
  rating_average?: number;
  reviews_count?: number;
  courts?: any[];
}

type SortOption = 'recent' | 'oldest' | 'highest' | 'lowest';

export default function ClubDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [club, setClub] = useState<Club | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  
  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);

  const fetchClubData = useCallback(async () => {
    if (!id) return;
    
    try {
      const [clubData, reviewsData, favStatus] = await Promise.all([
        apiClient.getClub(id),
        apiClient.getClubReviews(id, { sort: sortBy }),
        user?.role === 'player' ? apiClient.checkFavoriteStatus(id) : Promise.resolve({ is_favorite: false }),
      ]);
      
      setClub(clubData);
      setReviews(reviewsData.reviews || []);
      setUserReview(reviewsData.user_review || null);
      setIsFavorite(favStatus.is_favorite);
    } catch (error) {
      console.error('Error fetching club:', error);
      Alert.alert('Errore', 'Impossibile caricare i dettagli del circolo');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id, sortBy, user]);

  useEffect(() => {
    fetchClubData();
  }, [fetchClubData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClubData();
  };

  const handleToggleFavorite = async () => {
    if (!club || user?.role !== 'player') return;
    
    lightHaptic();
    try {
      if (isFavorite) {
        await apiClient.removeFavoriteClub(club.club_id);
      } else {
        await apiClient.addFavoriteClub(club.club_id);
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleCall = () => {
    if (club?.phone) {
      Linking.openURL(`tel:${club.phone}`);
    }
  };

  const handleEmail = () => {
    if (club?.email) {
      Linking.openURL(`mailto:${club.email}`);
    }
  };

  const handleWebsite = () => {
    if (club?.website) {
      Linking.openURL(club.website.startsWith('http') ? club.website : `https://${club.website}`);
    }
  };

  // Review functions
  const openReviewModal = (editMode: boolean = false) => {
    if (!user) {
      Alert.alert('Accedi', 'Devi effettuare il login per lasciare una recensione');
      return;
    }
    
    if (editMode && userReview) {
      setReviewRating(userReview.rating);
      setReviewComment(userReview.comment || '');
      setIsEditMode(true);
    } else {
      setReviewRating(5);
      setReviewComment('');
      setIsEditMode(false);
    }
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!club) return;
    
    setIsSubmitting(true);
    try {
      if (isEditMode && userReview) {
        const result = await apiClient.updateReview(userReview.review_id, {
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        });
        setUserReview(result.review);
        successHaptic();
        Alert.alert('Successo', 'Recensione aggiornata!');
      } else {
        const result = await apiClient.createReview(club.club_id, {
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        });
        setUserReview(result.review);
        successHaptic();
        Alert.alert('Grazie!', 'La tua recensione è stata pubblicata');
      }
      
      setShowReviewModal(false);
      fetchClubData(); // Refresh to update ratings
    } catch (error: any) {
      errorHaptic();
      const message = error.response?.data?.detail || 'Errore durante l\'invio della recensione';
      Alert.alert('Errore', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = () => {
    if (!userReview) return;
    
    Alert.alert(
      'Elimina recensione',
      'Sei sicuro di voler eliminare la tua recensione?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deleteReview(userReview.review_id);
              setUserReview(null);
              successHaptic();
              fetchClubData();
            } catch (error) {
              errorHaptic();
              Alert.alert('Errore', 'Impossibile eliminare la recensione');
            }
          },
        },
      ]
    );
  };

  const openReportModal = (reviewId: string) => {
    setReportingReviewId(reviewId);
    setReportReason('');
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!reportingReviewId || reportReason.trim().length < 5) {
      Alert.alert('Errore', 'Inserisci un motivo valido (minimo 5 caratteri)');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await apiClient.reportReview(reportingReviewId, reportReason.trim());
      successHaptic();
      Alert.alert('Grazie', 'Segnalazione inviata. Esamineremo la recensione.');
      setShowReportModal(false);
    } catch (error: any) {
      errorHaptic();
      const message = error.response?.data?.detail || 'Errore durante l\'invio della segnalazione';
      Alert.alert('Errore', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, size: number = 16, interactive: boolean = false) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          disabled={!interactive}
          onPress={() => interactive && setReviewRating(i)}
          style={interactive ? styles.starButton : undefined}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={size}
            color={i <= rating ? COLORS.primary : COLORS.textMuted}
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderSortButton = (option: SortOption, label: string) => (
    <TouchableOpacity
      style={[styles.sortButton, sortBy === option && styles.sortButtonActive]}
      onPress={() => setSortBy(option)}
    >
      <Text style={[styles.sortButtonText, sortBy === option && styles.sortButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dettaglio Circolo</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.scrollContent}>
          <ListSkeleton count={4} />
        </View>
      </SafeAreaView>
    </GradientBackground>
    );
  }

  if (!club) {
    return (
      <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Circolo non trovato</Text>
          <View style={{ width: 44 }} />
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Circolo non trovato"
          message="Il circolo richiesto non esiste o non è più disponibile"
          actionLabel="Torna indietro"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{club.name}</Text>
        {user?.role === 'player' && (
          <TouchableOpacity style={styles.favoriteButton} onPress={handleToggleFavorite}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? COLORS.error : COLORS.text}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />
        }
      >
        {/* Club Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.clubHeader}>
            <View style={styles.clubIcon}>
              <Ionicons name="business" size={32} color={COLORS.secondary} />
            </View>
            <View style={styles.clubMainInfo}>
              <Text style={styles.clubName}>{club.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color={COLORS.textMuted} />
                <Text style={styles.clubCity}>{club.city}</Text>
              </View>
              {/* Rating Display */}
              <View style={styles.ratingRow}>
                {renderStars(Math.round(club.rating_average || 0))}
                <Text style={styles.ratingText}>
                  {club.rating_average ? club.rating_average.toFixed(1) : '0.0'}
                </Text>
                <Text style={styles.reviewsCountText}>
                  ({club.reviews_count || 0} recensioni)
                </Text>
              </View>
            </View>
          </View>

          {club.description && (
            <Text style={styles.description}>{club.description}</Text>
          )}

          <Text style={styles.address}>
            <Ionicons name="navigate" size={14} color={COLORS.textMuted} /> {club.address}
          </Text>

          {/* Contact Buttons */}
          <View style={styles.contactButtons}>
            {club.phone && (
              <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
                <Ionicons name="call" size={20} color={COLORS.secondary} />
                <Text style={styles.contactButtonText}>Chiama</Text>
              </TouchableOpacity>
            )}
            {club.email && (
              <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
                <Ionicons name="mail" size={20} color={COLORS.secondary} />
                <Text style={styles.contactButtonText}>Email</Text>
              </TouchableOpacity>
            )}
            {club.website && (
              <TouchableOpacity style={styles.contactButton} onPress={handleWebsite}>
                <Ionicons name="globe" size={20} color={COLORS.secondary} />
                <Text style={styles.contactButtonText}>Sito</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* Courts Section */}
        {club.courts && club.courts.length > 0 && (
          <Card style={styles.courtsCard}>
            <Text style={styles.sectionTitle}>Campi Disponibili</Text>
            <View style={styles.courtsList}>
              {club.courts.map((court, index) => (
                <View key={court.court_id || index} style={styles.courtItem}>
                  <Ionicons name="tennisball" size={16} color={COLORS.secondary} />
                  <Text style={styles.courtName}>{court.name}</Text>
                  <Text style={styles.courtSport}>{court.sport}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Recensioni</Text>
            {!userReview && user?.role === 'player' && (
              <TouchableOpacity
                style={styles.writeReviewButton}
                onPress={() => openReviewModal(false)}
              >
                <Ionicons name="create-outline" size={18} color={COLORS.secondary} />
                <Text style={styles.writeReviewText}>Scrivi</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Sort Options */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sortContainer}
            contentContainerStyle={styles.sortContent}
          >
            {renderSortButton('recent', 'Più recenti')}
            {renderSortButton('oldest', 'Meno recenti')}
            {renderSortButton('highest', 'Voto più alto')}
            {renderSortButton('lowest', 'Voto più basso')}
          </ScrollView>

          {/* User's Review (if exists) */}
          {userReview && (
            <Card style={[styles.reviewCard, styles.userReviewCard]}>
              <View style={styles.userReviewBadge}>
                <Text style={styles.userReviewBadgeText}>La tua recensione</Text>
              </View>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewUserInfo}>
                  <View style={styles.reviewAvatar}>
                    <Ionicons name="person" size={20} color={COLORS.secondary} />
                  </View>
                  <View>
                    <Text style={styles.reviewUserName}>{userReview.user_name}</Text>
                    <Text style={styles.reviewDate}>
                      {format(parseISO(userReview.created_at), 'd MMM yyyy', { locale: it })}
                    </Text>
                  </View>
                </View>
                {renderStars(userReview.rating)}
              </View>
              {userReview.comment && (
                <Text style={styles.reviewComment}>{userReview.comment}</Text>
              )}
              <View style={styles.userReviewActions}>
                <TouchableOpacity
                  style={styles.userReviewActionButton}
                  onPress={() => openReviewModal(true)}
                >
                  <Ionicons name="pencil" size={16} color={COLORS.accent} />
                  <Text style={styles.userReviewActionText}>Modifica</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.userReviewActionButton}
                  onPress={handleDeleteReview}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  <Text style={[styles.userReviewActionText, { color: COLORS.error }]}>Elimina</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {/* Reviews List */}
          {reviews.filter(r => r.review_id !== userReview?.review_id).length > 0 ? (
            reviews
              .filter(r => r.review_id !== userReview?.review_id)
              .map((review) => (
                <Card key={review.review_id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUserInfo}>
                      <View style={styles.reviewAvatar}>
                        <Ionicons name="person" size={20} color={COLORS.textMuted} />
                      </View>
                      <View>
                        <Text style={styles.reviewUserName}>
                          {review.user_nickname || review.user_name}
                        </Text>
                        <Text style={styles.reviewDate}>
                          {format(parseISO(review.created_at), 'd MMM yyyy', { locale: it })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reviewHeaderRight}>
                      {renderStars(review.rating)}
                      {user && review.user_id !== user.user_id && (
                        <TouchableOpacity
                          style={styles.reportButton}
                          onPress={() => openReportModal(review.review_id)}
                        >
                          <Ionicons name="flag-outline" size={14} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                </Card>
              ))
          ) : !userReview ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="Nessuna recensione"
              message="Sii il primo a lasciare una recensione per questo circolo!"
              actionLabel="Scrivi recensione"
              onAction={() => openReviewModal(false)}
            />
          ) : null}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditMode ? 'Modifica recensione' : 'Scrivi una recensione'}
              </Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Il tuo voto</Text>
            <View style={styles.ratingSelector}>
              {renderStars(reviewRating, 36, true)}
            </View>

            <Text style={styles.modalLabel}>Commento (opzionale)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Condividi la tua esperienza..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={500}
              value={reviewComment}
              onChangeText={setReviewComment}
            />
            <Text style={styles.charCount}>{reviewComment.length}/500</Text>

            <Button
              title={isSubmitting ? 'Invio...' : (isEditMode ? 'Aggiorna' : 'Pubblica')}
              onPress={handleSubmitReview}
              loading={isSubmitting}
              disabled={isSubmitting}
              fullWidth
              style={styles.submitButton}
            />
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Segnala recensione</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Motivo della segnalazione</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Descrivi il motivo della segnalazione..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={200}
              value={reportReason}
              onChangeText={setReportReason}
            />
            <Text style={styles.charCount}>{reportReason.length}/200</Text>

            <Button
              title={isSubmitting ? 'Invio...' : 'Invia segnalazione'}
              onPress={handleSubmitReport}
              loading={isSubmitting}
              disabled={isSubmitting || reportReason.trim().length < 5}
              fullWidth
              style={styles.submitButton}
            />
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  infoCard: {
    marginBottom: 16,
  },
  clubHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  clubIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubMainInfo: {
    flex: 1,
    marginLeft: 16,
  },
  clubName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  clubCity: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  reviewsCountText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  address: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.secondary + '15',
    borderRadius: 10,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  courtsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  courtsList: {
    gap: 8,
  },
  courtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  courtName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  courtSport: {
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'capitalize',
  },
  reviewsSection: {
    marginTop: 8,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.secondary + '15',
    borderRadius: 8,
  },
  writeReviewText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  sortContainer: {
    marginBottom: 16,
  },
  sortContent: {
    gap: 8,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortButtonActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  sortButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sortButtonTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },
  reviewCard: {
    marginBottom: 12,
  },
  userReviewCard: {
    borderWidth: 2,
    borderColor: COLORS.secondary + '40',
  },
  userReviewBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userReviewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.background,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  reviewHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  reportButton: {
    padding: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  userReviewActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  userReviewActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userReviewActionText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  ratingSelector: {
    alignItems: 'center',
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  commentInput: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
  },
});
