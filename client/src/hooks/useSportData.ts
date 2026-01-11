import { useState, useEffect } from 'react';
import sportsData from '@/db/full_sports_extended_data_complete.json';

export interface SportData {
    positions: string[];
    leagues: string[];
    titles: string[];
    associations: string[];
}

export interface SportSpecificData {
    [sport: string]: {
        positions: string[];
        female_positions: string[];
        leagues: string[];
        female_leagues: string[];
        titles: string[];
        female_titles: string[];
        associations: string[];
        female_associations: string[];
    };
}

export const useSportData = (sportType: string, gender: 'male' | 'female' | 'other' = 'male') => {
    const [data, setData] = useState<SportData>({
        positions: [],
        leagues: [],
        titles: [],
        associations: []
    });

    useEffect(() => {
        console.log('🏈 useSportData: Effect triggered', { sportType, gender });

        if (!sportType) {
            console.log('🏈 useSportData: No sport type provided');
            setData({ positions: [], leagues: [], titles: [], associations: [] });
            return;
        }

        const sportInfo = (sportsData as SportSpecificData)[sportType];
        console.log('🏈 useSportData: Sport info lookup', {
            sportType,
            sportInfo: sportInfo ? 'Found' : 'Not found',
            availableSports: Object.keys(sportsData)
        });

        if (!sportInfo) {
            console.log('🏈 useSportData: Sport info not found for:', sportType);
            setData({ positions: [], leagues: [], titles: [], associations: [] });
            return;
        }

        // Treat 'other' gender as 'male' for data purposes
        const effectiveGender = gender === 'female' ? 'female' : 'male';

        const newData = {
            positions: effectiveGender === 'female' ? sportInfo.female_positions : sportInfo.positions,
            leagues: effectiveGender === 'female' ? sportInfo.female_leagues : sportInfo.leagues,
            titles: effectiveGender === 'female' ? sportInfo.female_titles : sportInfo.titles,
            associations: effectiveGender === 'female' ? sportInfo.female_associations : sportInfo.associations
        };

        console.log('🏈 useSportData: Setting data', {
            effectiveGender,
            positionsCount: newData.positions.length,
            positions: newData.positions
        });

        setData(newData);
    }, [sportType, gender]);

    return data;
};

// Helper function to get all available sports
export const getAvailableSports = (): string[] => {
    return Object.keys(sportsData as SportSpecificData);
};

// Helper function to check if a sport has gender-specific data
export const hasGenderSpecificData = (sportType: string): boolean => {
    const sportInfo = (sportsData as SportSpecificData)[sportType];
    return sportInfo && (
        sportInfo.female_positions.length > 0 ||
        sportInfo.female_leagues.length > 0 ||
        sportInfo.female_titles.length > 0 ||
        sportInfo.female_associations.length > 0
    );
};

// Helper function to get sport display name
export const getSportDisplayName = (sportType: string): string => {
    const displayNames: { [key: string]: string } = {
        'football': 'Football',
        'american_football': 'American Football',
        'basketball': 'Basketball',
        'baseball': 'Baseball',
        'volleyball': 'Volleyball',
        'tennis': 'Tennis',
        'rugby': 'Rugby',
        'cricket': 'Cricket',
        'hockey': 'Hockey',
        'golf': 'Golf',
        'swimming': 'Swimming',
        'athletics': 'Athletics',
        'boxing': 'Boxing',
        'wrestling': 'Wrestling',
        'martial_arts': 'Martial Arts',
        'cycling': 'Cycling',
        'table_tennis': 'Table Tennis',
        'badminton': 'Badminton',
        'handball': 'Handball',
        'water_polo': 'Water Polo'
    };

    return displayNames[sportType] || sportType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Helper function to get sport icon (you can extend this with actual icons)
export const getSportIcon = (sportType: string): string => {
    const icons: { [key: string]: string } = {
        'football': '⚽',
        'american_football': '🏈',
        'basketball': '🏀',
        'baseball': '⚾',
        'volleyball': '🏐',
        'tennis': '🎾',
        'rugby': '🏉',
        'cricket': '🏏',
        'hockey': '🏒',
        'golf': '⛳',
        'swimming': '🏊',
        'athletics': '🏃',
        'boxing': '🥊',
        'wrestling': '🤼',
        'martial_arts': '🥋',
        'cycling': '🚴',
        'table_tennis': '🏓',
        'badminton': '🏸',
        'handball': '🤾',
        'water_polo': '🤽'
    };

    return icons[sportType] || '🏆';
}; 