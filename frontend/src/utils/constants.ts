// Match Sport 24 Constants - "Notturna" Theme
// Design rationale: grounded in the actual sensory world of the product - evening pick-up
// games (padel, tennis, calcetto, calcio a 8) played at clubs after work, under warm floodlights,
// on synthetic turf and clay/hard courts. Background reads as "night pitch" (deep charcoal-green,
// not generic navy-tech-dark). Primary is a floodlight gold - amber/orange consistently tests as
// the strongest CTA hue in 2026 UX research (energy + friendliness, faster click decisions than
// cool tones) without red's aggression, which doesn't fit a friendly community/leisure app.
// Secondary is a court-surface teal (padel/hard-court blue-green), carrying the "trust" role blue
// usually plays. Deliberately NOT the dark-navy-plus-neon-green combo of the category leader
// (Playtomic), and NOT the warm-cream/terracotta AI-default pairing - this is a distinct identity.

// Tipografia - Rubik, caricato in app/_layout.tsx via useFonts.
// Titoli: Bold / Sottotitoli: SemiBold / Pulsanti: SemiBold / Testi: Regular / Etichette: Medium
export const FONTS = {
  title: 'Rubik_700Bold',
  subtitle: 'Rubik_600SemiBold',
  button: 'Rubik_600SemiBold',
  body: 'Rubik_400Regular',
  label: 'Rubik_500Medium',
};

export const COLORS = {
  // Primary - Floodlight gold (CTAs, active states, brand identity)
  primary: '#FFB020',
  primaryDark: '#E89A0C',
  primaryLight: '#FFC85C',

  // Secondary - Court teal (trust, links, club/booking elements)
  secondary: '#14B8A6',
  secondaryDark: '#0E9488',
  secondaryLight: '#5EEAD4',

  // Accent - Sunset coral (premium badges, ratings, "in evidenza")
  accent: '#FF7A45',
  accentDark: '#E6632E',
  accentLight: '#FF9A6E',

  // Background - Night pitch: deep charcoal with a green undertone, not navy
  background: '#0D1410',
  surface: '#16211A',
  surfaceLight: '#1E2E24',
  surfaceElevated: '#263B2E',

  // Text hierarchy - warm off-white, sage-tinted greys (matches the green undertone)
  text: '#F5F7F5',
  textSecondary: '#A8B5AC',
  textMuted: '#6B7A70',

  // Status colors
  success: '#34D399',
  warning: '#FF8A3D',
  error: '#FF5470',
  info: '#2DD4C4',

  // Borders & dividers
  border: '#26362C',
  divider: '#1E2E24',

  // Glass effect
  glass: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',

  // Sport colors - each grounded in a real court/pitch material
  padel: '#22D3C4',   // padel court blue-teal
  tennis: '#D2492E',  // terra rossa clay court
  calcetto: '#4ADE80', // synthetic turf green
  calcio8: '#A78BFA',  // violet - the night-lights note
};

export const SPORTS = [
  { id: 'padel', name: 'Padel', icon: 'tennisball', color: COLORS.padel },
  { id: 'tennis', name: 'Tennis', icon: 'tennisball', color: COLORS.tennis },
  { id: 'calcetto', name: 'Calcetto', icon: 'football', color: COLORS.calcetto },
  { id: 'calcio8', name: 'Calcio a 8', icon: 'football', color: COLORS.calcio8 },
];

export const SKILL_LEVELS = [
  { id: 'beginner', name: 'Principiante' },
  { id: 'intermediate', name: 'Intermedio' },
  { id: 'advanced', name: 'Avanzato' },
  { id: 'all', name: 'Tutti i livelli' },
];

export const MATCH_FORMATS = {
  padel: { minPlayers: 4, maxPlayers: 4 },
  tennis_singles: { minPlayers: 2, maxPlayers: 2 },
  tennis_doubles: { minPlayers: 4, maxPlayers: 4 },
  calcetto: { minPlayers: 10, maxPlayers: 12 },
  calcio8: { minPlayers: 16, maxPlayers: 18 },
};

export const SUBSCRIPTION_PLANS = {
  monthly: { name: 'Mensile', price: 49.99, duration: 30 },
  yearly: { name: 'Annuale', price: 399.99, duration: 365 },
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
