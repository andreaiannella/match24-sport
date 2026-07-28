// Match Sport 24 Types

export interface User {
  user_id: string;
  email: string;
  name: string;
  role: 'player' | 'club_admin' | 'super_admin';
  picture?: string;
  language?: string;
  is_active: boolean;
  created_at: string;
  club_id?: string;
}

export interface PlayerProfile {
  user_id: string;
  nickname?: string;
  city: string;
  preferred_sports: string[];
  bio?: string;
  profile_picture?: string;
  skill_levels: {
    padel: string;
    tennis: string;
    calcetto: string;
    calcio8: string;
  };
}

export interface PlayerRating {
  user_id: string;
  sport: string;
  rating: number;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface Club {
  club_id: string;
  admin_user_id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  photos: string[];
  is_active: boolean;
  subscription_status: 'trial' | 'active' | 'expired';
  subscription_plan?: string;
  subscription_expires_at?: string;
  is_premium?: boolean;
  referral_code?: string;
  referred_players_count?: number;
  courts?: Court[];
  rating_average?: number;
  reviews_count?: number;
}

export interface Court {
  court_id: string;
  club_id: string;
  name: string;
  sport: string;
  available_hours: string[];
  notes?: string;
  is_active: boolean;
  is_indoor: boolean;
}

export interface Match {
  match_id: string;
  club_id: string;
  club_name: string;
  club_city: string;
  sport: string;
  format: string;
  court_id: string;
  court_name: string;
  date: string;
  start_time: string;
  end_time: string;
  max_players: number;
  current_players: number;
  skill_level: string;
  price_per_player: number;
  notes?: string;
  status: 'open' | 'full' | 'completed' | 'cancelled';
  participants?: MatchParticipant[];
  result?: MatchResult;
  club?: Club;
  club_is_premium?: boolean;
}

export interface MatchParticipant {
  match_id: string;
  user_id: string;
  user_name: string;
  joined_at: string;
  status: string;
  user?: User;
  profile?: PlayerProfile;
}

export interface MatchResult {
  result_id: string;
  match_id: string;
  submitted_by: string;
  score_team_a: string;
  score_team_b: string;
  winner_team: 'A' | 'B' | 'draw';
  team_a_players: string[];
  team_b_players: string[];
  status: 'pending_confirmation' | 'confirmed';
  confirmations: string[];
}

export interface ChatMessage {
  message_id: string;
  match_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  match_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface SubscriptionPlan {
  name: string;
  price: number;
  duration_days: number;
}

export interface LocalSponsor {
  sponsor_id: string;
  business_name: string;
  tagline?: string;
  logo_url?: string;
  link_url?: string;
  phone?: string;
  city: string;
  is_active: boolean;
  created_at: string;
}

export type Sport = 'padel' | 'tennis' | 'calcetto';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'all';

export interface Review {
  review_id: string;
  user_id: string;
  user_name: string;
  user_nickname?: string;
  user_profile_picture?: string;
  club_id: string;
  rating: number;
  comment?: string;
  status: 'active' | 'hidden' | 'removed';
  is_reported: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewReport {
  report_id: string;
  review_id: string;
  reported_by: string;
  reason: string;
  created_at: string;
}
