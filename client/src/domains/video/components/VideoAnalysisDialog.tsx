
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, BarChart3, Users, Target } from 'lucide-react';
import VideoPlayer from './VideoPlayer';

interface VideoAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: {
    video_id: string;
    video_url: string;
    video_title: string;
    analysis_data?: any;
    tagged_players?: string[];
    performance_metrics?: any;
  };
}

export const VideoAnalysisDialog: React.FC<VideoAnalysisDialogProps> = ({
  isOpen,
  onClose,
  analysis
}) => {
  const [activeTab, setActiveTab] = useState('analysis');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Video Analysis Results
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Video Player
            </TabsTrigger>
            <TabsTrigger value="players" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Tagged Players
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 h-[calc(90vh-200px)] overflow-y-auto">
            <TabsContent value="analysis" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Key Metrics */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Key Performance Metrics
                    </h3>
                    
                    {analysis.performance_metrics ? (
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(analysis.performance_metrics).map(([key, value]: [string, any]) => (
                          <div key={key} className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-bold text-primary">{value}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {key.replace('_', ' ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No performance metrics available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Analysis Summary */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Analysis Summary</h3>
                    
                    {analysis.analysis_data ? (
                      <div className="space-y-3">
                        {Object.entries(analysis.analysis_data).map(([section, data]: [string, any]) => (
                          <div key={section}>
                            <h4 className="font-medium capitalize mb-2">
                              {section.replace('_', ' ')}
                            </h4>
                            {typeof data === 'object' ? (
                              <div className="space-y-1">
                                {Object.entries(data).map(([key, value]: [string, any]) => (
                                  <div key={key} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground capitalize">
                                      {key.replace('_', ' ')}:
                                    </span>
                                    <span>{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">{String(data)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No detailed analysis available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Full Analysis Report */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Detailed Analysis Report</h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground">
                      This video has been analyzed for player performance, tactical movements, 
                      and key moments. The AI has identified various events and tracked player 
                      statistics throughout the match.
                    </p>
                    
                    {analysis.analysis_data?.summary && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <p>{analysis.analysis_data.summary}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="video" className="mt-0">
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <VideoPlayer
                      videoUrl={analysis.video_url}
                      title={analysis.video_title}
                      videoId={analysis.video_id}
                      metadata={{
                        playerTags: analysis.tagged_players || [],
                        matchDetails: {
                          homeTeam: 'Home Team',
                          awayTeam: 'Away Team',
                          league: 'League',
                          finalScore: '0-0'
                        },
                        duration: 300
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="players" className="mt-0">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Tagged Players in Video
                  </h3>
                  
                  {analysis.tagged_players && analysis.tagged_players.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analysis.tagged_players.map((playerId, index) => (
                        <div key={playerId} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="font-medium">{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium">Player {index + 1}</p>
                              <p className="text-sm text-muted-foreground">ID: {playerId}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h4 className="text-lg font-semibold mb-2">No Tagged Players</h4>
                      <p className="text-muted-foreground">
                        No players have been tagged in this video analysis.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default VideoAnalysisDialog;
