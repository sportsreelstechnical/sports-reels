// Video Compression Performance Dashboard
// Shows real-time performance metrics and comparisons

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Zap,
  Clock,
  HardDrive,
  TrendingUp,
  Target,
  BarChart3,
  Download,
  RefreshCw,
  Trophy,
  Gauge,
  Cpu,
  Monitor
} from 'lucide-react';
import { performanceMonitor } from '@/domains/video/services/videoCompressionPerformanceMonitor';
import { gpuVideoCompressionService } from '@/domains/video/services/gpuAcceleratedVideoCompressionService';

export const VideoCompressionPerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState(performanceMonitor.getPerformanceMetrics());
  const [comparisons, setComparisons] = useState(performanceMonitor.getMethodComparison());
  const [capabilities, setCapabilities] = useState(gpuVideoCompressionService.getCompressionCapabilities());
  const [memoryUsage, setMemoryUsage] = useState(performanceMonitor.getMemoryUsage());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getPerformanceMetrics());
      setComparisons(performanceMonitor.getMethodComparison());
      setCapabilities(gpuVideoCompressionService.getCompressionCapabilities());
      setMemoryUsage(performanceMonitor.getMemoryUsage());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
      'webcodecs': 'bg-green-500',
      'webgl': 'bg-blue-500',
      'webgpu': 'bg-purple-500',
      'ffmpeg': 'bg-red-500',
      'fallback': 'bg-yellow-500'
    };
    return colors[method] || 'bg-gray-500';
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'webcodecs': return <Monitor className="w-4 h-4" />;
      case 'webgl': return <Cpu className="w-4 h-4" />;
      case 'webgpu': return <Zap className="w-4 h-4" />;
      case 'ffmpeg': return <Gauge className="w-4 h-4" />;
      default: return <Cpu className="w-4 h-4" />;
    }
  };

  const exportBenchmarks = () => {
    const data = performanceMonitor.exportBenchmarks();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'video-compression-benchmarks.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">🚀 GPU Compression Performance</h2>
          <p className="text-muted-foreground">
            Real-time performance metrics and benchmarking dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportBenchmarks} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* GPU Acceleration Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            GPU Acceleration Support
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                <span className="text-sm font-medium">WebCodecs</span>
              </div>
              <Badge variant={capabilities.webCodecs ? "default" : "secondary"}>
                {capabilities.webCodecs ? "✅ Supported" : "❌ Not Available"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                <span className="text-sm font-medium">WebGL</span>
              </div>
              <Badge variant={capabilities.webgl ? "default" : "secondary"}>
                {capabilities.webgl ? "✅ Supported" : "❌ Not Available"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">WebGPU</span>
              </div>
              <Badge variant={capabilities.webgpu ? "default" : "secondary"}>
                {capabilities.webgpu ? "✅ Supported" : "❌ Not Available"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">Recommended</span>
              </div>
              <Badge variant="default" className="capitalize">
                {capabilities.recommendedMethod}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Videos</p>
                <p className="text-2xl font-bold">{metrics.totalVideosCompressed}</p>
              </div>
              <Video className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Compression Time</p>
                <p className="text-2xl font-bold">{formatTime(metrics.averageCompressionTime)}</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Compression Ratio</p>
                <p className="text-2xl font-bold">{metrics.averageCompressionRatio.toFixed(1)}x</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold">{formatTime(metrics.totalTimeSaved)}</p>
              </div>
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Method Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Compression Method Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comparisons.map((comparison, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${getMethodColor(comparison.method)} text-white`}>
                    {getMethodIcon(comparison.method)}
                  </div>
                  <div>
                    <p className="font-medium capitalize">{comparison.method}</p>
                    <p className="text-sm text-muted-foreground">
                      {comparison.count} videos processed
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm font-medium">{formatTime(comparison.avgTime)}</p>
                    <p className="text-xs text-muted-foreground">Avg Time</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium">{comparison.avgRatio.toFixed(1)}x</p>
                    <p className="text-xs text-muted-foreground">Compression</p>
                  </div>
                  
                  <div className="text-center">
                    <Badge variant={comparison.speedImprovement > 5 ? "default" : "secondary"}>
                      {comparison.speedImprovement}x faster
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Memory Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Memory Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">JavaScript Heap</span>
              <span className="text-sm text-muted-foreground">
                {formatBytes(memoryUsage.used)} / {formatBytes(memoryUsage.total)}
              </span>
            </div>
            <Progress value={memoryUsage.percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>{memoryUsage.percentage.toFixed(1)}%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Performance Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Optimizations Active</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• GPU hardware acceleration enabled</li>
                <li>• WebCodecs API for maximum speed</li>
                <li>• Optimized shader-based compression</li>
                <li>• Real-time performance monitoring</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">💡 Recommendations</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use WebCodecs for best performance</li>
                <li>• WebGL fallback for compatibility</li>
                <li>• Monitor memory usage during batch uploads</li>
                <li>• Export benchmarks for analysis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoCompressionPerformanceDashboard;
