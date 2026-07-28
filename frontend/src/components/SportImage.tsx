// Sport Image Component - Custom sport icons used throughout the app
import React from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { COLORS } from '../utils/constants';

// Icone sport locali (require statico, richiesto da React Native) - non più dipendenti
// da un URL remoto ospitato da Emergent.
export const SPORT_ICON_ASSETS: Record<string, any> = {
  padel: require('../../assets/images/sport-padel.png'),
  tennis: require('../../assets/images/sport-tennis.png'),
  calcetto: require('../../assets/images/sport-calcetto.png'),
  calcio8: require('../../assets/images/sport-calcio8.png'),
};

// Sport names
export const SPORT_NAMES: Record<string, string> = {
  padel: 'Padel',
  tennis: 'Tennis',
  calcetto: 'Calcetto',
  calcio8: 'Calcio a 8',
};

// Sport colors
export const SPORT_COLORS: Record<string, string> = {
  padel: COLORS.padel,
  tennis: COLORS.tennis,
  calcetto: COLORS.calcetto,
  calcio8: COLORS.calcio8,
};

interface SportImageProps {
  sport: string;
  size?: number;
  showLabel?: boolean;
  style?: object;
}

export function SportImage({ sport, size = 32, showLabel = false, style }: SportImageProps) {
  const iconSource = SPORT_ICON_ASSETS[sport] || SPORT_ICON_ASSETS.padel;
  const sportName = SPORT_NAMES[sport] || sport;
  
  return (
    <View style={[styles.container, style]}>
      <Image
        source={iconSource}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      {showLabel && (
        <Text style={[styles.label, { fontSize: size * 0.35 }]}>{sportName}</Text>
      )}
    </View>
  );
}

// Sport Badge with background - replacement for SportBadge component
interface SportBadgeNewProps {
  sport: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export function SportBadgeNew({ sport, size = 'medium', showLabel = true }: SportBadgeNewProps) {
  const sizes = {
    small: { icon: 20, padding: 6, fontSize: 10 },
    medium: { icon: 28, padding: 8, fontSize: 12 },
    large: { icon: 40, padding: 12, fontSize: 14 },
  };
  
  const { icon, padding, fontSize } = sizes[size];
  const sportColor = SPORT_COLORS[sport] || COLORS.primary;
  const sportName = SPORT_NAMES[sport] || sport;
  const iconSource = SPORT_ICON_ASSETS[sport] || SPORT_ICON_ASSETS.padel;
  
  return (
    <View style={[
      styles.badge,
      { 
        backgroundColor: sportColor + '20',
        paddingHorizontal: padding * 1.5,
        paddingVertical: padding,
        borderColor: sportColor + '40',
      }
    ]}>
      <Image
        source={iconSource}
        style={{ width: icon, height: icon }}
        resizeMode="contain"
      />
      {showLabel && (
        <Text style={[styles.badgeLabel, { fontSize, color: sportColor }]}>
          {sportName}
        </Text>
      )}
    </View>
  );
}

// Get sport icon source helper (uso locale, non più un URL)
export function getSportIconSource(sport: string): any {
  return SPORT_ICON_ASSETS[sport] || SPORT_ICON_ASSETS.padel;
}

// Get sport name helper
export function getSportName(sport: string): string {
  return SPORT_NAMES[sport] || sport;
}

// Get sport color helper
export function getSportColor(sport: string): string {
  return SPORT_COLORS[sport] || COLORS.primary;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  badgeLabel: {
    fontWeight: '700',
  },
});
