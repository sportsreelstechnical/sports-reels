import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Users,
    Target,
    Activity,
    TrendingUp,
    MapPin,
    Clock,
    Zap,
    Award,
    BarChart3,
    Eye,
    Play,
    Pause
} from 'lucide-react';

interface PlayerTrackingData {
    playerId: string;
    playerName: string;
    jerseyNumber?: number;
    position: string;
    positions: Array<{
        x: number;
        y: number;
        timestamp: number;
        confidence: number;
    }>;
    totalDistance: number;
    averageSpeed: number;
    maxSpeed: number;
    heatMapData: Array<{
        x: number;
        y: number;
        intensity: number;
        timestamp: number;
    }>;
    keyMoments: Array<{
        timestamp: number;
        type: 'goal' | 'assist' | 'save' | 'tackle' | 'pass' | 'shot' | 'foul' | 'substitution';
        description: string;
        confidence: number;
        fieldPosition: string;
        outcome?: 'successful' | 'failed';
    }>;
}

interface TacticalAnalysis {
    formationChanges: Array<{
        formation: string;
        positions: Array<{
            playerId: string;
            position: string;
            x: number;
            y: number;
        }>;
        confidence: number;
        timestamp: number;
    }>;
    pressingMoments: Array<{
        timestamp: number;
        duration: number;
        intensity: 'low' | 'medium' | 'high';
        playersInvolved: string[];
        success: boolean;
    }>;
    buildUpPlay: Array<{
        timestamp: number;
        duration: number;
        playersInvolved: string[];
        passes: number;
        outcome: 'successful' | 'failed';
    }>;
    defensiveActions: Array<{
        timestamp: number;
        type: 'tackle' | 'interception' | 'clearance' | 'block';
        playerId: string;
        success: boolean;
        fieldPosition: string;
    }>;
    attackingPatterns: Array<{
        timestamp: number;
        type: 'counter-attack' | 'possession-play' | 'set-piece' | 'individual-run';
        playersInvolved: string[];
        outcome: 'goal' | 'shot' | 'corner' | 'failed';
    }>;
}

interface MatchStatistics {
    possession: {
        home: number;
        away: number;
    };
    shots: {
        home: number;
        away: number;
    };
    passes: {
        home: number;
        away: number;
        accuracy: {
            home: number;
            away: number;
        };
    };
    goals: Array<{
        timestamp: number;
        playerId: string;
        team: 'home' | 'away';
        type: 'open-play' | 'penalty' | 'free-kick' | 'corner' | 'own-goal';
        assistPlayerId?: string;
        fieldPosition: string;
    }>;
    cards: Array<{
        timestamp: number;
        playerId: string;
        team: 'home' | 'away';
        type: 'yellow' | 'red';
        reason: string;
    }>;
    substitutions: Array<{
        timestamp: number;
        playerOut: string;
        playerIn: string;
        team: 'home' | 'away';
        reason: 'tactical' | 'injury' | 'performance';
    }>;
}

interface PlayerTrackingVisualizationProps {
    playerTracking: PlayerTrackingData[];
    tacticalAnalysis: TacticalAnalysis;
    matchStatistics: MatchStatistics;
    onTimestampClick?: (timestamp: number) => void;
}

