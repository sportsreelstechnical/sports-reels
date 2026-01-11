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
    TrendingDown,
    Award,
    Zap,
    Clock,
    BarChart3,
    Star,
    ArrowUp,
    ArrowDown,
    Play,
    Eye
} from 'lucide-react';

interface PlayerPerformanceData {
    playerId: string;
    playerName: string;
    jerseyNumber?: number;
    position: string;
    overallRating: number;
    technicalRating: number;
    tacticalRating: number;
    physicalRating: number;
    keyActions: number;
    influence: number;
    performanceMetrics: {
        goals: number;
        assists: number;
        passes: number;
        tackles: number;
        shots: number;
        saves?: number;
        interceptions: number;
        fouls: number;
        yellowCards: number;
        redCards: number;
    };
    keyMoments: Array<{
        timestamp: number;
        type: string;
        description: string;
        importance: 'low' | 'medium' | 'high' | 'critical';
        outcome: 'successful' | 'failed' | 'neutral';
    }>;
    performanceTrends: Array<{
        period: string;
        rating: number;
        actions: number;
    }>;
}

interface PlayerPerformanceAnalysisProps {
    playerTracking: any[];
    matchStatistics: any;
    onTimestampClick?: (timestamp: number) => void;
}

const PlayerPerformanceAnalysis: React.FC<PlayerPerformanceAnalysisProps> = ({
    playerTracking,
    matchStatistics,
    onTimestampClick
}) => {
    const [selectedPlayer, setSelectedPlayer] = useState<string>('');
    const [selectedMetric, setSelectedMetric] = useState<string>('overall');

    useEffect(() => {
        if (playerTracking.length > 0 && !selectedPlayer) {
            setSelectedPlayer(playerTracking[0].playerId);
        }
    }, [playerTracking, selectedPlayer]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getPerformanceColor = (rating: number) => {
        if (rating >= 8) return 'text-green-400';
        if (rating >= 6) return 'text-yellow-400';
        if (rating >= 4) return 'text-orange-400';
        return 'text-red-400';
    };

    const getPerformanceBadgeColor = (rating: number) => {
        if (rating >= 8) return 'bg-green-500/20 text-green-400 border-green-500/50';
        if (rating >= 6) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
        if (rating >= 4) return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
        return 'bg-red-500/20 text-red-400 border-red-500/50';
    };

    const getActionTypeColor = (type: string) => {
        const colors: { [key: string]: string } = {
            'goal': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
            'assist': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
            'save': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
            'tackle': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
            'pass': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
            'shot': 'bg-red-500/20 text-red-400 border-red-500/50',
            'interception': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
            'foul': 'bg-gray-500/20 text-gray-400 border-gray-500/50'
        };
        return colors[type.toLowerCase()] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    };

    const getImportanceColor = (importance: string) => {
        const colors: { [key: string]: string } = {
            'critical': 'bg-red-500/20 text-red-400 border-red-500/50',
            'high': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
            'medium': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
            'low': 'bg-gray-500/20 text-gray-400 border-gray-500/50'
        };
        return colors[importance] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    };

    // Generate performance data from player tracking
    const generatePerformanceData = (): PlayerPerformanceData[] => {
        return playerTracking.map(player => {
            // Extract performance metrics from key moments
            const metrics = {
                goals: player.keyMoments.filter((m: any) => m.type === 'goal').length,
                assists: player.keyMoments.filter((m: any) => m.type === 'assist').length,
                passes: player.keyMoments.filter((m: any) => m.type === 'pass').length,
                tackles: player.keyMoments.filter((m: any) => m.type === 'tackle').length,
                shots: player.keyMoments.filter((m: any) => m.type === 'shot').length,
                saves: player.keyMoments.filter((m: any) => m.type === 'save').length,
                interceptions: player.keyMoments.filter((m: any) => m.type === 'interception').length,
                fouls: player.keyMoments.filter((m: any) => m.type === 'foul').length,
                yellowCards: player.keyMoments.filter((m: any) => m.type === 'yellow card').length,
                redCards: player.keyMoments.filter((m: any) => m.type === 'red card').length,
            };

            // Calculate ratings based on performance
            const totalActions = player.keyMoments.length;
            const successfulActions = player.keyMoments.filter((m: any) => m.outcome === 'successful').length;
            const successRate = totalActions > 0 ? successfulActions / totalActions : 0;

            const technicalRating = Math.min(10, Math.max(1,
                (metrics.passes * 0.1) + (metrics.shots * 0.2) + (successRate * 5) + 3
            ));

            const tacticalRating = Math.min(10, Math.max(1,
                (metrics.assists * 0.3) + (metrics.interceptions * 0.2) + (successRate * 4) + 3
            ));

            const physicalRating = Math.min(10, Math.max(1,
                (player.totalDistance / 1000) * 0.5 + (player.maxSpeed / 10) * 0.3 + (metrics.tackles * 0.2) + 3
            ));

            const overallRating = (technicalRating + tacticalRating + physicalRating) / 3;

            // Generate performance trends (simulated based on current data)
            const performanceTrends = [
                { period: '1st Half', rating: overallRating * 0.9, actions: Math.floor(totalActions * 0.4) },
                { period: '2nd Half', rating: overallRating * 1.1, actions: Math.floor(totalActions * 0.6) }
            ];

            return {
                playerId: player.playerId,
                playerName: player.playerName,
                jerseyNumber: player.jerseyNumber,
                position: player.position,
                overallRating: Math.round(overallRating * 10) / 10,
                technicalRating: Math.round(technicalRating * 10) / 10,
                tacticalRating: Math.round(tacticalRating * 10) / 10,
                physicalRating: Math.round(physicalRating * 10) / 10,
                keyActions: totalActions,
                influence: Math.round((totalActions / Math.max(1, playerTracking.length)) * 10) / 10,
                performanceMetrics: metrics,
                keyMoments: player.keyMoments.map((moment: any) => ({
                    timestamp: moment.timestamp,
                    type: moment.type,
                    description: moment.description,
                    importance: moment.importance || (moment.outcome === 'successful' ? 'high' : 'medium'),
                    outcome: moment.outcome || 'neutral'
                })),
                performanceTrends
            };
        });
    };

    const performanceData = generatePerformanceData();
    const currentPlayer = performanceData.find(p => p.playerId === selectedPlayer);

    if (!currentPlayer) {
        return (
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No player performance data available</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Player Selection */}
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-bright-pink" />
                        Player Performance Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {performanceData.map((player) => (
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

            {/* Player Performance Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Overall Performance */}
                <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Award className="w-5 h-5 text-bright-pink" />
                            Overall Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center">
                            <div className={`text-4xl font-bold ${getPerformanceColor(currentPlayer.overallRating)}`}>
                                {currentPlayer.overallRating}/10
                            </div>
                            <div className="text-gray-400 text-sm">Overall Rating</div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Technical</span>
                                <span className={`font-semibold ${getPerformanceColor(currentPlayer.technicalRating)}`}>
                                    {currentPlayer.technicalRating}/10
                                </span>
                            </div>
                            <Progress value={currentPlayer.technicalRating * 10} className="h-2" />

                            <div className="flex justify-between">
                                <span className="text-gray-400">Tactical</span>
                                <span className={`font-semibold ${getPerformanceColor(currentPlayer.tacticalRating)}`}>
                                    {currentPlayer.tacticalRating}/10
                                </span>
                            </div>
                            <Progress value={currentPlayer.tacticalRating * 10} className="h-2" />

                            <div className="flex justify-between">
                                <span className="text-gray-400">Physical</span>
                                <span className={`font-semibold ${getPerformanceColor(currentPlayer.physicalRating)}`}>
                                    {currentPlayer.physicalRating}/10
                                </span>
                            </div>
                            <Progress value={currentPlayer.physicalRating * 10} className="h-2" />
                        </div>
                    </CardContent>
                </Card>

                {/* Key Metrics */}
                <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-bright-pink" />
                            Key Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-white">{currentPlayer.performanceMetrics.goals}</div>
                                <div className="text-xs text-gray-400">Goals</div>
                            </div>
                            <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-white">{currentPlayer.performanceMetrics.assists}</div>
                                <div className="text-xs text-gray-400">Assists</div>
                            </div>
                            <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-white">{currentPlayer.performanceMetrics.passes}</div>
                                <div className="text-xs text-gray-400">Passes</div>
                            </div>
                            <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-white">{currentPlayer.performanceMetrics.tackles}</div>
                                <div className="text-xs text-gray-400">Tackles</div>
                            </div>
                            <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-white">{currentPlayer.performanceMetrics.shots}</div>
                                <div className="text-xs text-gray-400">Shots</div>
                            </div>
                            <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-white">{currentPlayer.keyActions}</div>
                                <div className="text-xs text-gray-400">Total Actions</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Performance Trends */}
                <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-bright-pink" />
                            Performance Trends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {currentPlayer.performanceTrends.map((trend, index) => (
                                <div key={index} className="p-3 bg-gray-700/30 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-white font-medium">{trend.period}</span>
                                        <Badge className={getPerformanceBadgeColor(trend.rating)}>
                                            {trend.rating}/10
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-400">
                                        <span>{trend.actions} actions</span>
                                        <span>Rating: {trend.rating.toFixed(1)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Key Moments */}
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-bright-pink" />
                        Key Moments - {currentPlayer.playerName}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {currentPlayer.keyMoments.map((moment, index) => (
                            <div
                                key={index}
                                className="p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors"
                                onClick={() => onTimestampClick?.(moment.timestamp)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <Badge className={getActionTypeColor(moment.type)}>
                                        {moment.type.toUpperCase()}
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                        <Badge className={getImportanceColor(moment.importance)}>
                                            {moment.importance.toUpperCase()}
                                        </Badge>
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(moment.timestamp)}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-white text-sm mb-2">{moment.description}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">{currentPlayer.position}</span>
                                    <Badge variant="outline" className={
                                        moment.outcome === 'successful'
                                            ? 'border-green-500/50 text-green-400'
                                            : moment.outcome === 'failed'
                                                ? 'border-red-500/50 text-red-400'
                                                : 'border-gray-500/50 text-gray-400'
                                    }>
                                        {moment.outcome}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Performance Comparison */}
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-bright-pink" />
                        Team Performance Comparison
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {performanceData
                            .sort((a, b) => b.overallRating - a.overallRating)
                            .map((player, index) => (
                                <div key={player.playerId} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-bright-pink/20 rounded-full flex items-center justify-center text-bright-pink font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="text-white font-medium">
                                                {player.jerseyNumber && `#${player.jerseyNumber} `}{player.playerName}
                                            </div>
                                            <div className="text-gray-400 text-sm">{player.position}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className={`text-lg font-bold ${getPerformanceColor(player.overallRating)}`}>
                                                {player.overallRating}/10
                                            </div>
                                            <div className="text-xs text-gray-400">{player.keyActions} actions</div>
                                        </div>
                                        <Badge className={getPerformanceBadgeColor(player.overallRating)}>
                                            {player.overallRating >= 8 ? 'Excellent' :
                                                player.overallRating >= 6 ? 'Good' :
                                                    player.overallRating >= 4 ? 'Average' : 'Poor'}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PlayerPerformanceAnalysis;
