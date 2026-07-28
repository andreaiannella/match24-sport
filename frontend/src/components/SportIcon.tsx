// Sport Icon Component - Consistent sport icons throughout the app
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Ellipse } from 'react-native-svg';
import { COLORS } from '../utils/constants';

interface SportIconProps {
  sport: 'padel' | 'tennis' | 'calcetto' | 'calcio8';
  size?: number;
  color?: string;
  withBackground?: boolean;
}

// Custom SVG icons for each sport
const PadelIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Padel racket shape */}
    <Path
      d="M12 2C8.5 2 5.5 4.5 5.5 8.5C5.5 11 6.5 13 8 14.5L6 22L12 19L18 22L16 14.5C17.5 13 18.5 11 18.5 8.5C18.5 4.5 15.5 2 12 2Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Holes in the racket */}
    <Circle cx="10" cy="7" r="1" fill={color} />
    <Circle cx="14" cy="7" r="1" fill={color} />
    <Circle cx="12" cy="10" r="1" fill={color} />
    <Circle cx="10" cy="10" r="1" fill={color} />
    <Circle cx="14" cy="10" r="1" fill={color} />
  </Svg>
);

const TennisIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Tennis ball with seams */}
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
    {/* Left curve */}
    <Path
      d="M8 4C6 7 6 17 8 20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    {/* Right curve */}
    <Path
      d="M16 4C18 7 18 17 16 20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const CalcettoIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Soccer ball */}
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
    {/* Pentagon in center */}
    <Path
      d="M12 7L14.5 9L13.5 12L10.5 12L9.5 9L12 7Z"
      fill={color}
    />
    {/* Hexagon patterns */}
    <Path
      d="M12 3V7M12 17V21M3 12H7M17 12H21M5 5L9.5 9M14.5 9L19 5M5 19L10.5 12M13.5 12L19 19"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

const Calcio8Icon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Soccer ball with 8 */}
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
    {/* Number 8 inside */}
    <Path
      d="M12 7C10.5 7 9.5 7.8 9.5 9C9.5 10 10.2 10.6 11 10.8C10 11.1 9 11.8 9 13C9 14.5 10.3 15.5 12 15.5C13.7 15.5 15 14.5 15 13C15 11.8 14 11.1 13 10.8C13.8 10.6 14.5 10 14.5 9C14.5 7.8 13.5 7 12 7Z"
      stroke={color}
      strokeWidth={1.5}
      fill="none"
    />
    <Circle cx="12" cy="9" r="1.5" stroke={color} strokeWidth={1} />
    <Circle cx="12" cy="13" r="2" stroke={color} strokeWidth={1} />
  </Svg>
);

export function SportIcon({ sport, size = 24, color, withBackground = false }: SportIconProps) {
  const sportColors: Record<string, string> = {
    padel: COLORS.padel,
    tennis: COLORS.tennis,
    calcetto: COLORS.calcetto,
    calcio8: COLORS.calcio8,
  };

  const iconColor = color || sportColors[sport] || COLORS.primary;

  const renderIcon = () => {
    switch (sport) {
      case 'padel':
        return <PadelIcon size={size} color={iconColor} />;
      case 'tennis':
        return <TennisIcon size={size} color={iconColor} />;
      case 'calcetto':
        return <CalcettoIcon size={size} color={iconColor} />;
      case 'calcio8':
        return <Calcio8Icon size={size} color={iconColor} />;
      default:
        return <TennisIcon size={size} color={iconColor} />;
    }
  };

  if (withBackground) {
    return (
      <View style={[
        styles.iconBackground,
        {
          width: size * 1.8,
          height: size * 1.8,
          borderRadius: size * 0.9,
          backgroundColor: iconColor + '20',
        }
      ]}>
        {renderIcon()}
      </View>
    );
  }

  return renderIcon();
}

// Get sport color helper
export function getSportColor(sport: string): string {
  const colors: Record<string, string> = {
    padel: COLORS.padel,
    tennis: COLORS.tennis,
    calcetto: COLORS.calcetto,
    calcio8: COLORS.calcio8,
  };
  return colors[sport] || COLORS.primary;
}

// Get sport name helper
export function getSportName(sport: string): string {
  const names: Record<string, string> = {
    padel: 'Padel',
    tennis: 'Tennis',
    calcetto: 'Calcetto',
    calcio8: 'Calcio a 8',
  };
  return names[sport] || sport;
}

const styles = StyleSheet.create({
  iconBackground: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
