
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Trophy } from 'lucide-react';

interface SeasonSeparatorProps {
  season: string;
  eventCount: number;
  achievements?: number;
}

const SeasonSeparator: React.FC<SeasonSeparatorProps> = ({ 
  season, 
  eventCount, 
  achievements = 0 
}) => {
  return (
    <Card className="border-rosegold/30 bg-gradient-to-r from-rosegold/5 to-transparent my-6">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rosegold/10 rounded-full">
              <Calendar className="w-5 h-5 text-rosegold" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-polysans">
                {season} Season
              </h3>
              <p className="text-sm sm:text-base text-black">
                {eventCount} events recorded
              </p>
            </div>
          </div>
          
          {achievements > 0 && (
            <div className="flex items-center gap-2 text-yellow-500">
              <Trophy className="w-4 h-4" />
              <span className="text-sm sm:text-base font-medium">
                {achievements} achievement{achievements !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SeasonSeparator;
