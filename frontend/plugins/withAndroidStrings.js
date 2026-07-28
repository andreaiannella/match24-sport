// Plugin to add ALL missing Android string resources
// Fixes [ExtraTranslation] lint errors
const { withStringsXml } = require('expo/config-plugins');

const withAndroidStrings = (config) => {
  return withStringsXml(config, (config) => {
    // ALL required strings with English fallback values
    const stringsToAdd = [
      // System strings
      { name: 'app_name', value: 'Match Sport 24' },
      { name: 'expo_splash_screen_status_bar_translucent', value: 'true', translatable: 'false' },
      { name: 'expo_system_ui_status_bar_translucent', value: 'true', translatable: 'false' },
      
      // Common UI strings
      { name: 'cancel', value: 'Cancel' },
      { name: 'ok', value: 'OK' },
      { name: 'error', value: 'Error' },
      { name: 'loading', value: 'Loading...' },
      { name: 'retry', value: 'Retry' },
      { name: 'submit', value: 'Submit' },
      { name: 'save', value: 'Save' },
      { name: 'delete', value: 'Delete' },
      { name: 'edit', value: 'Edit' },
      { name: 'close', value: 'Close' },
      { name: 'back', value: 'Back' },
      { name: 'next', value: 'Next' },
      { name: 'done', value: 'Done' },
      { name: 'search', value: 'Search' },
      { name: 'settings', value: 'Settings' },
      { name: 'profile', value: 'Profile' },
      { name: 'home', value: 'Home' },
      { name: 'login', value: 'Login' },
      { name: 'logout', value: 'Logout' },
      { name: 'register', value: 'Register' },
      { name: 'confirm', value: 'Confirm' },
      { name: 'success', value: 'Success' },
      { name: 'no_results', value: 'No results' },
      { name: 'try_again', value: 'Try again' },
      
      // Auth strings (from lint error)
      { name: 'email', value: 'Email' },
      { name: 'password', value: 'Password' },
      { name: 'name', value: 'Name' },
      { name: 'nickname', value: 'Nickname' },
      { name: 'welcome', value: 'Welcome' },
      { name: 'register_as_player', value: 'Register as Player' },
      { name: 'register_as_club', value: 'Register as Club' },
      { name: 'have_account', value: 'Already have an account?' },
      { name: 'no_account', value: 'Don\'t have an account?' },
      { name: 'forgot_password', value: 'Forgot password?' },
      
      // Profile strings (from lint error)
      { name: 'city', value: 'City' },
      { name: 'preferred_sports', value: 'Preferred Sports' },
      { name: 'notifications', value: 'Notifications' },
      { name: 'language', value: 'Language' },
      { name: 'about', value: 'About' },
      { name: 'privacy', value: 'Privacy' },
      { name: 'terms', value: 'Terms' },
      { name: 'contact', value: 'Contact' },
      { name: 'support', value: 'Support' },
      { name: 'version', value: 'Version' },
      
      // Sports (from lint error)
      { name: 'padel', value: 'Padel' },
      { name: 'tennis', value: 'Tennis' },
      { name: 'calcetto', value: 'Calcetto' },
      { name: 'calcio8', value: 'Calcio a 8' },
      { name: 'sport', value: 'Sport' },
      
      // Match strings (from lint error)
      { name: 'match', value: 'Match' },
      { name: 'matches', value: 'Matches' },
      { name: 'create_match', value: 'Create Match' },
      { name: 'join_match', value: 'Join Match' },
      { name: 'leave_match', value: 'Leave Match' },
      { name: 'match_details', value: 'Match Details' },
      { name: 'players', value: 'Players' },
      { name: 'players_count', value: 'Players Count' },
      { name: 'date', value: 'Date' },
      { name: 'time', value: 'Time' },
      { name: 'price', value: 'Price' },
      
      // Skill levels (from lint error)
      { name: 'level', value: 'Level' },
      { name: 'beginner', value: 'Beginner' },
      { name: 'intermediate', value: 'Intermediate' },
      { name: 'advanced', value: 'Advanced' },
      { name: 'all_levels', value: 'All Levels' },
      
      // Clubs
      { name: 'club', value: 'Club' },
      { name: 'clubs', value: 'Clubs' },
      { name: 'my_club', value: 'My Club' },
      
      // Reviews
      { name: 'reviews', value: 'Reviews' },
      { name: 'write_review', value: 'Write a Review' },
      { name: 'rating', value: 'Rating' },
      
      // Subscription
      { name: 'subscription_monthly_title', value: 'Monthly Subscription' },
      { name: 'subscription_monthly_description', value: 'Full access to Match Sport 24 platform' },
      { name: 'subscription_price', value: '€49.99/month' },
    ];

    // Initialize string array if not exists
    if (!config.modResults.resources.string) {
      config.modResults.resources.string = [];
    }
    
    const existingStrings = config.modResults.resources.string;
    
    // Add each string if it doesn't already exist
    stringsToAdd.forEach(({ name, value, translatable }) => {
      const existingIndex = existingStrings.findIndex(
        (s) => s && s.$ && s.$.name === name
      );
      
      const stringEntry = {
        $: { name },
        _: value,
      };
      
      if (translatable === 'false') {
        stringEntry.$.translatable = 'false';
      }
      
      if (existingIndex === -1) {
        existingStrings.push(stringEntry);
      } else {
        // Update existing entry
        existingStrings[existingIndex] = stringEntry;
      }
    });

    config.modResults.resources.string = existingStrings;
    
    return config;
  });
};

module.exports = withAndroidStrings;
