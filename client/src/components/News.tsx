
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Calendar, ExternalLink, Filter } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  sport: string;
  category: string;
  publishedAt: string;
  imageUrl: string;
  source: string;
  url: string;
}

const News = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
  const [selectedSport, setSelectedSport] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Mock news data for demonstration
  useEffect(() => {
    const mockNews: NewsItem[] = [
      {
        id: '1',
        title: 'Transfer Window Update: Major Signings Expected',
        summary: 'Several top clubs are preparing for major signings in the upcoming transfer window with record-breaking deals on the horizon.',
        sport: 'football',
        category: 'transfers',
        publishedAt: '2024-01-15T10:00:00Z',
        imageUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=250&fit=crop',
        source: 'Sports News',
        url: '#'
      },
      {
        id: '2',
        title: 'Basketball Season Highlights: Rising Stars',
        summary: 'Young talents are making their mark in professional basketball with outstanding performances this season.',
        sport: 'basketball',
        category: 'performance',
        publishedAt: '2024-01-14T15:30:00Z',
        imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=250&fit=crop',
        source: 'Basketball Today',
        url: '#'
      },
      {
        id: '3',
        title: 'Tennis Championships: Upcoming Tournaments',
        summary: 'Get ready for the most exciting tennis tournaments of the year with top-ranked players competing.',
        sport: 'tennis',
        category: 'tournaments',
        publishedAt: '2024-01-13T09:15:00Z',
        imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=250&fit=crop',
        source: 'Tennis World',
        url: '#'
      },
      {
        id: '4',
        title: 'Rugby World Cup Preparations Underway',
        summary: 'Teams are intensifying their training as the Rugby World Cup approaches with fierce competition expected.',
        sport: 'rugby',
        category: 'tournaments',
        publishedAt: '2024-01-12T14:45:00Z',
        imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=250&fit=crop',
        source: 'Rugby News',
        url: '#'
      },
      {
        id: '5',
        title: 'Agent Regulations: New FIFA Guidelines',
        summary: 'FIFA announces new regulations for player agents affecting transfer negotiations and representation contracts.',
        sport: 'football',
        category: 'regulations',
        publishedAt: '2024-01-11T11:20:00Z',
        imageUrl: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400&h=250&fit=crop',
        source: 'FIFA News',
        url: '#'
      }
    ];

    setNews(mockNews);
    setFilteredNews(mockNews);
    setLoading(false);
  }, []);

  useEffect(() => {
    let filtered = [...news];

    if (selectedSport !== 'all') {
      filtered = filtered.filter(item => item.sport === selectedSport);
    }

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNews(filtered);
  }, [news, selectedSport, searchTerm]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSportColor = (sport: string) => {
    const colors = {
      football: 'bg-green-500',
      basketball: 'bg-orange-500',
      tennis: 'bg-yellow-500',
      rugby: 'bg-purple-500'
    };
    return colors[sport as keyof typeof colors] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-gray-200">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Sports News</h1>
          <p className="text-gray-400">Stay updated with the latest sports news and updates</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search news..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by sport" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="all">All Sports</SelectItem>
                <SelectItem value="football">Football</SelectItem>
                <SelectItem value="basketball">Basketball</SelectItem>
                <SelectItem value="tennis">Tennis</SelectItem>
                <SelectItem value="rugby">Rugby</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSelectedSport('all');
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* News List */}
      <div className="space-y-4">
        {filteredNews.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-8 text-center">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No news found</h3>
              <p className="text-gray-400">Try adjusting your filters or search terms</p>
            </CardContent>
          </Card>
        ) : (
          filteredNews.map((item) => (
            <Card key={item.id} className="bg-gray-800/30 border-gray-700 hover:border-rosegold/30 transition-all duration-200 hover:shadow-lg">
              <CardContent className="p-0">
                <div className="flex gap-4">
                  <div className="w-32 h-24 flex-shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover rounded-l-lg"
                    />
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${getSportColor(item.sport)} text-white text-xs`}>
                            {item.sport.charAt(0).toUpperCase() + item.sport.slice(1)}
                          </Badge>
                          <Badge variant="outline" className="border-gray-600 text-gray-300 text-xs">
                            {item.category}
                          </Badge>
                          <div className="flex items-center text-gray-400 text-xs ml-auto">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(item.publishedAt)}
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-gray-300 text-sm line-clamp-2">
                          {item.summary}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-gray-400 text-xs">{item.source}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-rosegold text-rosegold hover:bg-rosegold hover:text-black"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Read More
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default News;
