import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
    Zap, TrendingUp, Target, Users, DollarSign, AlertTriangle,
    CheckCircle, Clock, Star, BarChart3, Globe, Shield
} from 'lucide-react';
import {
    analyzePlayer,
    analyzeTransferMarketTrends,
    analyzeTeamFit,
    PlayerAnalysis,
    TransferMarketAnalysis,
    TeamFitAnalysis
} from '@/domains/video/services/geminiService';

interface EnhancedAIAnalysisProps {
    playerData?: {
        name: string;
        position: string;
        age: number;
        height?: number;
        weight?: number;
        citizenship: string;
        currentClub?: string;
        marketValue?: number;
        stats: any;
        recentPerformance: string[];
        bio?: string;
    };
}

export const EnhancedAIAnalysis: React.FC<EnhancedAIAnalysisProps> = ({
    playerData
}) => {
    const [playerAnalysis, setPlayerAnalysis] = useState<PlayerAnalysis | null>(null);
    const [marketAnalysis, setMarketAnalysis] = useState<TransferMarketAnalysis | null>(null);
    const [teamFitAnalysis, setTeamFitAnalysis] = useState<TeamFitAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('player');

    const runPlayerAnalysis = async () => {
        if (!playerData) return;

        setLoading(true);
        try {
            const analysis = await analyzePlayer(playerData);
            setPlayerAnalysis(analysis);
        } catch (error) {
            console.error('Error running player analysis:', error);
        } finally {
            setLoading(false);
        }
    };

    const runMarketAnalysis = async () => {
        if (!playerData) return;

        setLoading(true);
        try {
            const analysis = await analyzeTransferMarketTrends(
                playerData.position,
                playerData.age,
                'Premier League' // Default target league
            );
            setMarketAnalysis(analysis);
        } catch (error) {
            console.error('Error running market analysis:', error);
        } finally {
            setLoading(false);
        }
    };

    const runTeamFitAnalysis = async () => {
        if (!playerData || !playerAnalysis) return;

        setLoading(true);
        try {
            const analysis = await analyzeTeamFit(
                {
                    name: playerData.name,
                    position: playerData.position,
                    age: playerData.age,
                    playingStyle: playerAnalysis.playingStyle,
                    strengths: playerAnalysis.strengths,
                    citizenship: playerData.citizenship
                },
                'Premier League'
            );
            setTeamFitAnalysis(analysis);
        } catch (error) {
            console.error('Error running team fit analysis:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getRatingColor = (rating: number) => {
        if (rating >= 85) return 'text-green-600';
        if (rating >= 75) return 'text-blue-600';
        if (rating >= 65) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        <Zap className="w-6 h-6 text-rosegold" />
                        Enhanced AI Analysis
                    </h2>
                    <p className="text-gray-400">
                        Advanced AI-powered insights for transfer market decisions
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={runPlayerAnalysis}
                        disabled={loading || !playerData}
                        className="bg-rosegold hover:bg-rosegold/90 text-black"
                    >
                        <Target className="w-4 h-4 mr-2" />
                        Player Analysis
                    </Button>

                    <Button
                        onClick={runMarketAnalysis}
                        disabled={loading || !playerData}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Market Trends
                    </Button>

                    <Button
                        onClick={runTeamFitAnalysis}
                        disabled={loading || !playerData || !playerAnalysis}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Users className="w-4 h-4 mr-2" />
                        Team Fit
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-800 p-1 rounded-lg">
                    <TabsTrigger
                        value="player"
                        className="font-poppins data-[state=active]:bg-rosegold data-[state=active]:text-black"
                    >
                        Player Analysis
                    </TabsTrigger>
                    <TabsTrigger
                        value="market"
                        className="font-poppins data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                    >
                        Market Trends
                    </TabsTrigger>
                    <TabsTrigger
                        value="team-fit"
                        className="font-poppins data-[state=active]:bg-green-600 data-[state=active]:text-white"
                    >
                        Team Fit
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="player" className="space-y-6 mt-6">
                    {loading ? (
                        <Card className="bg-gray-800 border-rosegold/20">
                            <CardContent className="p-8">
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-rosegold border-t-transparent"></div>
                                </div>
                                <p className="text-center text-gray-400 mt-4">Analyzing player performance...</p>
                            </CardContent>
                        </Card>
                    ) : playerAnalysis ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Market Value & Ratings */}
                            <div className="space-y-4">
                                <Card className="bg-gray-800 border-rosegold/20">
                                    <CardHeader>
                                        <CardTitle className="text-rosegold flex items-center gap-2">
                                            <DollarSign className="w-5 h-5" />
                                            Market Value
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold text-white">
                                            {formatCurrency(playerAnalysis.marketValue)}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gray-800 border-rosegold/20">
                                    <CardHeader>
                                        <CardTitle className="text-rosegold flex items-center gap-2">
                                            <Star className="w-5 h-5" />
                                            Performance Ratings
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-gray-400">Current Rating</span>
                                                <span className={`font-bold ${getRatingColor(playerAnalysis.overallRating)}`}>
                                                    {playerAnalysis.overallRating}/100
                                                </span>
                                            </div>
                                            <Progress value={playerAnalysis.overallRating} className="h-2" />
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-gray-400">Potential Rating</span>
                                                <span className={`font-bold ${getRatingColor(playerAnalysis.potentialRating)}`}>
                                                    {playerAnalysis.potentialRating}/100
                                                </span>
                                            </div>
                                            <Progress value={playerAnalysis.potentialRating} className="h-2" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Strengths & Weaknesses */}
                            <div className="space-y-4">
                                <Card className="bg-gray-800 border-green-500/20">
                                    <CardHeader>
                                        <CardTitle className="text-green-500 flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5" />
                                            Key Strengths
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {playerAnalysis.strengths.map((strength, index) => (
                                                <Badge key={index} variant="outline" className="border-green-500 text-green-400">
                                                    {strength}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gray-800 border-red-500/20">
                                    <CardHeader>
                                        <CardTitle className="text-red-500 flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5" />
                                            Areas for Improvement
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {playerAnalysis.weaknesses.map((weakness, index) => (
                                                <Badge key={index} variant="outline" className="border-red-500 text-red-400">
                                                    {weakness}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Transfer Recommendation */}
                            <Card className="bg-gray-800 border-rosegold/20 lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="text-rosegold flex items-center gap-2">
                                        <Target className="w-5 h-5" />
                                        Transfer Recommendation
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-300 leading-relaxed">
                                        {playerAnalysis.transferRecommendation}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Playing Style & Comparable Players */}
                            <Card className="bg-gray-800 border-blue-500/20 lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="text-blue-500 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5" />
                                        Playing Style & Comparisons
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h4 className="text-white font-semibold mb-2">Playing Style</h4>
                                        <p className="text-gray-300">{playerAnalysis.playingStyle}</p>
                                    </div>

                                    <div>
                                        <h4 className="text-white font-semibold mb-2">Comparable Players</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {playerAnalysis.comparisonPlayers.map((player, index) => (
                                                <Badge key={index} variant="outline" className="border-blue-500 text-blue-400">
                                                    {player}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <Card className="bg-gray-800 border-rosegold/20">
                            <CardContent className="p-8 text-center">
                                <Target className="w-12 h-12 mx-auto mb-4 text-rosegold" />
                                <h3 className="text-xl font-bold text-white mb-2">Player Analysis</h3>
                                <p className="text-gray-400 mb-4">
                                    Get comprehensive AI-powered analysis of player performance, market value, and transfer potential.
                                </p>
                                <Button
                                    onClick={runPlayerAnalysis}
                                    disabled={!playerData}
                                    className="bg-rosegold hover:bg-rosegold/90 text-black"
                                >
                                    <Zap className="w-4 h-4 mr-2" />
                                    Start Analysis
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="market" className="space-y-6 mt-6">
                    {loading ? (
                        <Card className="bg-gray-800 border-blue-500/20">
                            <CardContent className="p-8">
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                                </div>
                                <p className="text-center text-gray-400 mt-4">Analyzing market trends...</p>
                            </CardContent>
                        </Card>
                    ) : marketAnalysis ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Market Trends */}
                            <Card className="bg-gray-800 border-blue-500/20">
                                <CardHeader>
                                    <CardTitle className="text-blue-500 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5" />
                                        Market Trends
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {marketAnalysis.marketTrends.map((trend, index) => (
                                            <div key={index} className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <p className="text-gray-300 text-sm">{trend}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Position Demand */}
                            <Card className="bg-gray-800 border-green-500/20">
                                <CardHeader>
                                    <CardTitle className="text-green-500 flex items-center gap-2">
                                        <Target className="w-5 h-5" />
                                        Position Demand
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {Object.entries(marketAnalysis.positionDemand).map(([position, demand]) => (
                                            <div key={position} className="flex justify-between items-center">
                                                <span className="text-gray-300 text-sm">{position}</span>
                                                <Badge variant="outline" className="border-green-500 text-green-400 text-xs">
                                                    {demand}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* League Insights */}
                            <Card className="bg-gray-800 border-purple-500/20">
                                <CardHeader>
                                    <CardTitle className="text-purple-500 flex items-center gap-2">
                                        <Globe className="w-5 h-5" />
                                        League Insights
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {marketAnalysis.leagueInsights.map((insight, index) => (
                                            <div key={index} className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <p className="text-gray-300 text-sm">{insight}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Opportunities */}
                            <Card className="bg-gray-800 border-yellow-500/20">
                                <CardHeader>
                                    <CardTitle className="text-yellow-500 flex items-center gap-2">
                                        <Star className="w-5 h-5" />
                                        Market Opportunities
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {marketAnalysis.opportunities.map((opportunity, index) => (
                                            <div key={index} className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <p className="text-gray-300 text-sm">{opportunity}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <Card className="bg-gray-800 border-blue-500/20">
                            <CardContent className="p-8 text-center">
                                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                                <h3 className="text-xl font-bold text-white mb-2">Market Trends Analysis</h3>
                                <p className="text-gray-400 mb-4">
                                    Get insights into current transfer market dynamics, position demand, and opportunities.
                                </p>
                                <Button
                                    onClick={runMarketAnalysis}
                                    disabled={!playerData}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <Zap className="w-4 h-4 mr-2" />
                                    Analyze Market
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="team-fit" className="space-y-6 mt-6">
                    {loading ? (
                        <Card className="bg-gray-800 border-green-500/20">
                            <CardContent className="p-8">
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
                                </div>
                                <p className="text-center text-gray-400 mt-4">Analyzing team fit...</p>
                            </CardContent>
                        </Card>
                    ) : teamFitAnalysis ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Ideal Clubs */}
                            <Card className="bg-gray-800 border-green-500/20">
                                <CardHeader>
                                    <CardTitle className="text-green-500 flex items-center gap-2">
                                        <Users className="w-5 h-5" />
                                        Ideal Club Profiles
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {teamFitAnalysis.idealClubs.map((club, index) => (
                                            <Badge key={index} variant="outline" className="border-green-500 text-green-400">
                                                {club}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Playing Style Match */}
                            <Card className="bg-gray-800 border-blue-500/20">
                                <CardHeader>
                                    <CardTitle className="text-blue-500 flex items-center gap-2">
                                        <Target className="w-5 h-5" />
                                        Playing Style Match
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {teamFitAnalysis.playingStyleMatch.map((match, index) => (
                                            <div key={index} className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <p className="text-gray-300 text-sm">{match}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Transfer Strategy */}
                            <Card className="bg-gray-800 border-rosegold/20 lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="text-rosegold flex items-center gap-2">
                                        <Shield className="w-5 h-5" />
                                        Transfer Strategy
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-300 leading-relaxed">
                                        {teamFitAnalysis.transferStrategy}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <Card className="bg-gray-800 border-green-500/20">
                            <CardContent className="p-8 text-center">
                                <Users className="w-12 h-12 mx-auto mb-4 text-green-500" />
                                <h3 className="text-xl font-bold text-white mb-2">Team Fit Analysis</h3>
                                <p className="text-gray-400 mb-4">
                                    Find the perfect club fit based on playing style, league compatibility, and development pathway.
                                </p>
                                <Button
                                    onClick={runTeamFitAnalysis}
                                    disabled={!playerData || !playerAnalysis}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <Zap className="w-4 h-4 mr-2" />
                                    Analyze Team Fit
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}; 