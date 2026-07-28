// Sponsor Banner - shows active local sponsors for a city (sold directly, not a network)
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS } from '../utils/constants';
import { apiClient } from '../api/client';
import { LocalSponsor } from '../types';

interface SponsorBannerProps {
  city?: string | null;
}

export function SponsorBanner({ city }: SponsorBannerProps) {
  const [sponsors, setSponsors] = useState<LocalSponsor[]>([]);

  useEffect(() => {
    if (!city) {
      setSponsors([]);
      return;
    }
    let cancelled = false;
    apiClient.getActiveSponsors(city)
      .then((data) => {
        if (!cancelled) setSponsors(data);
      })
      .catch(() => {
        // Silently skip - a missing sponsor banner should never block the screen
        if (!cancelled) setSponsors([]);
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  if (sponsors.length === 0) {
    return null;
  }

  const handlePress = (sponsor: LocalSponsor) => {
    if (sponsor.link_url) {
      const url = sponsor.link_url.startsWith('http') ? sponsor.link_url : `https://${sponsor.link_url}`;
      Linking.openURL(url).catch(() => {});
    } else if (sponsor.phone) {
      Linking.openURL(`tel:${sponsor.phone}`).catch(() => {});
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {sponsors.map((sponsor) => (
        <TouchableOpacity
          key={sponsor.sponsor_id}
          style={styles.card}
          onPress={() => handlePress(sponsor)}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="storefront-outline" size={16} color={COLORS.accent} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.sponsorLabel}>Sponsorizzato</Text>
            <Text style={styles.businessName} numberOfLines={1}>{sponsor.business_name}</Text>
            {sponsor.tagline ? (
              <Text style={styles.tagline} numberOfLines={1}>{sponsor.tagline}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 220,
    maxWidth: 260,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  sponsorLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 1,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
});
