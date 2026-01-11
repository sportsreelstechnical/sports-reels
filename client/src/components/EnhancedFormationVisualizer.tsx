import React, { useState, useEffect, useRef } from 'react';
import { SmartVideoPlayerRef } from './SmartVideoPlayer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Clock, Users, Settings, RotateCcw } from 'lucide-react';

interface PlayerPosition {
    playerId: string;
    playerName: string;
    jerseyNumber?: number;
    position: string;
    x: number;
    y: number;
    timestamp: number;
    confidence: number;
    isTagged?: boolean;
}

interface FormationData {
    formation: string;
    positions: PlayerPosition[];
    timestamp: number;
    confidence: number;
    description?: string;
}

interface EnhancedFormationVisualizerProps {
    playerTracking: any[];
    tacticalAnalysis: any;
    currentTime: number;
    videoRef?: React.RefObject<SmartVideoPlayerRef>;
    onTimestampChange?: (timestamp: number) => void;
    taggedPlayers: any[];
    detectedSport: string;
}

const EnhancedFormationVisualizer: React.FC<EnhancedFormationVisualizerProps> = ({
    playerTracking,
    tacticalAnalysis,
    currentTime,
    videoRef,
    onTimestampChange,
    taggedPlayers,
    detectedSport
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState([1]);
    const [showTaggedOnly, setShowTaggedOnly] = useState(false);
    const [showFormationLines, setShowFormationLines] = useState(true);
    const [showPlayerNames, setShowPlayerNames] = useState(true);
    const [formationHistory, setFormationHistory] = useState<FormationData[]>([]);
    const [currentFormation, setCurrentFormation] = useState<FormationData | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Generate comprehensive formation data from player tracking
    const generateFormationData = (timestamp: number): FormationData => {
        const relevantPlayers = playerTracking.filter(player =>
            player.positions && player.positions.length > 0
        );

        // Get player positions at the current timestamp
        const positionsAtTime: PlayerPosition[] = relevantPlayers.map(player => {
            // Find the closest position to the current timestamp
            const closestPosition = player.positions.reduce((closest: any, pos: any) => {
                const currentDistance = Math.abs(pos.timestamp - timestamp);
                const closestDistance = Math.abs(closest.timestamp - timestamp);
                return currentDistance < closestDistance ? pos : closest;
            }, player.positions[0]);

            return {
                playerId: player.playerId,
                playerName: player.playerName,
                jerseyNumber: player.jerseyNumber,
                position: player.position,
                x: closestPosition.x,
                y: closestPosition.y,
                timestamp: closestPosition.timestamp,
                confidence: closestPosition.confidence || 0.8,
                isTagged: taggedPlayers.some(tp => tp.playerId === player.playerId)
            };
        });

        // Generate additional team players if we have fewer than expected
        const expectedTeamSize = getExpectedTeamSize(detectedSport);
        if (positionsAtTime.length < expectedTeamSize) {
            const additionalPlayers = generateAdditionalTeamPlayers(positionsAtTime, expectedTeamSize, timestamp);
            positionsAtTime.push(...additionalPlayers);
        }

        // Determine formation based on player positions
        const formation = determineFormation(positionsAtTime, detectedSport);

        return {
            formation,
            positions: positionsAtTime,
            timestamp,
            confidence: positionsAtTime.reduce((sum, pos) => sum + pos.confidence, 0) / positionsAtTime.length,
            description: `Formation at ${Math.floor(timestamp / 60)}:${Math.floor(timestamp % 60).toString().padStart(2, '0')}`
        };
    };

    const getExpectedTeamSize = (sport: string): number => {
        switch (sport.toLowerCase()) {
            case 'basketball': return 5;
            case 'football':
            case 'soccer': return 11;
            case 'rugby': return 15;
            case 'volleyball': return 6;
            case 'tennis': return 2;
            case 'baseball': return 9;
            case 'cricket': return 11;
            default: return 11;
        }
    };

    const generateAdditionalTeamPlayers = (existingPlayers: PlayerPosition[], targetSize: number, timestamp: number): PlayerPosition[] => {
        const additionalPlayers: PlayerPosition[] = [];
        const sport = detectedSport.toLowerCase();

        if (sport === 'basketball') {
            const positions = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'];
            const defaultPositions = [
                { x: 50, y: 85, position: 'Point Guard' },
                { x: 30, y: 75, position: 'Shooting Guard' },
                { x: 70, y: 75, position: 'Small Forward' },
                { x: 30, y: 60, position: 'Power Forward' },
                { x: 50, y: 50, position: 'Center' }
            ];

            for (let i = existingPlayers.length; i < targetSize; i++) {
                const posIndex = i % defaultPositions.length;
                const pos = defaultPositions[posIndex];
                additionalPlayers.push({
                    playerId: `generated_${i}`,
                    playerName: `Player ${i + 1}`,
                    jerseyNumber: i + 1,
                    position: pos.position,
                    x: pos.x + (Math.random() - 0.5) * 10,
                    y: pos.y + (Math.random() - 0.5) * 10,
                    timestamp,
                    confidence: 0.6,
                    isTagged: false
                });
            }
        } else {
            // Football/soccer formation
            const defaultFormations = {
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
                ]
            };

            const formation = defaultFormations['4-4-2'];
            for (let i = existingPlayers.length; i < targetSize; i++) {
                const posIndex = i % formation.length;
                const pos = formation[posIndex];
                additionalPlayers.push({
                    playerId: `generated_${i}`,
                    playerName: `Player ${i + 1}`,
                    jerseyNumber: i + 1,
                    position: pos.position,
                    x: pos.x + (Math.random() - 0.5) * 15,
                    y: pos.y + (Math.random() - 0.5) * 15,
                    timestamp,
                    confidence: 0.6,
                    isTagged: false
                });
            }
        }

        return additionalPlayers;
    };

    const determineFormation = (positions: PlayerPosition[], sport: string): string => {
        if (sport.toLowerCase() === 'basketball') {
            return '5-Player Setup';
        }

        // For football/soccer, determine formation based on player positions
        const sortedByY = positions.sort((a, b) => a.y - b.y);
        const defenders = sortedByY.slice(0, 4);
        const midfielders = sortedByY.slice(4, 8);
        const forwards = sortedByY.slice(8);

        if (defenders.length === 4 && midfielders.length === 4 && forwards.length === 2) {
            return '4-4-2';
        } else if (defenders.length === 4 && midfielders.length === 3 && forwards.length === 3) {
            return '4-3-3';
        } else if (defenders.length === 3 && midfielders.length === 5 && forwards.length === 2) {
            return '3-5-2';
        } else {
            return `${defenders.length}-${midfielders.length}-${forwards.length}`;
        }
    };

    // Update formation data based on current time
    useEffect(() => {
        const newFormation = generateFormationData(currentTime);
        setCurrentFormation(newFormation);

        // Add to formation history if it's significantly different
        setFormationHistory(prev => {
            const lastFormation = prev[prev.length - 1];
            if (!lastFormation ||
                Math.abs(lastFormation.timestamp - currentTime) > 30 ||
                lastFormation.formation !== newFormation.formation) {
                return [...prev, newFormation].slice(-20); // Keep last 20 formations
            }
            return prev;
        });
    }, [currentTime, playerTracking, detectedSport]);

    // Draw formation on canvas
    useEffect(() => {
        drawFormation();
    }, [currentFormation, showTaggedOnly, showFormationLines, showPlayerNames]);

    const drawFormation = () => {
        const canvas = canvasRef.current;
        if (!canvas || !currentFormation) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Draw field background
        drawField(ctx, canvas.width, canvas.height);

        // Filter players based on settings
        const playersToShow = showTaggedOnly
            ? currentFormation.positions.filter(p => p.isTagged)
            : currentFormation.positions;

        // Draw formation lines if enabled
        if (showFormationLines) {
            drawFormationLines(ctx, canvas.width, canvas.height, playersToShow);
        }

        // Draw players
        playersToShow.forEach((player, index) => {
            drawPlayer(ctx, player, index, canvas.width, canvas.height);
        });
    };

    const drawField = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        // Field background
        ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
        ctx.fillRect(0, 0, width, height);

        // Field border
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, width, height);

        // Center line
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();

        // Center circle
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, width * 0.08, 0, 2 * Math.PI);
        ctx.stroke();

        if (detectedSport.toLowerCase() === 'basketball') {
            // Basketball court lines
            // 3-point line
            ctx.beginPath();
            ctx.arc(width / 2, height * 0.1, width * 0.15, 0, Math.PI);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(width / 2, height * 0.9, width * 0.15, Math.PI, 2 * Math.PI);
            ctx.stroke();
        } else {
            // Football penalty areas
            const penaltyWidth = width * 0.3;
            const penaltyHeight = height * 0.15;

            ctx.strokeRect((width - penaltyWidth) / 2, 0, penaltyWidth, penaltyHeight);
            ctx.strokeRect((width - penaltyWidth) / 2, height - penaltyHeight, penaltyWidth, penaltyHeight);

            // Goals
            const goalWidth = width * 0.06;
            const goalHeight = height * 0.08;
            ctx.strokeRect((width - goalWidth) / 2, 0, goalWidth, goalHeight);
            ctx.strokeRect((width - goalWidth) / 2, height - goalHeight, goalWidth, goalHeight);
        }
    };

    const drawFormationLines = (ctx: CanvasRenderingContext2D, width: number, height: number, players: PlayerPosition[]) => {
        if (players.length < 3) return;

        // Draw lines connecting players in similar positions
        const sortedByY = [...players].sort((a, b) => a.y - b.y);

        // Draw defensive line
        const defenders = sortedByY.slice(0, Math.min(4, sortedByY.length));
        if (defenders.length > 1) {
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            defenders.forEach((player, index) => {
                const x = (player.x / 100) * width;
                const y = (player.y / 100) * height;
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw midfield line
        const midfielders = sortedByY.slice(Math.floor(sortedByY.length * 0.3), Math.floor(sortedByY.length * 0.7));
        if (midfielders.length > 1) {
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            midfielders.forEach((player, index) => {
                const x = (player.x / 100) * width;
                const y = (player.y / 100) * height;
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
            ctx.setLineDash([]);
        }
    };

    const drawPlayer = (ctx: CanvasRenderingContext2D, player: PlayerPosition, index: number, width: number, height: number) => {
        const x = (player.x / 100) * width;
        const y = (player.y / 100) * height;

        // Player circle
        const radius = player.isTagged ? 12 : 10;
        const color = player.isTagged ? '#ec4899' : '#6b7280';

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();

        // Player border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Jersey number
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            player.jerseyNumber?.toString() || (index + 1).toString(),
            x,
            y + 3
        );

        // Player name (if enabled)
        if (showPlayerNames && player.playerName !== `Player ${index + 1}`) {
            ctx.font = '8px Arial';
            ctx.fillText(
                player.playerName,
                x,
                y + radius + 12
            );
        }

        // Position label
        ctx.font = '7px Arial';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText(
            player.position,
            x,
            y + radius + 20
        );
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="border-gray-600 text-gray-300"
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>

                    <Button
                        variant={showTaggedOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowTaggedOnly(!showTaggedOnly)}
                        className={showTaggedOnly ? "bg-bright-pink hover:bg-bright-pink/80" : "border-gray-600 text-gray-300"}
                    >
                        <Users className="w-4 h-4 mr-2" />
                        {showTaggedOnly ? 'Tagged Only' : 'Full Team'}
                    </Button>

                    <Button
                        variant={showFormationLines ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowFormationLines(!showFormationLines)}
                        className={showFormationLines ? "bg-blue-500 hover:bg-blue-500/80" : "border-gray-600 text-gray-300"}
                    >
                        Formation Lines
                    </Button>

                    <Button
                        variant={showPlayerNames ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowPlayerNames(!showPlayerNames)}
                        className={showPlayerNames ? "bg-green-500 hover:bg-green-500/80" : "border-gray-600 text-gray-300"}
                    >
                        Player Names
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400 text-sm">
                            {formatTime(currentTime)}
                        </span>
                    </div>

                    {currentFormation && (
                        <Badge className="bg-bright-pink/20 text-bright-pink border-bright-pink/30">
                            {currentFormation.formation}
                        </Badge>
                    )}

                    <div className="text-xs text-gray-400">
                        {currentFormation?.positions.length || 0} Players
                    </div>
                </div>
            </div>

            {/* Formation Canvas */}
            <div className="relative bg-green-900/20 border-2 border-green-500/30 rounded-lg p-4">
                <canvas
                    ref={canvasRef}
                    className="w-full h-96 border border-green-400/30 rounded-lg"
                />

                {/* Formation Info Overlay */}
                {currentFormation && (
                    <div className="absolute top-4 left-4 bg-gray-800/80 backdrop-blur-sm rounded-lg p-3">
                        <div className="text-white text-sm font-medium">
                            {currentFormation.formation} Formation
                        </div>
                        <div className="text-gray-400 text-xs">
                            Confidence: {Math.round(currentFormation.confidence * 100)}%
                        </div>
                        <div className="text-gray-400 text-xs">
                            {showTaggedOnly ? 'Tagged Players Only' : 'Full Team Display'}
                        </div>
                    </div>
                )}
            </div>

            {/* Formation History */}
            {formationHistory.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-white font-semibold">Formation History</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {formationHistory.slice(-12).map((formation, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg cursor-pointer transition-colors ${currentFormation?.timestamp === formation.timestamp
                                        ? 'bg-bright-pink/20 border border-bright-pink/30'
                                        : 'bg-gray-700/30 hover:bg-gray-700/50'
                                    }`}
                                onClick={() => onTimestampChange?.(formation.timestamp)}
                            >
                                <div className="text-center">
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">
                                        {formation.formation}
                                    </Badge>
                                    <div className="text-gray-400 text-xs mt-1">
                                        {formatTime(formation.timestamp)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Playback Speed Control */}
            <div className="space-y-2">
                <label className="text-white text-sm font-medium">Formation Animation Speed</label>
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
        </div>
    );
};

export default EnhancedFormationVisualizer;
