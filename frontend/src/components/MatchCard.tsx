// Match Card Component - Stable Version
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { SportBadge } from './SportBadge';
import { COLORS } from '../utils/constants';
import { Match } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { format, parseISO } from 'date-fns';
import { it, es, fr, enUS } from 'date-fns/locale';

interface MatchCardProps {
  match: Match;
  onPress: () => void;
}

export function MatchCard({ match, onPress }: MatchCardProps) {
  const { t, language } = useLanguage();

  const getLocale = () => {
    switch (language) {
      case 'es': return es;
      case 'fr': return fr;
      case 'en': return enUS;
      default: return it;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, 'EEE d MMM', { locale: getLocale() });
    } catch {
      return dateStr;
    }
  };

  const spotsLeft = match.max_players - match.current_players;
  const isFull = spotsLeft <= 0;

  const getStatusColor = () => {
    switch (match.status) {
      case 'full': return COLORS.warning;
      case 'completed': return COLORS.textMuted;
      case 'cancelled': return COLORS.error;
      default: return COLORS.success;
    }
  };

  const getLevelLabel = () => {
    switch (match.skill_level) {
      case 'beginner': return t('beginner');
      case 'intermediate': return t('intermediate');
      case 'advanced': return t('advanced');
      default: return t('all_levels');
    }
  };

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <SportBadge sport={match.sport} size="small" />
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {isFull ? t('full') : `${spotsLeft} ${t('spots_available')}`}
          </Text>
        </View>
      </View>

      <View style={styles.clubNameRow}>
        <Text style={styles.clubName}>{match.club_name}</Text>
        {match.club_is_premium ? (
          <Ionicons name="star" size={14} color={COLORS.accent} style={styles.premiumStar} />
        ) : null}
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{formatDate(match.date)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{match.start_time} - {match.end_time}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{match.club_city}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="trophy-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{getLevelLabel()}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.participants}>
          <Ionicons name="people-outline" size={18} color={COLORS.primary} />
          <Text style={styles.participantsText}>
            {match.current_players}/{match.max_players}
          </Text>
        </View>
        <Text style={styles.price}>
          {match.price_per_player > 0
            ? `\u20ac${match.price_per_player.toFixed(2)}`
            : t('free')}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clubName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  clubNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumStar: {
    marginLeft: 6,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
});
