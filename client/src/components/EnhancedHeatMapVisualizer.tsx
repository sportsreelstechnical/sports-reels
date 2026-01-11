import React, { useState, useRef, useEffect } from 'react';
import { SmartVideoPlayerRef } from './SmartVideoPlayer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { MapPin, Users, Activity, TrendingUp, Eye, EyeOff, Clock, Zap, Filter } from 'lucide-react';

interface HeatMapPoint {
    x: number;
    y: number;
    intensity: number;
    timestamp: number;
    confidence: number;
    action?: string;
}

interface PlayerTrackingData {
    playerId: string;
    playerName: string;
    jerseyNumber?: number;
    position: string;
    heatMapData: HeatMapPoint[];
    positions?: Array<{
        x: number;
        y: number;
        timestamp: number;
        confidence: number;
    }>;
}

interface EnhancedHeatMapVisualizerProps {
    playerTracking: PlayerTrackingData[];
    currentTime: number;
    onTimestampClick?: (timestamp: number) => void;
    videoRef?: React.RefObject<SmartVideoPlayerRef>;
}

const EnhancedHeatMapVisualizer: React.FC<EnhancedHeatMapVisualizerProps> = ({
    playerTracking,
    currentTime,
    onTimestampClick,
    videoRef
}) => {
    const [selectedPlayer, setSelectedPlayer] = useState<string>('');
    const [showAllPlayers, setShowAllPlayers] = useState(true);
    const [heatMapType, setHeatMapType] = useState<'movement' | 'activity' | 'intensity' | 'cumulative'>('cumulative');
    const [showTrails, setShowTrails] = useState(true);
    const [trailLength, setTrailLength] = useState(20);
    const [timeWindow, setTimeWindow] = useState([30]); // seconds
    const [showHeatZones, setShowHeatZones] = useState(true);
    const [heatMapOpacity, setHeatMapOpacity] = useState([0.7]);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Generate comprehensive heat map data from player positions
    const generateComprehensiveHeatMapData = (): HeatMapPoint[] => {
        const allPoints: HeatMapPoint[] = [];

        playerTracking.forEach(player => {
            if (player.positions && player.positions.length > 0) {
                player.positions.forEach((pos: any) => {
                    allPoints.push({
                        x: pos.x,
                        y: pos.y,
                        intensity: pos.confidence || 0.8,
                        timestamp: pos.timestamp,
                        confidence: pos.confidence || 0.8,
                        action: 'movement'
                    });
                });
            }
        });

        return allPoints;
    };

    // Get heat map data based on current time and settings
    const getFilteredHeatMapData = (): HeatMapPoint[] => {
        const allData = generateComprehensiveHeatMapData();
        const timeWindowSeconds = timeWindow[0];
        const startTime = currentTime - timeWindowSeconds;
        const endTime = currentTime + timeWindowSeconds;

        return allData.filter(point =>
            point.timestamp >= startTime &&
            point.timestamp <= endTime
        );
    };

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

        // Get filtered data
        const heatMapData = getFilteredHeatMapData();

        // Draw heat zones if enabled
        if (showHeatZones) {
            drawHeatZones(ctx, heatMapData, canvas.width, canvas.height);
        }

        // Draw player trails and positions
        drawPlayerTrails(ctx, canvas.width, canvas.height);

        // Draw current player positions
        drawCurrentPositions(ctx, canvas.width, canvas.height);
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

        // Penalty areas
        const penaltyWidth = width * 0.3;
        const penaltyHeight = height * 0.15;

        ctx.strokeRect((width - penaltyWidth) / 2, 0, penaltyWidth, penaltyHeight);
        ctx.strokeRect((width - penaltyWidth) / 2, height - penaltyHeight, penaltyWidth, penaltyHeight);

        // Goals
        const goalWidth = width * 0.06;
        const goalHeight = height * 0.08;
        ctx.strokeRect((width - goalWidth) / 2, 0, goalWidth, goalHeight);
        ctx.strokeRect((width - goalWidth) / 2, height - goalHeight, goalWidth, goalHeight);
    };

    const drawHeatZones = (ctx: CanvasRenderingContext2D, heatMapData: HeatMapPoint[], width: number, height: number) => {
        if (heatMapData.length === 0) return;

        // Create a grid for heat map
        const gridSize = 15;
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

        // Draw heat map with opacity
        const opacity = heatMapOpacity[0];
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const intensity = grid[y][x] / maxValue;
                if (intensity > 0.1) {
                    const color = getHeatMapColor(intensity);
                    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity * intensity})`;
                    ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
                }
            }
        }
    };

    const drawPlayerTrails = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        if (!showTrails) return;

        const playersToShow = showAllPlayers ? playerTracking : playerTracking.filter(p => p.playerId === selectedPlayer);
        const timeWindowSeconds = timeWindow[0];
        const startTime = currentTime - timeWindowSeconds;

        playersToShow.forEach((player, index) => {
            const playerColor = `hsl(${index * 60}, 70%, 50%)`;

            if (player.positions && player.positions.length > 0) {
                const relevantPositions = player.positions
                    .filter(pos => pos.timestamp >= startTime && pos.timestamp <= currentTime)
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .slice(-trailLength);

                if (relevantPositions.length > 1) {
                    ctx.strokeStyle = playerColor;
                    ctx.lineWidth = 3;
                    ctx.globalAlpha = 0.6;
                    ctx.beginPath();

                    relevantPositions.forEach((pos, i) => {
                        const x = (pos.x / 100) * width;
                        const y = (pos.y / 100) * height;

                        if (i === 0) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }
                    });
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                }
            }
        });
    };

    const drawCurrentPositions = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const playersToShow = showAllPlayers ? playerTracking : playerTracking.filter(p => p.playerId === selectedPlayer);

        playersToShow.forEach((player, index) => {
            const playerColor = `hsl(${index * 60}, 70%, 50%)`;

            if (player.positions && player.positions.length > 0) {
                // Find the closest position to current time
                const closestPosition = player.positions.reduce((closest: any, pos: any) => {
                    const currentDistance = Math.abs(pos.timestamp - currentTime);
                    const closestDistance = Math.abs(closest.timestamp - currentTime);
                    return currentDistance < closestDistance ? pos : closest;
                }, player.positions[0]);

                const x = (closestPosition.x / 100) * width;
                const y = (closestPosition.y / 100) * height;

                // Draw player circle
                const radius = 8;
                ctx.fillStyle = playerColor;
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
                    player.jerseyNumber ? `#${player.jerseyNumber}` : player.playerName.split(' ')[0],
                    x,
                    y + 3
                );

                // Position label
                ctx.font = '8px Arial';
                ctx.fillText(
                    player.position,
                    x,
                    y + radius + 12
                );
            }
        });
    };

    const getHeatMapColor = (intensity: number): { r: number; g: number; b: number } => {
        // Enhanced color gradient
        if (intensity < 0.2) {
            // Blue to Cyan
            const factor = intensity * 5;
            return { r: 0, g: Math.floor(255 * factor), b: 255 };
        } else if (intensity < 0.4) {
            // Cyan to Green
            const factor = (intensity - 0.2) * 5;
            return { r: 0, g: 255, b: Math.floor(255 * (1 - factor)) };
        } else if (intensity < 0.6) {
            // Green to Yellow
            const factor = (intensity - 0.4) * 5;
            return { r: Math.floor(255 * factor), g: 255, b: 0 };
        } else if (intensity < 0.8) {
            // Yellow to Orange
            const factor = (intensity - 0.6) * 5;
            return { r: 255, g: Math.floor(255 * (1 - factor * 0.5)), b: 0 };
        } else {
            // Orange to Red
            const factor = (intensity - 0.8) * 5;
            return { r: 255, g: Math.floor(255 * (0.5 - factor * 0.5)), b: 0 };
        }
    };

    const getHeatMapStats = () => {
        const heatMapData = getFilteredHeatMapData();
        const allData = generateComprehensiveHeatMapData();

        if (allData.length === 0) return {
            totalPoints: 0,
            averageIntensity: 0,
            maxIntensity: 0,
            timeWindowPoints: 0,
            coverage: 0
        };

        const totalPoints = allData.length;
        const timeWindowPoints = heatMapData.length;
        const averageIntensity = allData.reduce((sum, point) => sum + point.intensity, 0) / totalPoints;
        const maxIntensity = Math.max(...allData.map(point => point.intensity));

        // Calculate field coverage
        const uniquePositions = new Set();
        allData.forEach(point => {
            const gridX = Math.floor(point.x / 5);
            const gridY = Math.floor(point.y / 5);
            uniquePositions.add(`${gridX},${gridY}`);
        });
        const coverage = (uniquePositions.size / 400) * 100; // 20x20 grid = 400 cells

        return {
            totalPoints,
            averageIntensity,
            maxIntensity,
            timeWindowPoints,
            coverage
        };
    };

    useEffect(() => {
        if (playerTracking.length > 0 && !selectedPlayer) {
            setSelectedPlayer(playerTracking[0].playerId);
        }
    }, [playerTracking, selectedPlayer]);

    useEffect(() => {
        drawHeatMap();
    }, [selectedPlayer, showAllPlayers, heatMapType, currentTime, showTrails, trailLength, timeWindow, showHeatZones, heatMapOpacity]);

    const stats = getHeatMapStats();
    const currentPlayer = playerTracking.find(p => p.playerId === selectedPlayer);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-6">
            {/* Enhanced Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Player Selection */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300 text-sm font-medium">Player Display</span>
                    </div>
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

                        <Button
                            variant={showHeatZones ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowHeatZones(!showHeatZones)}
                            className={showHeatZones ? "bg-red-500 hover:bg-red-500/80" : "border-gray-600 text-gray-300"}
                        >
                            <MapPin className="w-4 h-4 mr-2" />
                            Heat Zones
                        </Button>
                    </div>
                </div>

                {/* Time Window Control */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300 text-sm font-medium">Time Window: {timeWindow[0]}s</span>
                    </div>
                    <Slider
                        value={timeWindow}
                        onValueChange={setTimeWindow}
                        max={120}
                        min={5}
                        step={5}
                        className="w-full"
                    />
                </div>
            </div>

            {/* Player Selection (when not showing all players) */}
            {!showAllPlayers && (
                <div className="space-y-3">
                    <span className="text-gray-300 text-sm font-medium">Select Player:</span>
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
                </div>
            )}

            {/* Heat Map Canvas */}
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    className="w-full h-96 border border-gray-600 rounded-lg cursor-crosshair"
                    onClick={(e) => {
                        if (onTimestampClick && currentPlayer) {
                            const rect = canvasRef.current?.getBoundingClientRect();
                            if (rect) {
                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                const y = ((e.clientY - rect.top) / rect.height) * 100;

                                // Find nearest timestamp based on click position
                                const nearestPoint = (currentPlayer.positions || []).reduce((nearest: any, point: any) => {
                                    const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
                                    const nearestDistance = Math.sqrt(Math.pow(nearest.x - x, 2) + Math.pow(nearest.y - y, 2));
                                    return distance < nearestDistance ? point : nearest;
                                }, currentPlayer.positions?.[0] || { timestamp: 0 });

                                onTimestampClick(nearestPoint.timestamp);
                            }
                        }
                    }}
                />

                {/* Enhanced Heat Map Legend */}
                <div className="absolute top-4 right-4 bg-gray-800/80 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-white text-sm font-medium mb-2">Heat Intensity</div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                            <span className="text-xs text-gray-300">Low</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded"></div>
                            <span className="text-xs text-gray-300">Medium</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                            <span className="text-xs text-gray-300">High</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-500 rounded"></div>
                            <span className="text-xs text-gray-300">Very High</span>
                        </div>
                    </div>
                </div>

                {/* Time Info Overlay */}
                <div className="absolute bottom-4 left-4 bg-gray-800/80 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-white text-sm font-medium">
                        Current Time: {formatTime(currentTime)}
                    </div>
                    <div className="text-gray-400 text-xs">
                        Window: ±{timeWindow[0]}s
                    </div>
                </div>
            </div>

            {/* Enhanced Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-gray-700/30 rounded-lg">
                    <div className="text-2xl font-bold text-white">{stats.totalPoints}</div>
                    <div className="text-xs text-gray-400">Total Points</div>
                </div>
                <div className="p-4 bg-gray-700/30 rounded-lg">
                    <div className="text-2xl font-bold text-white">{stats.timeWindowPoints}</div>
                    <div className="text-xs text-gray-400">In Window</div>
                </div>
                <div className="p-4 bg-gray-700/30 rounded-lg">
                    <div className="text-2xl font-bold text-white">{Math.round(stats.averageIntensity * 100)}%</div>
                    <div className="text-xs text-gray-400">Avg Intensity</div>
                </div>
                <div className="p-4 bg-gray-700/30 rounded-lg">
                    <div className="text-2xl font-bold text-white">{Math.round(stats.maxIntensity * 100)}%</div>
                    <div className="text-xs text-gray-400">Max Intensity</div>
                </div>
                <div className="p-4 bg-gray-700/30 rounded-lg">
                    <div className="text-2xl font-bold text-white">{Math.round(stats.coverage)}%</div>
                    <div className="text-xs text-gray-400">Field Coverage</div>
                </div>
            </div>

            {/* Trail Length and Opacity Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-white text-sm font-medium">Trail Length: {trailLength} points</label>
                    <Slider
                        value={[trailLength]}
                        onValueChange={(value) => setTrailLength(value[0])}
                        max={50}
                        min={5}
                        step={5}
                        className="w-full"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-white text-sm font-medium">Heat Map Opacity: {Math.round(heatMapOpacity[0] * 100)}%</label>
                    <Slider
                        value={heatMapOpacity}
                        onValueChange={setHeatMapOpacity}
                        max={1}
                        min={0.1}
                        step={0.1}
                        className="w-full"
                    />
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
                            <div className="text-lg font-semibold text-white">{currentPlayer.positions?.length || 0}</div>
                            <div className="text-xs text-gray-400">Position Points</div>
                        </div>
                        <div className="p-3 bg-gray-700/30 rounded-lg">
                            <div className="text-lg font-semibold text-white">{currentPlayer.position}</div>
                            <div className="text-xs text-gray-400">Position</div>
                        </div>
                        <div className="p-3 bg-gray-700/30 rounded-lg">
                            <div className="text-lg font-semibold text-white">
                                {currentPlayer.totalDistance?.toFixed(1) || 'N/A'}m
                            </div>
                            <div className="text-xs text-gray-400">Distance</div>
                        </div>
                        <div className="p-3 bg-gray-700/30 rounded-lg">
                            <div className="text-lg font-semibold text-white">
                                {currentPlayer.averageSpeed?.toFixed(1) || 'N/A'} km/h
                            </div>
                            <div className="text-xs text-gray-400">Avg Speed</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedHeatMapVisualizer;
