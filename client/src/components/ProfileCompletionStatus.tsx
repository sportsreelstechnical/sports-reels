
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Users, Video, Trophy } from 'lucide-react';
import { useTeamProfileCompletion } from '@/hooks/useTeamProfileCompletion';
import { useAuth } from '@/contexts/AuthContext';

const ProfileCompletionStatus: React.FC = () => {
  const { profile } = useAuth();
  const { completionStatus, loading } = useTeamProfileCompletion();

  if (profile?.user_type !== 'team' || loading) {
    return null;
  }

  const calculateCompletionPercentage = () => {
    let completed = 0;
    let total = 4; // Basic completion items

    if (completionStatus.isTeamProfileComplete) completed++;
    if (completionStatus.hasMinimumPlayers) completed++;
    if (completionStatus.hasMinimumVideos) completed++;
    if (profile.is_verified) completed++;

    return Math.round((completed / total) * 100);
  };

  const completionPercentage = calculateCompletionPercentage();
  const isFullyComplete = completionPercentage === 100;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Trophy className="w-5 h-5 text-rosegold" />
          Profile Completion Status
          {isFullyComplete ? (
            <Badge className="bg-green-600 text-white">
              <CheckCircle className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          ) : (
            <Badge variant="outline" className="text-orange-400 border-orange-400">
              <AlertCircle className="w-3 h-3 mr-1" />
              {completionPercentage}% Complete
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Overall Progress</span>
            <span className="text-sm font-medium text-white">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            {completionStatus.isTeamProfileComplete ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-orange-400" />
            )}
            <span className="text-sm text-gray-300">Team Profile</span>
          </div>

          <div className="flex items-center gap-2">
            {profile.is_verified ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-orange-400" />
            )}
            <span className="text-sm text-gray-300">Verified</span>
          </div>

          <div className="flex items-center gap-2">
            {completionStatus.hasMinimumPlayers ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-orange-400" />
            )}
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span className="text-sm text-gray-300">Players ({completionStatus.playerCount})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {completionStatus.hasMinimumVideos ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-orange-400" />
            )}
            <div className="flex items-center gap-1">
              <Video className="w-3 h-3" />
              <span className="text-sm text-gray-300">Videos ({completionStatus.videoCount}/5)</span>
            </div>
          </div>
        </div>

        {completionStatus.missingRequirements.length > 0 && (
          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <h4 className="text-sm font-medium text-orange-400 mb-2">Missing Requirements:</h4>
            <ul className="text-sm text-orange-300 space-y-1">
              {completionStatus.missingRequirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isFullyComplete && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Profile Complete!</span>
            </div>
            <p className="text-sm text-green-300 mt-1">
              Your team profile is complete and you have access to all platform features.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileCompletionStatus;
