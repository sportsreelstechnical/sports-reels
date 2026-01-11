
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { enhancedContractService, ContractComment, ContractVersion } from '@/domains/contracts/services/enhancedContractService';
import { useAuth } from '@/contexts/AuthContext';
import {
  MessageCircle,
  Send,
  History,
  Users,
  Clock,
  FileText,
  Eye,
  Download,
  Edit
} from 'lucide-react';

interface ContractCollaborationProps {
  contractId: string;
  onContractUpdate?: () => void;
}

const ContractCollaboration: React.FC<ContractCollaborationProps> = ({
  contractId,
  onContractUpdate
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<ContractComment[]>([]);
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'versions'>('comments');

  useEffect(() => {
    loadComments();
    loadVersions();
  }, [contractId]);

  const loadComments = async () => {
    try {
      const data = await enhancedContractService.getContractComments(contractId);
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadVersions = async () => {
    try {
      const data = await enhancedContractService.getContractVersions(contractId);
      setVersions(data);
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      await enhancedContractService.addContractComment(contractId, newComment);
      setNewComment('');
      await loadComments();
      toast({
        title: "Success",
        description: "Comment added successfully"
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const CommentsSection = () => (
    <div className="space-y-6">
      {/* Add Comment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="w-5 h-5" />
            Add Comment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Add your comment or feedback..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Comments are visible to all parties involved in this contract
              </p>
              <Button
                onClick={addComment}
                disabled={loading || !newComment.trim()}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <Card key={comment.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(comment.user?.full_name || 'Unknown')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comment.user?.full_name || 'Unknown User'}
                        </span>
                        {comment.is_internal && (
                          <Badge variant="secondary" className="text-xs">Internal</Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {comment.comment}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Comments Yet</h3>
              <p className="text-gray-600">Be the first to add a comment or feedback</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const VersionsSection = () => (
    <div className="space-y-4">
      {versions.length > 0 ? (
        versions.map((version) => (
          <Card key={version.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Version {version.version_number}</h3>
                    <p className="text-sm text-gray-600">
                      by {version.user?.full_name || 'System'} • {formatDate(version.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              
              {version.changes_summary && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">Changes:</p>
                  <p className="text-sm text-gray-600">{version.changes_summary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Version History</h3>
            <p className="text-gray-600">Contract versions will appear here when changes are made</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            Contract Collaboration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant={activeTab === 'comments' ? 'default' : 'outline'}
              onClick={() => setActiveTab('comments')}
              className="flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Comments ({comments.length})
            </Button>
            <Button
              variant={activeTab === 'versions' ? 'default' : 'outline'}
              onClick={() => setActiveTab('versions')}
              className="flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              Versions ({versions.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {activeTab === 'comments' ? <CommentsSection /> : <VersionsSection />}
    </div>
  );
};

export default ContractCollaboration;
