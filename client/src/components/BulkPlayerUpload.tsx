import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  Download,
  FileText,
  Users,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  FileSpreadsheet,
  AlertTriangle,
  Eye,
  Edit3,
  Trash2
} from 'lucide-react';
import { BulkPlayerUploadService, PlayerUploadData, UploadSummary } from '@/domains/players/services/bulkPlayerUploadService';
import { SportType } from '@/shared/utils/sportsService';
import { supabase } from '@/integrations/supabase/client';

interface BulkPlayerUploadProps {
  teamId: string;
  sportType: SportType;
  onUploadComplete?: () => void;
  onCancel?: () => void;
}

interface UploadHistory {
  id: string;
  filename: string;
  uploadedAt: string;
  totalPlayers: number;
  successCount: number;
  errorCount: number;
  uploadedBy: string;
}

const BulkPlayerUpload: React.FC<BulkPlayerUploadProps> = ({
  teamId,
  sportType,
  onUploadComplete,
  onCancel
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadService = new BulkPlayerUploadService(teamId, sportType);

  // Simple helper function for date display (text inputs don't need conversion)
  const formatDateForDisplay = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    return dateString; // Keep as is since we're using text inputs
  };

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editablePlayers, setEditablePlayers] = useState<PlayerUploadData[]>([]);

  useEffect(() => {
    fetchUploadHistory();
  }, [teamId]);

  const fetchUploadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('player_upload_history')
        .select('*')
        .eq('team_id', teamId)
        .order('uploaded_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setUploadHistory(data || []);
    } catch (error) {
      console.error('Error fetching upload history:', error);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV or Excel file (.csv, .xlsx, .xls)",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const players = await uploadService.parseFile(file);
      const summary = await uploadService.validatePlayers(players);
      
      setUploadSummary(summary);
      setEditablePlayers(summary.players);
      
      if (summary.validRows === 0) {
        toast({
          title: "No Valid Players",
          description: "No valid player data found in the file",
          variant: "destructive"
        });
      } else {
        toast({
          title: "File Processed",
          description: `Found ${summary.validRows} valid players out of ${summary.totalRows} rows`,
        });
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const downloadTemplate = () => {
    uploadService.downloadTemplate();
    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded to your device",
    });
  };

  const handleUpload = async () => {
    if (!uploadSummary || uploadSummary.validRows === 0) {
      toast({
        title: "No Valid Players",
        description: "Please fix validation errors before uploading",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadService.uploadPlayers(editablePlayers, selectedFile || undefined);
      
      setUploadProgress(100);

      if (result.success > 0) {
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${result.success} players`,
        });

        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        toast({
          title: "Upload Failed",
          description: "No players were uploaded successfully",
          variant: "destructive"
        });
      }

      if (result.errors.length > 0) {
        console.error('Upload errors:', result.errors);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: "An error occurred during upload",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadSummary(null);
    setEditablePlayers([]);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updatePlayer = (index: number, field: keyof PlayerUploadData, value: any) => {
    setEditablePlayers(prev => 
      prev.map((player, i) => 
        i === index ? { ...player, [field]: value } : player
      )
    );
  };

  const removePlayer = (index: number) => {
    setEditablePlayers(prev => prev.filter((_, i) => i !== index));
    if (uploadSummary) {
      setUploadSummary(prev => prev ? {
        ...prev,
        validRows: prev.validRows - 1,
        players: prev.players.filter((_, i) => i !== index)
      } : null);
    }
  };

  const getStatusIcon = (summary: UploadSummary) => {
    if (summary.validRows === summary.totalRows) {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    } else if (summary.validRows > 0) {
      return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getStatusColor = (summary: UploadSummary) => {
    if (summary.validRows === summary.totalRows) {
      return "bg-green-500";
    } else if (summary.validRows > 0) {
      return "bg-yellow-500";
    } else {
      return "bg-red-500";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Bulk Player Upload</h2>
          <p className="text-gray-400 text-xs sm:text-sm">Upload multiple players using CSV or Excel files</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="text-white border-gray-600 text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-initial"
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Download Template</span>
            <span className="sm:hidden">Template</span>
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isUploading} className="text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-initial">
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white">Uploading Players</span>
                <span className="text-gray-400">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload Area */}
      {!selectedFile && (
        <Card
          className={`border-2 border-dashed transition-colors ${
            dragActive
              ? 'border-rosegold bg-rosegold/10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Drop your file here or click to browse
            </h3>
            <p className="text-gray-400 mb-4">
              Supports CSV and Excel files (.csv, .xlsx, .xls) up to 10MB
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="text-white border-gray-600"
              >
                <FileText className="w-4 h-4 mr-2" />
                Choose CSV File
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="text-white border-gray-600"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Choose Excel File
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </CardContent>
        </Card>
      )}

      {/* File Processing */}
      {isProcessing && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-white">Processing file...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Selected */}
      {selectedFile && !isProcessing && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rosegold/20 rounded-lg flex items-center justify-center">
                  {selectedFile.name.endsWith('.csv') ? (
                    <FileText className="w-5 h-5 text-rosegold" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5 text-rosegold" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-white text-lg">{selectedFile.name}</CardTitle>
                  <p className="text-gray-400 text-sm">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Upload Summary */}
      {uploadSummary && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(uploadSummary)}
                <div>
                  <CardTitle className="text-white text-lg">Upload Summary</CardTitle>
                  <p className="text-gray-400 text-sm">
                    {uploadSummary.validRows} valid players out of {uploadSummary.totalRows} total rows
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-white border-gray-600"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showPreview ? 'Hide' : 'Preview'}
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploadSummary.validRows === 0 || isUploading}
                  className="bg-rosegold hover:bg-rosegold/90 text-white"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload {uploadSummary.validRows} Players
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{uploadSummary.totalRows}</div>
                <div className="text-sm text-gray-400">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{uploadSummary.validRows}</div>
                <div className="text-sm text-gray-400">Valid Players</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{uploadSummary.invalidRows}</div>
                <div className="text-sm text-gray-400">Invalid Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{uploadSummary.duplicateRows}</div>
                <div className="text-sm text-gray-400">Duplicates</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white">Validation Progress</span>
                <span className="text-gray-400">
                  {Math.round((uploadSummary.validRows / uploadSummary.totalRows) * 100)}%
                </span>
              </div>
              <Progress 
                value={(uploadSummary.validRows / uploadSummary.totalRows) * 100} 
                className="h-2"
              />
            </div>

            {/* Errors */}
            {uploadSummary.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-white font-medium">Validation Errors:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {uploadSummary.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-sm text-red-400 bg-red-900/20 p-2 rounded">
                      Row {error.row}: {error.field} - {error.message}
                    </div>
                  ))}
                  {uploadSummary.errors.length > 10 && (
                    <div className="text-sm text-gray-400 text-center">
                      ... and {uploadSummary.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Player Preview/Edit */}
      {showPreview && editablePlayers.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Player Preview & Edit</CardTitle>
            <p className="text-gray-400 text-sm">
              Review and edit player data before uploading
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {editablePlayers.map((player, index) => (
                <div key={index} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium">{player.full_name}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePlayer(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-gray-400 text-xs">Position</Label>
                      <Input
                        value={player.position || ''}
                        onChange={(e) => updatePlayer(index, 'position', e.target.value)}
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Jersey #</Label>
                      <Input
                        type="number"
                        value={player.jersey_number || ''}
                        onChange={(e) => updatePlayer(index, 'jersey_number', parseInt(e.target.value) || null)}
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Age</Label>
                      <Input
                        type="number"
                        value={player.age || ''}
                        onChange={(e) => updatePlayer(index, 'age', parseInt(e.target.value) || null)}
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Citizenship</Label>
                      <Input
                        value={player.citizenship || ''}
                        onChange={(e) => updatePlayer(index, 'citizenship', e.target.value)}
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Gender</Label>
                      <select
                        value={player.gender || ''}
                        onChange={(e) => updatePlayer(index, 'gender', e.target.value as 'male' | 'female' | 'other')}
                        className="bg-gray-600 text-white border-gray-500 text-sm rounded-md px-3 py-2 w-full"
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Height (cm)</Label>
                      <Input
                        type="number"
                        value={player.height || ''}
                        onChange={(e) => updatePlayer(index, 'height', parseInt(e.target.value) || null)}
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Weight (kg)</Label>
                      <Input
                        type="number"
                        value={player.weight || ''}
                        onChange={(e) => updatePlayer(index, 'weight', parseInt(e.target.value) || null)}
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Date of Birth</Label>
                      <Input
                        type="text"
                        value={player.date_of_birth || ''}
                        onChange={(e) => updatePlayer(index, 'date_of_birth', e.target.value)}
                        placeholder="MM/DD/YYYY"
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Place of Birth</Label>
                      <Input
                        value={player.place_of_birth || ''}
                        onChange={(e) => updatePlayer(index, 'place_of_birth', e.target.value)}
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Preferred Foot</Label>
                      <select
                        value={player.foot || ''}
                        onChange={(e) => updatePlayer(index, 'foot', e.target.value as 'left' | 'right' | 'both')}
                        className="bg-gray-600 text-white border-gray-500 text-sm rounded-md px-3 py-2 w-full"
                      >
                        <option value="">Select Foot</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">FIFA ID</Label>
                      <Input
                        value={player.fifa_id || ''}
                        onChange={(e) => updatePlayer(index, 'fifa_id', e.target.value)}
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Market Value</Label>
                      <Input
                        type="number"
                        value={player.market_value || ''}
                        onChange={(e) => updatePlayer(index, 'market_value', parseFloat(e.target.value) || null)}
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Player Agent</Label>
                      <Input
                        value={player.player_agent || ''}
                        onChange={(e) => updatePlayer(index, 'player_agent', e.target.value)}
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Current Club</Label>
                      <Input
                        value={player.current_club || ''}
                        onChange={(e) => updatePlayer(index, 'current_club', e.target.value)}
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Joined Date</Label>
                      <Input
                        type="text"
                        value={player.joined_date || ''}
                        onChange={(e) => updatePlayer(index, 'joined_date', e.target.value)}
                        placeholder="MM/DD/YYYY"
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Contract Expires</Label>
                      <Input
                        type="text"
                        value={player.contract_expires || ''}
                        onChange={(e) => updatePlayer(index, 'contract_expires', e.target.value)}
                        placeholder="MM/DD/YYYY"
                        className="bg-gray-600 text-white border-gray-500 text-sm"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <Label className="text-gray-400 text-xs">Bio</Label>
                      <textarea
                        value={player.bio || ''}
                        onChange={(e) => updatePlayer(index, 'bio', e.target.value)}
                        className="bg-gray-600 text-white border-gray-500 text-sm rounded-md px-3 py-2 w-full h-20 resize-none"
                        placeholder="Player biography..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload History */}
      {uploadHistory.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              Recent Uploads
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="space-y-2 sm:space-y-3">
              {uploadHistory.map((upload) => (
                <div key={upload.id} className="bg-gray-700 p-3 sm:p-4 rounded-lg">
                  <div className="flex flex-col gap-2 sm:gap-3">
                    {/* Header */}
                    <div className="flex items-start gap-2 sm:gap-3">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-white text-xs sm:text-sm font-medium break-words leading-tight">{upload.filename}</div>
                        <div className="text-gray-400 text-[10px] sm:text-xs mt-1 break-words leading-tight">
                          {new Date(upload.uploadedAt).toLocaleString()} • {upload.successCount} players uploaded
                        </div>
                      </div>
                    </div>
                    
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      <Badge variant="outline" className="text-green-400 border-green-400 text-[10px] sm:text-xs px-1.5 sm:px-2">
                        <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                        {upload.successCount} success
                      </Badge>
                      {upload.errorCount > 0 && (
                        <Badge variant="outline" className="text-red-400 border-red-400 text-[10px] sm:text-xs px-1.5 sm:px-2">
                          <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                          {upload.errorCount} errors
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkPlayerUpload;
