import React, { useState, useRef, useEffect } from 'react';
import { SmartVideoPlayerRef } from './SmartVideoPlayer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Users, Activity, TrendingUp, Eye, EyeOff } from 'lucide-react';

interface HeatMapPoint {
    x: number;
    y: number;
    intensity: number;
    timestamp: number;
}

interface PlayerTrackingData {
    playerId: string;
    playerName: string;
    jerseyNumber?: number;
    position: string;
    heatMapData: HeatMapPoint[];
}

interface HeatMapVisualizationProps {
    playerTracking: PlayerTrackingData[];
    onTimestampClick?: (timestamp: number) => void;
    currentTime?: number;
}

const HeatMapVisualization: React.FC<HeatMapVisualizationProps> = ({
    playerTracking,
    onTimestampClick,
    currentTime = 0
}) => {
    const [selectedPlayer, setSelectedPlayer] = useState<string>('');
    const [showAllPlayers, setShowAllPlayers] = useState(true);
    const [heatMapType, setHeatMapType] = useState<'movement' | 'activity' | 'intensity'>('movement');
    const [showTrails, setShowTrails] = useState(true);
    const [trailLength, setTrailLength] = useState(10);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const drawPlayerPositions = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const playersToShow = showAllPlayers ? playerTracking : playerTracking.filter(p => p.playerId === selectedPlayer);

        playersToShow.forEach((player, index) => {
            const playerColor = `hsl(${index * 60}, 70%, 50%)`;
            const recentPoints = player.heatMapData
                .filter(point => point.timestamp <= currentTime)
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, trailLength);

            // Draw player trail if enabled
            if (showTrails && recentPoints.length > 1) {
                ctx.strokeStyle = playerColor;
                ctx.lineWidth = 3;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();

                for (let i = 0; i < recentPoints.length - 1; i++) {
                    const point = recentPoints[i];
                    const nextPoint = recentPoints[i + 1];
                    const x = (point.x / 100) * width;
                    const y = (point.y / 100) * height;
                    const nextX = (nextPoint.x / 100) * width;
                    const nextY = (nextPoint.y / 100) * height;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }

            // Draw current position
            const currentPosition = recentPoints[0];
            if (currentPosition) {
                const x = (currentPosition.x / 100) * width;
                const y = (currentPosition.y / 100) * height;

                // Draw player circle with intensity-based size
                const intensity = currentPosition.intensity || 0.8;
                const radius = Math.max(6, Math.min(12, 6 + intensity * 6));

                ctx.fillStyle = playerColor;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI);
                ctx.fill();

                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw player info
                ctx.fillStyle = 'white';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(
                    player.jerseyNumber ? `#${player.jerseyNumber}` : player.playerName.split(' ')[0],
                    x,
                    y - radius - 5
                );

                // Draw position label
                ctx.font = '8px Arial';
                ctx.fillText(
                    player.position,
                    x,
                    y + radius + 12
                );
            }
        });
    };

    useEffect(() => {
        if (playerTracking.length > 0 && !selectedPlayer) {
            setSelectedPlayer(playerTracking[0].playerId);
        }
    }, [playerTracking, selectedPlayer]);

    useEffect(() => {
        drawHeatMap();
    }, [selectedPlayer, showAllPlayers, heatMapType, currentTime, showTrails, trailLength]);

    const drawHeatMap = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

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

        // Get heat map data
        const heatMapData = showAllPlayers
            ? getAllPlayersHeatMapData()
            : getPlayerHeatMapData(selectedPlayer);

        // Draw heat map
        drawHeatMapData(ctx, heatMapData, canvas.width, canvas.height);

        // Draw player positions
        drawPlayerPositions(ctx, canvas.width, canvas.height);
    };

    const drawField = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        // Field background
        ctx.fillStyle = 'rgba(34, 197, 94, 0.1)'; // Green with transparency
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

        // Penalty areas
        const penaltyWidth = width * 0.3;
        const penaltyHeight = height * 0.15;

        // Top penalty area
        ctx.strokeRect((width - penaltyWidth) / 2, 0, penaltyWidth, penaltyHeight);

        // Bottom penalty area
        ctx.strokeRect((width - penaltyWidth) / 2, height - penaltyHeight, penaltyWidth, penaltyHeight);

        // Goals
        const goalWidth = width * 0.06;
        const goalHeight = height * 0.08;

        // Top goal
        ctx.strokeRect((width - goalWidth) / 2, 0, goalWidth, goalHeight);

        // Bottom goal
        ctx.strokeRect((width - goalWidth) / 2, height - goalHeight, goalWidth, goalHeight);
    };

    const getPlayerHeatMapData = (playerId: string): HeatMapPoint[] => {
        const player = playerTracking.find(p => p.playerId === playerId);
        return player?.heatMapData || [];
    };

    const getAllPlayersHeatMapData = (): HeatMapPoint[] => {
        return playerTracking.flatMap(player => player.heatMapData);
    };

    const drawHeatMapData = (ctx: CanvasRenderingContext2D, heatMapData: HeatMapPoint[], width: number, height: number) => {
        if (heatMapData.length === 0) return;

        // Create a grid for heat map
        const gridSize = 20;
        const gridWidth = Math.ceil(width / gridSize);
        const gridHeight = Math.ceil(height / gridSize);
        const grid: number[][] = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(0));

        // Populate grid with heat map data
        heatMapData.forEach(point => {
            const gridX = Math.floor((point.x / 100) * gridWidth);
            const gridY = Math.floor((point.y / 100) * gridHeight);

            if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
                grid[gridY][gridX] += point.intensity;
            }
        });

        // Normalize grid values
        const maxValue = Math.max(...grid.flat());
        if (maxValue === 0) return;

        // Draw heat map
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const intensity = grid[y][x] / maxValue;
                if (intensity > 0) {
                    const alpha = Math.min(intensity * 0.8, 0.8);
                    const color = getHeatMapColor(intensity);

                    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
                    ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
                }
            }
        }

        // Draw individual points for high-intensity areas
        heatMapData.forEach(point => {
            if (point.intensity > 0.7) {
                const x = (point.x / 100) * width;
                const y = (point.y / 100) * height;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    };

    const getHeatMapColor = (intensity: number): { r: number; g: number; b: number } => {
        // Blue to Red gradient
        if (intensity < 0.25) {
            // Blue
            return { r: 0, g: 0, b: Math.floor(255 * intensity * 4) };
        } else if (intensity < 0.5) {
            // Blue to Green
            const factor = (intensity - 0.25) * 4;
            return { r: 0, g: Math.floor(255 * factor), b: Math.floor(255 * (1 - factor)) };
        } else if (intensity < 0.75) {
            // Green to Yellow
            const factor = (intensity - 0.5) * 4;
            return { r: Math.floor(255 * factor), g: 255, b: 0 };
        } else {
            // Yellow to Red
            const factor = (intensity - 0.75) * 4;
            return { r: 255, g: Math.floor(255 * (1 - factor)), b: 0 };
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getHeatMapStats = () => {
        const data = showAllPlayers ? getAllPlayersHeatMapData() : getPlayerHeatMapData(selectedPlayer);

        if (data.length === 0) return { totalPoints: 0, averageIntensity: 0, maxIntensity: 0 };

        const totalPoints = data.length;
        const averageIntensity = data.reduce((sum, point) => sum + point.intensity, 0) / totalPoints;
        const maxIntensity = Math.max(...data.map(point => point.intensity));

        return { totalPoints, averageIntensity, maxIntensity };
    };

    const stats = getHeatMapStats();
    const currentPlayer = playerTracking.find(p => p.playerId === selectedPlayer);

    return (
        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-bright-pink" />
                    Heat Map Analysis
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant={showAllPlayers ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowAllPlayers(!showAllPlayers)}
                            className={showAllPlayers ? "bg-bright-pink hover:bg-bright-pink/80" : "border-gray-600 text-gray-300"}
                        >
                            {showAllPlayers ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                            {showAllPlayers ? 'All Players' : 'Individual'}
                        </Button>

                        <Button
                            variant={showTrails ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowTrails(!showTrails)}
                            className={showTrails ? "bg-blue-500 hover:bg-blue-500/80" : "border-gray-600 text-gray-300"}
                        >
                            <Activity className="w-4 h-4 mr-2" />
                            {showTrails ? 'Trails On' : 'Trails Off'}
                        </Button>
                    </div>

                    <Tabs value={heatMapType} onValueChange={(value) => setHeatMapType(value as any)}>
                        <TabsList className="bg-gray-700/30">
                            <TabsTrigger value="movement">Movement</TabsTrigger>
                            <TabsTrigger value="activity">Activity</TabsTrigger>
                            <TabsTrigger value="intensity">Intensity</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Player Selection (when not showing all players) */}
                {!showAllPlayers && (
                    <div className="flex flex-wrap gap-2">
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
                )}

                {/* Heat Map Canvas */}
                <div className="relative">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-96 border border-gray-600 rounded-lg cursor-crosshair"
                        onClick={(e) => {
                            if (onTimestampClick && currentPlayer) {
                                // Find nearest timestamp based on click position
                                const rect = canvasRef.current?.getBoundingClientRect();
                                if (rect) {
                                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                                    const y = ((e.clientY - rect.top) / rect.height) * 100;

                                    const nearestPoint = currentPlayer.heatMapData.reduce((nearest, point) => {
                                        const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
                                        const nearestDistance = Math.sqrt(Math.pow(nearest.x - x, 2) + Math.pow(nearest.y - y, 2));
                                        return distance < nearestDistance ? point : nearest;
                                    });

                                    onTimestampClick(nearestPoint.timestamp);
                                }
                            }
                        }}
                    />

                    {/* Heat Map Legend */}
                    <div className="absolute top-4 right-4 bg-gray-800/80 backdrop-blur-sm rounded-lg p-3">
                        <div className="text-white text-sm font-medium mb-2">Heat Intensity</div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                            <span className="text-xs text-gray-300">Low</span>
                            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                            <span className="text-xs text-gray-300">Medium</span>
                            <div className="w-4 h-4 bg-red-500 rounded"></div>
                            <span className="text-xs text-gray-300">High</span>
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-700/30 rounded-lg">
                        <div className="text-2xl font-bold text-white">{stats.totalPoints}</div>
                        <div className="text-xs text-gray-400">Data Points</div>
                    </div>
                    <div className="p-4 bg-gray-700/30 rounded-lg">
                        <div className="text-2xl font-bold text-white">{Math.round(stats.averageIntensity * 100)}%</div>
                        <div className="text-xs text-gray-400">Avg Intensity</div>
                    </div>
                    <div className="p-4 bg-gray-700/30 rounded-lg">
                        <div className="text-2xl font-bold text-white">{Math.round(stats.maxIntensity * 100)}%</div>
                        <div className="text-xs text-gray-400">Max Intensity</div>
                    </div>
                </div>

                {/* Player Information */}
                {!showAllPlayers && currentPlayer && (
                    <div className="space-y-3">
                        <h4 className="text-white font-semibold">
                            {currentPlayer.jerseyNumber && `#${currentPlayer.jerseyNumber} `}{currentPlayer.playerName}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 bg-gray-700/30 rounded-lg">
                                <div className="text-lg font-semibold text-white">{currentPlayer.heatMapData.length}</div>
                                <div className="text-xs text-gray-400">Heat Points</div>
                            </div>
                            <div className="p-3 bg-gray-700/30 rounded-lg">
                                <div className="text-lg font-semibold text-white">{currentPlayer.position}</div>
                                <div className="text-xs text-gray-400">Position</div>
                            </div>
                            <div className="p-3 bg-gray-700/30 rounded-lg">
                                <div className="text-lg font-semibold text-white">{currentPlayer.totalDistance?.toFixed(1) || 0}m</div>
                                <div className="text-xs text-gray-400">Distance</div>
                            </div>
                            <div className="p-3 bg-gray-700/30 rounded-lg">
                                <div className="text-lg font-semibold text-white">{currentPlayer.averageSpeed?.toFixed(1) || 0} km/h</div>
                                <div className="text-xs text-gray-400">Avg Speed</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Heat Map Type Information */}
                <div className="p-4 bg-gray-700/20 rounded-lg">
                    <h4 className="text-white font-semibold mb-2">Heat Map Types</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                        <div>
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 mr-2">Movement</Badge>
                            Shows where players have been positioned throughout the match
                        </div>
                        <div>
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 mr-2">Activity</Badge>
                            Highlights areas of high player activity and engagement
                        </div>
                        <div>
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/50 mr-2">Intensity</Badge>
                            Displays areas of high-intensity actions and key moments
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default HeatMapVisualization;
