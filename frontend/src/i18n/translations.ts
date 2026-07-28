// Multi-language translations for Match Sport 24

export type Language = 'it' | 'en' | 'es' | 'fr';

export const translations: Record<Language, Record<string, string>> = {
  it: {
    // General
    app_name: 'Match Sport 24',
    welcome: 'Benvenuto',
    loading: 'Caricamento...',
    error: 'Errore',
    success: 'Successo',
    cancel: 'Annulla',
    save: 'Salva',
    confirm: 'Conferma',
    delete: 'Elimina',
    edit: 'Modifica',
    search: 'Cerca',
    filter: 'Filtra',
    all: 'Tutti',
    none: 'Nessuno',
    back: 'Indietro',
    next: 'Avanti',
    close: 'Chiudi',
    
    // Auth
    login: 'Accedi',
    logout: 'Esci',
    register: 'Registrati',
    email: 'Email',
    password: 'Password',
    name: 'Nome',
    forgot_password: 'Password dimenticata?',
    login_with_google: 'Accedi con Google',
    or: 'oppure',
    no_account: 'Non hai un account?',
    have_account: 'Hai già un account?',
    
    // Roles
    player: 'Giocatore',
    club_admin: 'Gestore Circolo',
    register_as_player: 'Registrati come Giocatore',
    register_as_club: 'Registra il tuo Circolo',
    
    // Navigation
    home: 'Home',
    matches: 'Partite',
    profile: 'Profilo',
    dashboard: 'Dashboard',
    settings: 'Impostazioni',
    notifications: 'Notifiche',
    
    // Sports
    padel: 'Padel',
    tennis: 'Tennis',
    calcetto: 'Calcetto',
    calcio8: 'Calcio a 8',
    sport: 'Sport',
    sports: 'Sport',
    
    // Match
    find_match: 'Trova Partita',
    create_match: 'Crea Partita',
    match_detail: 'Dettaglio Partita',
    join_match: 'Iscriviti',
    leave_match: 'Cancella iscrizione',
    match_full: 'Partita al completo',
    spots_available: 'posti disponibili',
    date: 'Data',
    time: 'Orario',
    level: 'Livello',
    price: 'Prezzo',
    free: 'Gratuito',
    payment_on_site: 'Pagamento in struttura',
    participants: 'Partecipanti',
    
    // Levels
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzato',
    all_levels: 'Tutti i livelli',
    
    // Status
    open: 'Aperta',
    full: 'Completa',
    completed: 'Completata',
    cancelled: 'Annullata',
    
    // Player
    my_matches: 'Le mie partite',
    match_history: 'Storico Partite',
    statistics: 'Statistiche',
    rating: 'Rating',
    wins: 'Vittorie',
    losses: 'Sconfitte',
    draws: 'Pareggi',
    matches_played: 'Partite giocate',
    city: 'Città',
    nickname: 'Nickname',
    bio: 'Bio',
    preferred_sports: 'Sport preferiti',
    
    // Club
    my_club: 'Il mio Circolo',
    club_name: 'Nome Circolo',
    club_description: 'Descrizione',
    club_address: 'Indirizzo',
    club_phone: 'Telefono',
    courts: 'Campi',
    add_court: 'Aggiungi Campo',
    bookings: 'Prenotazioni',
    calendar: 'Calendario',
    subscription: 'Abbonamento',
    
    // Chat
    chat: 'Chat',
    send_message: 'Invia messaggio',
    type_message: 'Scrivi un messaggio...',
    chat_unavailable: 'Chat non disponibile',
    
    // Results
    result: 'Risultato',
    submit_result: 'Inserisci Risultato',
    confirm_result: 'Conferma Risultato',
    pending_confirmation: 'In attesa di conferma',
    result_confirmed: 'Risultato confermato',
    team_a: 'Squadra A',
    team_b: 'Squadra B',
    winner: 'Vincitore',
    score: 'Punteggio',
    draw: 'Pareggio',
    
    // Subscription
    pricing: 'Piani e Prezzi',
    monthly: 'Mensile',
    yearly: 'Annuale',
    subscribe: 'Abbonati',
    subscription_active: 'Abbonamento attivo',
    subscription_expires: 'Scade il',
    trial: 'Prova gratuita',
    per_month: '/mese',
    per_year: '/anno',
    
    // Messages
    booking_confirmed: 'Prenotazione confermata!',
    booking_cancelled: 'Prenotazione cancellata',
    profile_updated: 'Profilo aggiornato',
    match_created: 'Partita creata',
    no_matches_found: 'Nessuna partita trovata',
    no_notifications: 'Nessuna notifica',
  },
  
  en: {
    // General
    app_name: 'Match Sport 24',
    welcome: 'Welcome',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    none: 'None',
    back: 'Back',
    next: 'Next',
    close: 'Close',
    
    // Auth
    login: 'Login',
    logout: 'Logout',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    forgot_password: 'Forgot password?',
    login_with_google: 'Login with Google',
    or: 'or',
    no_account: "Don't have an account?",
    have_account: 'Already have an account?',
    
    // Roles
    player: 'Player',
    club_admin: 'Club Manager',
    register_as_player: 'Register as Player',
    register_as_club: 'Register your Club',
    
    // Navigation
    home: 'Home',
    matches: 'Matches',
    profile: 'Profile',
    dashboard: 'Dashboard',
    settings: 'Settings',
    notifications: 'Notifications',
    
    // Sports
    padel: 'Padel',
    tennis: 'Tennis',
    calcetto: 'Futsal',
    calcio8: '8-a-side Football',
    sport: 'Sport',
    sports: 'Sports',
    
    // Match
    find_match: 'Find Match',
    create_match: 'Create Match',
    match_detail: 'Match Details',
    join_match: 'Join',
    leave_match: 'Leave',
    match_full: 'Match Full',
    spots_available: 'spots available',
    date: 'Date',
    time: 'Time',
    level: 'Level',
    price: 'Price',
    free: 'Free',
    payment_on_site: 'Pay at venue',
    participants: 'Participants',
    
    // Levels
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    all_levels: 'All levels',
    
    // Status
    open: 'Open',
    full: 'Full',
    completed: 'Completed',
    cancelled: 'Cancelled',
    
    // Player
    my_matches: 'My Matches',
    match_history: 'Match History',
    statistics: 'Statistics',
    rating: 'Rating',
    wins: 'Wins',
    losses: 'Losses',
    draws: 'Draws',
    matches_played: 'Matches played',
    city: 'City',
    nickname: 'Nickname',
    bio: 'Bio',
    preferred_sports: 'Preferred sports',
    
    // Club
    my_club: 'My Club',
    club_name: 'Club Name',
    club_description: 'Description',
    club_address: 'Address',
    club_phone: 'Phone',
    courts: 'Courts',
    add_court: 'Add Court',
    bookings: 'Bookings',
    calendar: 'Calendar',
    subscription: 'Subscription',
    
    // Chat
    chat: 'Chat',
    send_message: 'Send message',
    type_message: 'Type a message...',
    chat_unavailable: 'Chat unavailable',
    
    // Results
    result: 'Result',
    submit_result: 'Submit Result',
    confirm_result: 'Confirm Result',
    pending_confirmation: 'Pending confirmation',
    result_confirmed: 'Result confirmed',
    team_a: 'Team A',
    team_b: 'Team B',
    winner: 'Winner',
    score: 'Score',
    draw: 'Draw',
    
    // Subscription
    pricing: 'Plans & Pricing',
    monthly: 'Monthly',
    yearly: 'Yearly',
    subscribe: 'Subscribe',
    subscription_active: 'Active subscription',
    subscription_expires: 'Expires on',
    trial: 'Free trial',
    per_month: '/month',
    per_year: '/year',
    
    // Messages
    booking_confirmed: 'Booking confirmed!',
    booking_cancelled: 'Booking cancelled',
    profile_updated: 'Profile updated',
    match_created: 'Match created',
    no_matches_found: 'No matches found',
    no_notifications: 'No notifications',
  },
  
  es: {
    // General
    app_name: 'Match Sport 24',
    welcome: 'Bienvenido',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    cancel: 'Cancelar',
    save: 'Guardar',
    confirm: 'Confirmar',
    delete: 'Eliminar',
    edit: 'Editar',
    search: 'Buscar',
    filter: 'Filtrar',
    all: 'Todos',
    none: 'Ninguno',
    back: 'Atrás',
    next: 'Siguiente',
    close: 'Cerrar',
    
    // Auth
    login: 'Iniciar sesión',
    logout: 'Cerrar sesión',
    register: 'Registrarse',
    email: 'Email',
    password: 'Contraseña',
    name: 'Nombre',
    forgot_password: '¿Olvidaste tu contraseña?',
    login_with_google: 'Iniciar con Google',
    or: 'o',
    no_account: '¿No tienes cuenta?',
    have_account: '¿Ya tienes cuenta?',
    
    // Roles
    player: 'Jugador',
    club_admin: 'Gestor de Club',
    register_as_player: 'Registrarse como Jugador',
    register_as_club: 'Registra tu Club',
    
    // Navigation
    home: 'Inicio',
    matches: 'Partidos',
    profile: 'Perfil',
    dashboard: 'Panel',
    settings: 'Configuración',
    notifications: 'Notificaciones',
    
    // Sports
    padel: 'Pádel',
    tennis: 'Tenis',
    calcetto: 'Fútbol sala',
    calcio8: 'Fútbol 8',
    sport: 'Deporte',
    sports: 'Deportes',
    
    // Match
    find_match: 'Buscar Partido',
    create_match: 'Crear Partido',
    match_detail: 'Detalle del Partido',
    join_match: 'Unirse',
    leave_match: 'Salir',
    match_full: 'Partido completo',
    spots_available: 'plazas disponibles',
    date: 'Fecha',
    time: 'Hora',
    level: 'Nivel',
    price: 'Precio',
    free: 'Gratis',
    payment_on_site: 'Pago en el club',
    participants: 'Participantes',
    
    // Levels
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
    all_levels: 'Todos los niveles',
    
    // Status
    open: 'Abierto',
    full: 'Completo',
    completed: 'Completado',
    cancelled: 'Cancelado',
    
    // Player
    my_matches: 'Mis partidos',
    match_history: 'Historial',
    statistics: 'Estadísticas',
    rating: 'Rating',
    wins: 'Victorias',
    losses: 'Derrotas',
    draws: 'Empates',
    matches_played: 'Partidos jugados',
    city: 'Ciudad',
    nickname: 'Apodo',
    bio: 'Bio',
    preferred_sports: 'Deportes favoritos',
    
    // Club
    my_club: 'Mi Club',
    club_name: 'Nombre del Club',
    club_description: 'Descripción',
    club_address: 'Dirección',
    club_phone: 'Teléfono',
    courts: 'Pistas',
    add_court: 'Añadir Pista',
    bookings: 'Reservas',
    calendar: 'Calendario',
    subscription: 'Suscripción',
    
    // Chat
    chat: 'Chat',
    send_message: 'Enviar mensaje',
    type_message: 'Escribe un mensaje...',
    chat_unavailable: 'Chat no disponible',
    
    // Results
    result: 'Resultado',
    submit_result: 'Enviar Resultado',
    confirm_result: 'Confirmar Resultado',
    pending_confirmation: 'Pendiente de confirmación',
    result_confirmed: 'Resultado confirmado',
    team_a: 'Equipo A',
    team_b: 'Equipo B',
    winner: 'Ganador',
    score: 'Marcador',
    draw: 'Empate',
    
    // Subscription
    pricing: 'Planes y Precios',
    monthly: 'Mensual',
    yearly: 'Anual',
    subscribe: 'Suscribirse',
    subscription_active: 'Suscripción activa',
    subscription_expires: 'Expira el',
    trial: 'Prueba gratis',
    per_month: '/mes',
    per_year: '/año',
    
    // Messages
    booking_confirmed: '¡Reserva confirmada!',
    booking_cancelled: 'Reserva cancelada',
    profile_updated: 'Perfil actualizado',
    match_created: 'Partido creado',
    no_matches_found: 'No se encontraron partidos',
    no_notifications: 'Sin notificaciones',
  },
  
  fr: {
    // General
    app_name: 'Match Sport 24',
    welcome: 'Bienvenue',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    cancel: 'Annuler',
    save: 'Enregistrer',
    confirm: 'Confirmer',
    delete: 'Supprimer',
    edit: 'Modifier',
    search: 'Rechercher',
    filter: 'Filtrer',
    all: 'Tous',
    none: 'Aucun',
    back: 'Retour',
    next: 'Suivant',
    close: 'Fermer',
    
    // Auth
    login: 'Connexion',
    logout: 'Déconnexion',
    register: "S'inscrire",
    email: 'Email',
    password: 'Mot de passe',
    name: 'Nom',
    forgot_password: 'Mot de passe oublié?',
    login_with_google: 'Connexion avec Google',
    or: 'ou',
    no_account: "Pas de compte?",
    have_account: 'Déjà un compte?',
    
    // Roles
    player: 'Joueur',
    club_admin: 'Gestionnaire de Club',
    register_as_player: "S'inscrire comme Joueur",
    register_as_club: 'Inscrivez votre Club',
    
    // Navigation
    home: 'Accueil',
    matches: 'Matchs',
    profile: 'Profil',
    dashboard: 'Tableau de bord',
    settings: 'Paramètres',
    notifications: 'Notifications',
    
    // Sports
    padel: 'Padel',
    tennis: 'Tennis',
    calcetto: 'Futsal',
    calcio8: 'Football à 8',
    sport: 'Sport',
    sports: 'Sports',
    
    // Match
    find_match: 'Trouver un Match',
    create_match: 'Créer un Match',
    match_detail: 'Détails du Match',
    join_match: "S'inscrire",
    leave_match: 'Se désinscrire',
    match_full: 'Match complet',
    spots_available: 'places disponibles',
    date: 'Date',
    time: 'Heure',
    level: 'Niveau',
    price: 'Prix',
    free: 'Gratuit',
    payment_on_site: 'Paiement sur place',
    participants: 'Participants',
    
    // Levels
    beginner: 'Débutant',
    intermediate: 'Intermédiaire',
    advanced: 'Avancé',
    all_levels: 'Tous niveaux',
    
    // Status
    open: 'Ouvert',
    full: 'Complet',
    completed: 'Terminé',
    cancelled: 'Annulé',
    
    // Player
    my_matches: 'Mes matchs',
    match_history: 'Historique',
    statistics: 'Statistiques',
    rating: 'Classement',
    wins: 'Victoires',
    losses: 'Défaites',
    draws: 'Nuls',
    matches_played: 'Matchs joués',
    city: 'Ville',
    nickname: 'Pseudo',
    bio: 'Bio',
    preferred_sports: 'Sports préférés',
    
    // Club
    my_club: 'Mon Club',
    club_name: 'Nom du Club',
    club_description: 'Description',
    club_address: 'Adresse',
    club_phone: 'Téléphone',
    courts: 'Terrains',
    add_court: 'Ajouter un Terrain',
    bookings: 'Réservations',
    calendar: 'Calendrier',
    subscription: 'Abonnement',
    
    // Chat
    chat: 'Chat',
    send_message: 'Envoyer',
    type_message: 'Écrivez un message...',
    chat_unavailable: 'Chat indisponible',
    
    // Results
    result: 'Résultat',
    submit_result: 'Soumettre le Résultat',
    confirm_result: 'Confirmer le Résultat',
    pending_confirmation: 'En attente de confirmation',
    result_confirmed: 'Résultat confirmé',
    team_a: 'Équipe A',
    team_b: 'Équipe B',
    winner: 'Gagnant',
    score: 'Score',
    draw: 'Nul',
    
    // Subscription
    pricing: 'Plans et Tarifs',
    monthly: 'Mensuel',
    yearly: 'Annuel',
    subscribe: "S'abonner",
    subscription_active: 'Abonnement actif',
    subscription_expires: 'Expire le',
    trial: 'Essai gratuit',
    per_month: '/mois',
    per_year: '/an',
    
    // Messages
    booking_confirmed: 'Réservation confirmée!',
    booking_cancelled: 'Réservation annulée',
    profile_updated: 'Profil mis à jour',
    match_created: 'Match créé',
    no_matches_found: 'Aucun match trouvé',
    no_notifications: 'Aucune notification',
  },
};

export const getTranslation = (lang: Language, key: string): string => {
  return translations[lang]?.[key] || translations.it[key] || key;
};
