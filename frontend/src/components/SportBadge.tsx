// Sport Badge Component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPORTS } from '../utils/constants';

interface SportBadgeProps {
  sport: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export function SportBadge({ sport, size = 'medium', showLabel = true }: SportBadgeProps) {
  const sportData = SPORTS.find((s) => s.id === sport) || SPORTS[0];

  const getSize = () => {
    switch (size) {
      case 'small':
        return { padding: 6, iconSize: 14, fontSize: 12 };
      case 'large':
        return { padding: 12, iconSize: 24, fontSize: 16 };
      default:
        return { padding: 8, iconSize: 18, fontSize: 14 };
    }
  };

  const sizeConfig = getSize();

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (sport) {
      case 'calcetto':
      case 'calcio8':
        return 'football-outline';
      case 'tennis':
      case 'padel':
      default:
        return 'tennisball-outline';
    }
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: sportData.color + '20',
          paddingVertical: sizeConfig.padding,
          paddingHorizontal: sizeConfig.padding * 1.5,
        },
      ]}
    >
      <Ionicons
        name={getIcon()}
        size={sizeConfig.iconSize}
        color={sportData.color}
      />
      {showLabel && (
        <Text
          style={[
            styles.label,
            { color: sportData.color, fontSize: sizeConfig.fontSize },
          ]}
        >
          {sportData.name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
    marginLeft: 6,
  },
});
