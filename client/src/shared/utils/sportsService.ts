export type SportType =
  'football' | 'american_football' | 'basketball' | 'baseball' | 'volleyball' |
  'tennis' | 'rugby' | 'cricket' | 'hockey' | 'golf' | 'swimming' | 'athletics' |
  'boxing' | 'wrestling' | 'martial_arts' | 'cycling' | 'table_tennis' |
  'badminton' | 'handball' | 'water_polo';

export type AllowedSportType = 'football' | 'basketball' | 'volleyball' | 'tennis' | 'rugby';

export interface Sport {
  id: string;
  name: string;
  description: string;
  value: SportType;
  label: string;
  supportsFifaId: boolean;
  supportsFootPreference: boolean;
  isDatabaseCompatible: boolean;
}

const SPORTS_DATA: Record<SportType, Omit<Sport, 'value'>> = {
  football: {
    id: '1',
    name: 'Football',
    description: 'Association football (soccer)',
    label: 'Football ⚽',
    supportsFifaId: true,
    supportsFootPreference: true,
    isDatabaseCompatible: true
  },
  american_football: {
    id: '2',
    name: 'American Football',
    description: 'Gridiron football',
    label: 'American Football 🏈',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  basketball: {
    id: '3',
    name: 'Basketball',
    description: 'Basketball',
    label: 'Basketball 🏀',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: true
  },
  baseball: {
    id: '4',
    name: 'Baseball',
    description: 'Baseball',
    label: 'Baseball ⚾',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  volleyball: {
    id: '5',
    name: 'Volleyball',
    description: 'Volleyball',
    label: 'Volleyball 🏐',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: true
  },
  tennis: {
    id: '6',
    name: 'Tennis',
    description: 'Tennis',
    label: 'Tennis 🎾',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: true
  },
  rugby: {
    id: '7',
    name: 'Rugby',
    description: 'Rugby football',
    label: 'Rugby 🏉',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: true
  },
  cricket: {
    id: '8',
    name: 'Cricket',
    description: 'Cricket',
    label: 'Cricket 🏏',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  hockey: {
    id: '9',
    name: 'Hockey',
    description: 'Field hockey',
    label: 'Hockey 🏒',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  golf: {
    id: '10',
    name: 'Golf',
    description: 'Golf',
    label: 'Golf ⛳',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  swimming: {
    id: '11',
    name: 'Swimming',
    description: 'Competitive swimming',
    label: 'Swimming 🏊',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  athletics: {
    id: '12',
    name: 'Athletics',
    description: 'Track and field',
    label: 'Athletics 🏃',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  boxing: {
    id: '13',
    name: 'Boxing',
    description: 'Boxing',
    label: 'Boxing 🥊',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  wrestling: {
    id: '14',
    name: 'Wrestling',
    description: 'Wrestling',
    label: 'Wrestling 🤼',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  martial_arts: {
    id: '15',
    name: 'Martial Arts',
    description: 'Various martial arts',
    label: 'Martial Arts 🥋',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  cycling: {
    id: '16',
    name: 'Cycling',
    description: 'Bicycle racing',
    label: 'Cycling 🚴',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  table_tennis: {
    id: '17',
    name: 'Table Tennis',
    description: 'Ping pong',
    label: 'Table Tennis 🏓',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  badminton: {
    id: '18',
    name: 'Badminton',
    description: 'Badminton',
    label: 'Badminton 🏸',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  handball: {
    id: '19',
    name: 'Handball',
    description: 'Team handball',
    label: 'Handball 🤾',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  },
  water_polo: {
    id: '20',
    name: 'Water Polo',
    description: 'Water polo',
    label: 'Water Polo 🤽',
    supportsFifaId: false,
    supportsFootPreference: false,
    isDatabaseCompatible: false
  }
};

// Core Service Functions
export const getAllSports = (): Sport[] => {
  return Object.entries(SPORTS_DATA).map(([value, data]) => ({
    ...data,
    value: value as SportType
  }));
};

export const getDatabaseCompatibleSports = (): Sport[] => {
  return getAllSports().filter(sport =>
    ['football', 'basketball', 'volleyball', 'tennis', 'rugby'].includes(sport.value)
  );
};

export const getSportByValue = (value: SportType): Sport => {
  const sport = SPORTS_DATA[value];
  if (!sport) {
    throw new Error(`Invalid sport value: ${value}`);
  }
  return { ...sport, value };
};
// Validation Utilities
export const isAllowedSportType = (value: string): value is AllowedSportType => {
  return getDatabaseCompatibleSports()
    .some(sport => sport.value === value);
};

export const validateSportType = (value: string): value is AllowedSportType => {
  return isAllowedSportType(value);
};

// Feature Checks
export const requiresFifaId = (sport: AllowedSportType): boolean => {
  return sport === 'football';
};

export const supportsFootPreference = (sport: AllowedSportType): boolean => {
  return sport === 'football';
};

// Type Helpers
export const getAllSportTypes = (): SportType[] => {
  return Object.keys(SPORTS_DATA) as SportType[];
};

export const getAllowedSportTypes = (): AllowedSportType[] => {
  return ['football', 'basketball', 'volleyball', 'tennis', 'rugby'];
};