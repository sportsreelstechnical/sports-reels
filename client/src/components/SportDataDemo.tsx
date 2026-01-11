import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSportData, getAvailableSports, getSportDisplayName, getSportIcon, hasGenderSpecificData } from '@/hooks/useSportData';
import { Trophy, Users, Flag } from 'lucide-react';

const SportDataDemo: React.FC = () => {
    const [selectedSport, setSelectedSport] = useState<string>('');
    const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'other'>('male');

    const availableSports = getAvailableSports();
    const sportData = useSportData(selectedSport, selectedGender);

    return (
        <Card className="w-full max-w-4xl mx-auto bg-[#1a1a1a] border-0">
            <CardHeader>
                <CardTitle className="text-white font-polysans flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-rosegold" />
                    Dynamic Sport Data System Demo
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Sport and Gender Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-white text-sm font-medium">Select Sport</label>
                        <Select value={selectedSport} onValueChange={setSelectedSport}>
                            <SelectTrigger className="bg-[#111111] border-0 text-white">
                                <SelectValue placeholder="Choose a sport" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-0">
                                {availableSports.map((sport) => (
                                    <SelectItem key={sport} value={sport} className="text-white">
                                        <span className="flex items-center gap-2">
                                            <span>{getSportIcon(sport)}</span>
                                            {getSportDisplayName(sport)}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-white text-sm font-medium">Select Gender</label>
                        <Select value={selectedGender} onValueChange={(value: 'male' | 'female' | 'other') => setSelectedGender(value)}>
                            <SelectTrigger className="bg-[#111111] border-0 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-0">
                                <SelectItem value="male" className="text-white">Male</SelectItem>
                                <SelectItem value="female" className="text-white">Female</SelectItem>
                                <SelectItem value="other" className="text-white">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Sport Info Display */}
                {selectedSport && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-4 bg-gray-800 rounded-lg">
                            <span className="text-2xl">{getSportIcon(selectedSport)}</span>
                            <div>
                                <h3 className="text-white font-semibold">{getSportDisplayName(selectedSport)}</h3>
                                <p className="text-gray-400 text-sm">
                                    {hasGenderSpecificData(selectedSport)
                                        ? `Has gender-specific data for ${selectedGender === 'female' ? 'women' : 'men'}`
                                        : 'Uses standard data for all genders'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Positions */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-rosegold" />
                                <h4 className="text-white font-semibold">Positions ({sportData.positions.length})</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {sportData.positions.map((position, index) => (
                                    <Badge key={index} variant="secondary" className="bg-gray-700 text-white">
                                        {position}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Leagues */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-rosegold" />
                                <h4 className="text-white font-semibold">Leagues & Competitions ({sportData.leagues.length})</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {sportData.leagues.map((league, index) => (
                                    <Badge key={index} variant="secondary" className="bg-gray-700 text-white">
                                        {league}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Titles */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Flag className="w-5 h-5 text-rosegold" />
                                <h4 className="text-white font-semibold">Titles & Achievements ({sportData.titles.length})</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {sportData.titles.map((title, index) => (
                                    <Badge key={index} variant="secondary" className="bg-gray-700 text-white">
                                        {title}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                {!selectedSport && (
                    <div className="text-center py-8">
                        <p className="text-gray-400">
                            Select a sport above to see dynamic data including positions, leagues, and titles
                            that automatically adjust based on the selected sport and gender.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default SportDataDemo; 