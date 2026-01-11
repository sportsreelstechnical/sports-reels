import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Download, Trash2, Upload, CheckCircle, XCircle } from 'lucide-react';
import { LocalhostVideoMigration } from '@/utils/migrateLocalhostVideos';

interface LocalhostVideo {
    id: string;
    title: string;
    video_url: string;
    thumbnail_url?: string;
    created_at: string;
}

const LocalhostVideoMigrationDashboard: React.FC = () => {
    const [localhostVideos, setLocalhostVideos] = useState<LocalhostVideo[]>([]);
    const [loading, setLoading] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [report, setReport] = useState<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        loadMigrationReport();
    }, []);

    const loadMigrationReport = async () => {
        setLoading(true);
        try {
            const result = await LocalhostVideoMigration.getMigrationReport();
            if (result.success) {
                setReport(result);
                setLocalhostVideos(result.localhostVideos || []);
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to load migration report",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error loading migration report:', error);
            toast({
                title: "Error",
                description: "Failed to load migration report",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const markVideosForReupload = async () => {
        if (localhostVideos.length === 0) return;

        setMigrating(true);
        try {
            const videoIds = localhostVideos.map(video => video.id);
            const result = await LocalhostVideoMigration.markVideosForReupload(videoIds);

            if (result.success) {
                toast({
                    title: "Success",
                    description: `Marked ${result.updatedCount} videos for re-upload`,
                });
                loadMigrationReport(); // Refresh the report
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to mark videos for re-upload",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error marking videos for re-upload:', error);
            toast({
                title: "Error",
                description: "Failed to mark videos for re-upload",
                variant: "destructive"
            });
        } finally {
            setMigrating(false);
        }
    };

    const instructions = LocalhostVideoMigration.getMigrationInstructions();

    if (loading) {
        return (
            <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bright-pink"></div>
                        <span className="ml-2 text-white">Loading migration report...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        Video URL Migration Dashboard
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert className="bg-yellow-900/20 border-yellow-500/30">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-yellow-200">
                            {instructions.description}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Migration Report */}
            {report && (
                <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-white">Migration Report</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">{report.totalVideos}</div>
                                <div className="text-gray-400">Total Videos</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-400">{report.localhostCount}</div>
                                <div className="text-gray-400">Localhost Videos</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-400">
                                    {report.totalVideos - report.localhostCount}
                                </div>
                                <div className="text-gray-400">Valid Videos</div>
                            </div>
                        </div>

                        {report.needsReupload && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-red-400" />
                                    <span className="text-white font-semibold">
                                        {report.localhostCount} videos need to be re-uploaded
                                    </span>
                                </div>

                                <Button
                                    onClick={markVideosForReupload}
                                    disabled={migrating || localhostVideos.length === 0}
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                >
                                    {migrating ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Marking for Re-upload...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Mark Videos for Re-upload
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        {!report.needsReupload && (
                            <div className="flex items-center gap-2 text-green-400">
                                <CheckCircle className="w-5 h-5" />
                                <span>All videos are using proper URLs. No migration needed!</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Localhost Videos List */}
            {localhostVideos.length > 0 && (
                <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-white">Videos with Localhost URLs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {localhostVideos.map((video) => (
                                <div key={video.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                                    <div className="flex-1">
                                        <h3 className="text-white font-semibold">{video.title}</h3>
                                        <div className="text-sm text-gray-400 mt-1">
                                            <div>Video URL: {video.video_url}</div>
                                            {video.thumbnail_url && (
                                                <div>Thumbnail URL: {video.thumbnail_url}</div>
                                            )}
                                            <div>Created: {new Date(video.created_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-red-900/20 text-red-400 border-red-500/30">
                                            Invalid URL
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Migration Instructions */}
            <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-white">Migration Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-white font-semibold mb-2">Steps to Fix:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-gray-300">
                                {instructions.steps.map((step: string, index: number) => (
                                    <li key={index}>{step}</li>
                                ))}
                            </ol>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-2">Benefits After Migration:</h4>
                            <ul className="list-disc list-inside space-y-1 text-gray-300">
                                {instructions.benefits.map((benefit: string, index: number) => (
                                    <li key={index}>{benefit}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default LocalhostVideoMigrationDashboard;