const PlayerTrackingVisualization: React.FC<PlayerTrackingVisualizationProps> = ({
    playerTracking,
    tacticalAnalysis,
    matchStatistics,
    onTimestampClick
}) => {
    const [selectedPlayer, setSelectedPlayer] = useState<string>('');
    const [selectedFormation, setSelectedFormation] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (playerTracking.length > 0 && !selectedPlayer) {
            setSelectedPlayer(playerTracking[0].playerId);
        }
    }, [playerTracking, selectedPlayer]);

    const getActionColor = (action: string) => {
        const colors = {
            'goal': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
            'assist': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
            'save': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
            'tackle': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
            'pass': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
            'shot': 'bg-red-500/20 text-red-400 border-red-500/50',
            'foul': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
            'substitution': 'bg-gray-500/20 text-gray-400 border-gray-500/50'
        };
        return colors[action] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    };

    const getIntensityColor = (intensity: string) => {
        const colors = {
            'low': 'bg-green-500/20 text-green-400 border-green-500/50',
            'medium': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
            'high': 'bg-red-500/20 text-red-400 border-red-500/50'
        };
        return colors[intensity] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const currentPlayer = playerTracking.find(p => p.playerId === selectedPlayer);
    const currentFormation = tacticalAnalysis.formationChanges[selectedFormation];

    return (
        <div className="space-y-6">
            {/* Player Selection */}
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-bright-pink" />
                        Player Tracking Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {playerTracking.map((player) => (
                            <Button
                                key={player.playerId}
                                variant={selectedPlayer === player.playerId ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedPlayer(player.playerId)}
                                className={
                                    selectedPlayer === player.playerId
                                        ? "bg-bright-pink hover:bg-bright-pink/80"
                                        : "border-gray-600 text-gray-300 hover:bg-gray-700"
                                }
                            >
                                {player.jerseyNumber && `#${player.jerseyNumber} `}{player.playerName}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {currentPlayer && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Player Performance Metrics */}
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Target className="w-5 h-5 text-bright-pink" />
                                {currentPlayer.jerseyNumber && `#${currentPlayer.jerseyNumber} `}{currentPlayer.playerName} - Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-700/30 rounded-lg">
                                    <div className="text-2xl font-bold text-white">{currentPlayer.totalDistance.toFixed(1)}m</div>
                                    <div className="text-xs text-gray-400">Distance Covered</div>
                                </div>
                                <div className="p-3 bg-gray-700/30 rounded-lg">
                                    <div className="text-2xl font-bold text-white">{currentPlayer.averageSpeed.toFixed(1)} km/h</div>
                                    <div className="text-xs text-gray-400">Average Speed</div>
                                </div>
                                <div className="p-3 bg-gray-700/30 rounded-lg">
                                    <div className="text-2xl font-bold text-white">{currentPlayer.maxSpeed.toFixed(1)} km/h</div>
                                    <div className="text-xs text-gray-400">Max Speed</div>
                                </div>
                                <div className="p-3 bg-gray-700/30 rounded-lg">
                                    <div className="text-2xl font-bold text-white">{currentPlayer.keyMoments.length}</div>
                                    <div className="text-xs text-gray-400">Key Actions</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">Position</span>
                                        <span className="text-white">{currentPlayer.position}</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">Key Actions</span>
                                        <span className="text-white">{currentPlayer.keyMoments.length}</span>
                                    </div>
                                    <Progress value={(currentPlayer.keyMoments.length / 20) * 100} className="h-2" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Key Moments */}
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-bright-pink" />
                                Key Moments
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {currentPlayer.keyMoments.map((moment, index) => (
                                    <div
                                        key={index}
                                        className="p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors"
                                        onClick={() => onTimestampClick?.(moment.timestamp)}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge className={getActionColor(moment.type)}>
                                                {moment.type.toUpperCase()}
                                            </Badge>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(moment.timestamp)}
                                            </div>
                                        </div>
                                        <p className="text-white text-sm mb-1">{moment.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">{moment.fieldPosition}</span>
                                            {moment.outcome && (
                                                <Badge variant="outline" className={
                                                    moment.outcome === 'successful'
                                                        ? 'border-green-500/50 text-green-400'
                                                        : 'border-red-500/50 text-red-400'
                                                }>
                                                    {moment.outcome}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tactical Analysis */}
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-bright-pink" />
                        Tactical Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="formations" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 bg-gray-700/30">
                            <TabsTrigger value="formations">Formations</TabsTrigger>
                            <TabsTrigger value="pressing">Pressing</TabsTrigger>
                            <TabsTrigger value="build-up">Build-up</TabsTrigger>
                            <TabsTrigger value="attacking">Attacking</TabsTrigger>
                        </TabsList>

                        <TabsContent value="formations" className="space-y-4">
                            <div className="flex items-center gap-4 mb-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedFormation(Math.max(0, selectedFormation - 1))}
                                    disabled={selectedFormation === 0}
                                >
                                    Previous
                                </Button>
                                <span className="text-white">
                                    Formation {selectedFormation + 1} of {tacticalAnalysis.formationChanges.length}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedFormation(Math.min(tacticalAnalysis.formationChanges.length - 1, selectedFormation + 1))}
                                    disabled={selectedFormation === tacticalAnalysis.formationChanges.length - 1}
                                >
                                    Next
                                </Button>
                            </div>

                            {currentFormation && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-white font-semibold">{currentFormation.formation}</h3>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span className="text-gray-400">{formatTime(currentFormation.timestamp)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {currentFormation.positions.map((pos, index) => {
                                            const player = playerTracking.find(p => p.playerId === pos.playerId);
                                            return (
                                                <div key={index} className="p-3 bg-gray-700/30 rounded-lg">
                                                    <div className="text-white font-medium">
                                                        {player?.jerseyNumber && `#${player.jerseyNumber} `}{player?.playerName || pos.playerId}
                                                    </div>
                                                    <div className="text-sm text-gray-400">{pos.position}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="pressing" className="space-y-4">
                            <div className="space-y-3">
                                {tacticalAnalysis.pressingMoments.map((moment, index) => (
                                    <div key={index} className="p-4 bg-gray-700/30 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge className={getIntensityColor(moment.intensity)}>
                                                {moment.intensity.toUpperCase()} PRESSING
                                            </Badge>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(moment.timestamp)}
                                            </div>
                                        </div>
                                        <p className="text-white text-sm mb-2">
                                            Duration: {moment.duration}s | Players: {moment.playersInvolved.length}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">
                                                {moment.playersInvolved.join(', ')}
                                            </span>
                                            <Badge variant="outline" className={
                                                moment.success
                                                    ? 'border-green-500/50 text-green-400'
                                                    : 'border-red-500/50 text-red-400'
                                            }>
                                                {moment.success ? 'Successful' : 'Failed'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="build-up" className="space-y-4">
                            <div className="space-y-3">
                                {tacticalAnalysis.buildUpPlay.map((play, index) => (
                                    <div key={index} className="p-4 bg-gray-700/30 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                                                BUILD-UP PLAY
                                            </Badge>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(play.timestamp)}
                                            </div>
                                        </div>
                                        <p className="text-white text-sm mb-2">
                                            Duration: {play.duration}s | Passes: {play.passes} | Players: {play.playersInvolved.length}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">
                                                {play.playersInvolved.join(', ')}
                                            </span>
                                            <Badge variant="outline" className={
                                                play.outcome === 'successful'
                                                    ? 'border-green-500/50 text-green-400'
                                                    : 'border-red-500/50 text-red-400'
                                            }>
                                                {play.outcome}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="attacking" className="space-y-4">
                            <div className="space-y-3">
                                {tacticalAnalysis.attackingPatterns.map((pattern, index) => (
                                    <div key={index} className="p-4 bg-gray-700/30 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                                                {pattern.type.replace('-', ' ').toUpperCase()}
                                            </Badge>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(pattern.timestamp)}
                                            </div>
                                        </div>
                                        <p className="text-white text-sm mb-2">
                                            Players: {pattern.playersInvolved.length}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">
                                                {pattern.playersInvolved.join(', ')}
                                            </span>
                                            <Badge variant="outline" className={
                                                pattern.outcome === 'goal' || pattern.outcome === 'shot'
                                                    ? 'border-green-500/50 text-green-400'
                                                    : 'border-red-500/50 text-red-400'
                                            }>
                                                {pattern.outcome}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Match Statistics */}
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-bright-pink" />
                        Match Statistics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Possession */}
                        <div className="space-y-3">
                            <h3 className="text-white font-semibold">Possession</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Home</span>
                                    <span className="text-white">{matchStatistics.possession.home}%</span>
                                </div>
                                <Progress value={matchStatistics.possession.home} className="h-2" />
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Away</span>
                                    <span className="text-white">{matchStatistics.possession.away}%</span>
                                </div>
                                <Progress value={matchStatistics.possession.away} className="h-2" />
                            </div>
                        </div>

                        {/* Shots */}
                        <div className="space-y-3">
                            <h3 className="text-white font-semibold">Shots</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Home</span>
                                    <span className="text-white">{matchStatistics.shots.home}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Away</span>
                                    <span className="text-white">{matchStatistics.shots.away}</span>
                                </div>
                            </div>
                        </div>

                        {/* Passes */}
                        <div className="space-y-3">
                            <h3 className="text-white font-semibold">Pass Accuracy</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Home</span>
                                    <span className="text-white">{matchStatistics.passes.accuracy.home}%</span>
                                </div>
                                <Progress value={matchStatistics.passes.accuracy.home} className="h-2" />
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Away</span>
                                    <span className="text-white">{matchStatistics.passes.accuracy.away}%</span>
                                </div>
                                <Progress value={matchStatistics.passes.accuracy.away} className="h-2" />
                            </div>
                        </div>
                    </div>

                    {/* Goals Timeline */}
                    {matchStatistics.goals.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-white font-semibold mb-3">Goals Timeline</h3>
                            <div className="space-y-2">
                                {matchStatistics.goals.map((goal, index) => (
                                    <div key={index} className="p-3 bg-gray-700/30 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                                                    GOAL
                                                </Badge>
                                                <span className="text-white">
                                                    {goal.type.replace('-', ' ').toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(goal.timestamp)}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-300 mt-1">
                                            {goal.fieldPosition} | Team: {goal.team}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default PlayerTrackingVisualization;
