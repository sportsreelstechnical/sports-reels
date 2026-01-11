import React, { useState, useEffect } from 'react';
import { SmartVideoPlayerRef } from './SmartVideoPlayer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Clock, Users } from 'lucide-react';

interface FormationPosition {
    playerId: string;
    position: string;
    x: number;
    y: number;
}

interface FormationData {
    formation: string;
    positions: FormationPosition[];
    confidence: number;
    timestamp: number;
}

interface Player {
    playerId: string;
    playerName: string;
    jerseyNumber?: number;
    position: string;
}

interface FormationVisualizerProps {
    formations: FormationData[];
    players: Player[];
    onTimestampChange?: (timestamp: number) => void;
    videoRef?: React.RefObject<SmartVideoPlayerRef>;
    currentTime?: number;
}

const FormationVisualizer: React.FC<FormationVisualizerProps> = ({
    formations,
    players,
    onTimestampChange,
    videoRef,
    currentTime = 0
}) => {
    const [currentFormationIndex, setCurrentFormationIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState([1]);

    const currentFormation = formations[currentFormationIndex];

    // Generate realistic formation based on player positions and sport
    const generateRealisticFormation = (): FormationData => {
        const sport = 'basketball'; // We can detect this from context later

        let defaultPositions: FormationPosition[] = [];

        if (sport === 'basketball') {
            // Basketball positions with realistic court positions
            const positions = [
                { position: 'Point Guard', x: 50, y: 85, role: 'PG' },
                { position: 'Shooting Guard', x: 30, y: 75, role: 'SG' },
                { position: 'Small Forward', x: 70, y: 75, role: 'SF' },
                { position: 'Power Forward', x: 30, y: 60, role: 'PF' },
                { position: 'Center', x: 50, y: 50, role: 'C' }
            ];

            defaultPositions = players.map((player, index) => {
                const pos = positions[index] || positions[0];
                // Add some variation to make it look more dynamic
                const variation = Math.sin(currentTime * 0.1 + index) * 3;
                return {
                    playerId: player.playerId,
                    position: pos.position,
                    x: Math.max(10, Math.min(90, pos.x + variation)),
                    y: Math.max(10, Math.min(90, pos.y + variation))
                };
            });
        } else {
            // Football/soccer formation
            defaultPositions = players.map((player, index) => {
                const row = Math.floor(index / 3);
                const col = index % 3;
                return {
                    playerId: player.playerId,
                    position: player.position,
                    x: 20 + (col * 30),
                    y: 30 + (row * 20)
                };
            });
        }

        return {
            formation: sport === 'basketball' ? "1-2-2" : "4-4-2",
            positions: defaultPositions,
            confidence: 0.8,
            timestamp: currentTime
        };
    };

    // Use real formation data if available, otherwise generate realistic default
    const displayFormation = currentFormation || generateRealisticFormation();

    // Sync with video time
    useEffect(() => {
        if (videoRef?.current && currentTime !== undefined) {
            // Find the formation closest to the current video time
            const closestFormationIndex = formations.findIndex(formation =>
                formation.timestamp >= currentTime
            );

            if (closestFormationIndex !== -1) {
                setCurrentFormationIndex(Math.max(0, closestFormationIndex - 1));
            }
        }
    }, [currentTime, formations, videoRef]);

    // Auto-play formations when video is playing
    useEffect(() => {
        if (isPlaying && displayFormation && formations.length > 0) {
            const interval = setInterval(() => {
                setCurrentFormationIndex(prev => {
                    const nextIndex = prev + 1;
                    if (nextIndex >= formations.length) {
                        setIsPlaying(false);
                        return prev;
                    }

                    // Sync with video if available
                    const nextFormation = formations[nextIndex];
                    if (videoRef?.current && nextFormation) {
                        videoRef.current.seekTo(nextFormation.timestamp);
                    }

                    return nextIndex;
                });
            }, 2000 / playbackSpeed[0]); // 2 seconds base speed

            return () => clearInterval(interval);
        }
    }, [isPlaying, formations, playbackSpeed, videoRef]);

    const handleTimestampChange = (index: number) => {
        setCurrentFormationIndex(index);
        if (displayFormation && onTimestampChange) {
            onTimestampChange(displayFormation.timestamp);
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getPlayerInfo = (playerId: string) => {
        return players.find(p => p.playerId === playerId);
    };

    const getPositionColor = (position: string) => {
        const colors: { [key: string]: string } = {
            'GK': 'bg-blue-500',
            'CB': 'bg-green-500',
            'LB': 'bg-green-500',
            'RB': 'bg-green-500',
            'LWB': 'bg-green-500',
            'RWB': 'bg-green-500',
            'CDM': 'bg-yellow-500',
            'CM': 'bg-yellow-500',
            'CAM': 'bg-yellow-500',
            'LM': 'bg-yellow-500',
            'RM': 'bg-yellow-500',
            'LW': 'bg-red-500',
            'RW': 'bg-red-500',
            'CF': 'bg-red-500',
            'ST': 'bg-red-500'
        };
        return colors[position] || 'bg-gray-500';
    };

    const getFormationLayout = (formation: string) => {
        const layouts: { [key: string]: { x: number; y: number; position: string }[] } = {
            '4-4-2': [
                { x: 50, y: 10, position: 'GK' },
                { x: 25, y: 35, position: 'LB' },
                { x: 50, y: 35, position: 'CB' },
                { x: 75, y: 35, position: 'CB' },
                { x: 25, y: 60, position: 'LM' },
                { x: 50, y: 60, position: 'CM' },
                { x: 75, y: 60, position: 'CM' },
                { x: 25, y: 85, position: 'ST' },
                { x: 75, y: 85, position: 'ST' }
            ],
            '4-3-3': [
                { x: 50, y: 10, position: 'GK' },
                { x: 25, y: 35, position: 'LB' },
                { x: 50, y: 35, position: 'CB' },
                { x: 75, y: 35, position: 'CB' },
                { x: 25, y: 60, position: 'CM' },
                { x: 50, y: 60, position: 'CM' },
                { x: 75, y: 60, position: 'CM' },
                { x: 25, y: 85, position: 'LW' },
                { x: 50, y: 85, position: 'ST' },
                { x: 75, y: 85, position: 'RW' }
            ],
            '3-5-2': [
                { x: 50, y: 10, position: 'GK' },
                { x: 25, y: 35, position: 'CB' },
                { x: 50, y: 35, position: 'CB' },
                { x: 75, y: 35, position: 'CB' },
                { x: 25, y: 60, position: 'LWB' },
                { x: 50, y: 60, position: 'CM' },
                { x: 75, y: 60, position: 'RWB' },
                { x: 25, y: 85, position: 'ST' },
                { x: 75, y: 85, position: 'ST' }
            ],
            '4-2-3-1': [
                { x: 50, y: 10, position: 'GK' },
                { x: 25, y: 35, position: 'LB' },
                { x: 50, y: 35, position: 'CB' },
                { x: 75, y: 35, position: 'CB' },
                { x: 25, y: 60, position: 'CDM' },
                { x: 75, y: 60, position: 'CDM' },
                { x: 25, y: 75, position: 'LM' },
                { x: 50, y: 75, position: 'CAM' },
                { x: 75, y: 75, position: 'RM' },
                { x: 50, y: 85, position: 'ST' }
            ]
        };

        return layouts[formation] || layouts['4-4-2'];
    };

    if (!currentFormation) {
        return (
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No formation data available</p>
                </CardContent>
            </Card>
        );
    }

    const formationLayout = getFormationLayout(displayFormation.formation);

    return (
        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-bright-pink" />
                    Formation Analysis
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Formation Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setIsPlaying(false);
                                setCurrentFormationIndex(Math.max(0, currentFormationIndex - 1));
                            }}
                            disabled={currentFormationIndex === 0}
                        >
                            <SkipBack className="w-4 h-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (isPlaying) {
                                    setIsPlaying(false);
                                } else {
                                    setIsPlaying(true);
                                    // Start formation animation if we have formations
                                    if (formations.length > 1) {
                                        const interval = setInterval(() => {
                                            setCurrentFormationIndex(prev => {
                                                const nextIndex = prev + 1;
                                                if (nextIndex >= formations.length) {
                                                    setIsPlaying(false);
                                                    return 0; // Loop back to start
                                                }
                                                return nextIndex;
                                            });
                                        }, 3000 / playbackSpeed[0]);

                                        // Store interval ID for cleanup
                                        return () => clearInterval(interval);
                                    }
                                }
                            }}
                        >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setIsPlaying(false);
                                setCurrentFormationIndex(Math.min(formations.length - 1, currentFormationIndex + 1));
                            }}
                            disabled={currentFormationIndex === formations.length - 1}
                        >
                            <SkipForward className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400 text-sm">
                                {formatTime(displayFormation.timestamp)}
                            </span>
                        </div>

                        <Badge className="bg-bright-pink/20 text-bright-pink border-bright-pink/30">
                            {displayFormation.formation}
                        </Badge>

                        <div className="text-xs text-gray-400">
                            {currentFormationIndex + 1} / {formations.length}
                        </div>
                    </div>
                </div>

                {/* Formation Field */}
                <div className="relative bg-green-900/20 border-2 border-green-500/30 rounded-lg p-4 min-h-[400px]">
                    {/* Field Lines */}
                    <div className="absolute inset-4 border border-green-400/30 rounded-lg">
                        {/* Center Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-green-400/30 transform -translate-y-1/2"></div>

                        {/* Center Circle */}
                        <div className="absolute top-1/2 left-1/2 w-16 h-16 border border-green-400/30 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>

                        {/* Penalty Areas */}
                        <div className="absolute top-0 left-1/4 w-1/2 h-16 border border-green-400/30 border-b-0 rounded-t-lg"></div>
                        <div className="absolute bottom-0 left-1/4 w-1/2 h-16 border border-green-400/30 border-t-0 rounded-b-lg"></div>

                        {/* Goals */}
                        <div className="absolute top-0 left-1/2 w-8 h-4 border-l-2 border-r-2 border-t-2 border-green-400/30 transform -translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-1/2 w-8 h-4 border-l-2 border-r-2 border-b-2 border-green-400/30 transform -translate-x-1/2"></div>
                    </div>

                    {/* Players */}
                    {displayFormation.positions.map((playerPos, index) => {
                        const player = getPlayerInfo(playerPos.playerId);
                        const layoutPos = formationLayout[index] || formationLayout[0];

                        return (
                            <div
                                key={playerPos.playerId}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                                style={{
                                    left: `${layoutPos.x}%`,
                                    top: `${layoutPos.y}%`
                                }}
                            >
                                <div className="relative group">
                                    <div className={`w-8 h-8 rounded-full ${getPositionColor(layoutPos.position)} flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform`}>
                                        {player?.jerseyNumber || '?'}
                                    </div>

                                    {/* Player Info Tooltip */}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        <div className="font-semibold">{player?.playerName || playerPos.playerId}</div>
                                        <div className="text-gray-400">{layoutPos.position}</div>
                                        {player?.jerseyNumber && <div className="text-gray-400">#{player.jerseyNumber}</div>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Formation Timeline */}
                <div className="space-y-3">
                    <h4 className="text-white font-semibold">Formation Timeline</h4>
                    <div className="space-y-2">
                        {formations.map((formation, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg cursor-pointer transition-colors ${index === currentFormationIndex
                                    ? 'bg-bright-pink/20 border border-bright-pink/30'
                                    : 'bg-gray-700/30 hover:bg-gray-700/50'
                                    }`}
                                onClick={() => handleTimestampChange(index)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                                            {formation.formation}
                                        </Badge>
                                        <span className="text-white text-sm">
                                            {formatTime(formation.timestamp)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Confidence: {Math.round(formation.confidence * 100)}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Playback Speed Control */}
                <div className="space-y-2">
                    <label className="text-white text-sm font-medium">Playback Speed</label>
                    <div className="flex items-center gap-4">
                        <Slider
                            value={playbackSpeed}
                            onValueChange={setPlaybackSpeed}
                            max={3}
                            min={0.5}
                            step={0.5}
                            className="flex-1"
                        />
                        <span className="text-white text-sm w-12">
                            {playbackSpeed[0]}x
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default FormationVisualizer;
