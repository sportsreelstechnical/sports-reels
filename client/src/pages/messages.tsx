import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Search, Filter, Users, Clock, FileText, Send, Paperclip, Download, Eye, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MessageModal from '@/components/MessageModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentPreview } from '@/components/DocumentPreview';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  pitch_id?: string;
  player_id?: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
  subject?: string;
  message_type?: string;
  contract_file_url?: string;
  attachment_urls?: string[];
  file_name?: string;
  file_type?: string;
  file_size?: number;
  sender_profile?: {
    full_name: string;
    user_type: string;
  };
  receiver_profile?: {
    full_name: string;
    user_type: string;
  };
  player?: {
    full_name: string;
  };
  pitch?: {
    description: string;
  };
}

interface MessageThread {
  id: string;
  participant: {
    id: string;
    name: string;
    type: string;
  };
  lastMessage: Message;
  unreadCount: number;
  messages: Message[];
}

const Messages = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // File upload states
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File preview states
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchMessages();
      setupRealtimeSubscription();
    }
  }, [profile?.id]);

  const fetchMessages = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      console.log('Fetching messages for profile:', profile.id);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error, data);
        toast({
          title: "Error",
          description: error.message || "Failed to load messages",
          variant: "destructive"
        });
        return;
      }

      console.log('Fetched messages:', data);

      // Get all unique user IDs from messages
      const userIds = new Set<string>();
      (data || []).forEach(msg => {
        userIds.add(msg.sender_id);
        userIds.add(msg.receiver_id);
      });

      // Fetch profiles for all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, user_type')
        .in('id', Array.from(userIds));

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({
          title: "Error",
          description: "Failed to load user profiles",
          variant: "destructive"
        });
        return;
      }

      // Create a map of user ID to profile
      const profileMap = new Map();
      (profiles || []).forEach(profile => {
        profileMap.set(profile.id, profile);
      });

      // Transform messages with profile data
      const transformedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        pitch_id: msg.pitch_id,
        player_id: msg.player_id,
        created_at: msg.created_at,
        status: msg.status || 'sent',
        subject: msg.subject,
        message_type: msg.message_type,
        contract_file_url: msg.contract_file_url,
        attachment_urls: msg.attachment_urls ?
          (Array.isArray(msg.attachment_urls) ?
            msg.attachment_urls.map(url => String(url)) :
            [String(msg.attachment_urls)]) :
          [],
        sender_profile: profileMap.get(msg.sender_id),
        receiver_profile: profileMap.get(msg.receiver_id),
        player: undefined,
        pitch: undefined
      }));

      // Group messages by conversation (sender/receiver pairs)
      const threads = groupMessagesByThread(transformedMessages, profile.id);
      setMessageThreads(threads);

      // Count unread messages
      const unread = transformedMessages.filter(
        msg => msg.receiver_id === profile.id && msg.status !== 'read'
      ).length;
      setUnreadCount(unread);

    } catch (error) {
      console.error('Error in fetchMessages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const groupMessagesByThread = (messages: Message[], currentUserId: string): MessageThread[] => {
    const threadMap = new Map<string, MessageThread>();

    messages.forEach(message => {
      // Determine the other participant
      const isFromCurrentUser = message.sender_id === currentUserId;
      const otherParticipantId = isFromCurrentUser ? message.receiver_id : message.sender_id;
      const otherParticipant = isFromCurrentUser ? message.receiver_profile : message.sender_profile;

      // Create a unique thread key
      const threadKey = [currentUserId, otherParticipantId].sort().join('-');

      if (!threadMap.has(threadKey)) {
        threadMap.set(threadKey, {
          id: threadKey,
          participant: {
            id: otherParticipantId,
            name: otherParticipant?.full_name || 'Unknown User',
            type: otherParticipant?.user_type || 'unknown'
          },
          lastMessage: message,
          unreadCount: 0,
          messages: []
        });
      }

      const thread = threadMap.get(threadKey)!;
      thread.messages.push(message);

      // Update last message if this one is newer
      if (new Date(message.created_at) > new Date(thread.lastMessage.created_at)) {
        thread.lastMessage = message;
      }

      // Count unread messages
      if (message.receiver_id === currentUserId && message.status !== 'read') {
        thread.unreadCount++;
      }
    });

    // Sort threads by last message time and sort messages within each thread
    return Array.from(threadMap.values())
      .map(thread => ({
        ...thread,
        messages: thread.messages.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }))
      .sort((a, b) =>
        new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
      );
  };

  const setupRealtimeSubscription = () => {
    if (!profile?.id) return;

    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('New message received:', payload.new);
          fetchMessages(); // Refresh messages

          toast({
            title: "New Message",
            description: "You have received a new message",
            duration: 3000,
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const markAsRead = async (messageIds: string[]) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ status: 'read' })
        .in('id', messageIds)
        .eq('receiver_id', profile?.id);

      if (error) {
        console.error('Error marking messages as read:', error);
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  const handleThreadSelect = async (thread: MessageThread) => {
    setSelectedThread(thread);

    // Mark messages as read
    const unreadMessageIds = thread.messages
      .filter(msg => msg.receiver_id === profile?.id && msg.status !== 'read')
      .map(msg => msg.id);

    if (unreadMessageIds.length > 0) {
      await markAsRead(unreadMessageIds);

      // Update local state
      setMessageThreads(prev =>
        prev.map(t =>
          t.id === thread.id
            ? { ...t, unreadCount: 0, messages: t.messages.map(m => ({ ...m, status: 'read' as const })) }
            : t
        )
      );

      setUnreadCount(prev => prev - unreadMessageIds.length);
    }
  };

  const handleSendMessage = async (content: string, receiverId: string, pitchId?: string, attachmentUrls?: string[]) => {
    if (!profile?.id) return;

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: profile.id,
      receiver_id: receiverId,
      pitch_id: pitchId,
      attachment_urls: attachmentUrls || [],
      created_at: new Date().toISOString(),
      status: 'sent',
      sender_profile: {
        full_name: profile.full_name || 'You',
        user_type: profile.user_type || 'user'
      },
      receiver_profile: undefined
    };

    // Add message to current thread immediately (optimistic UI)
    if (selectedThread) {
      const threadKey = [profile.id, receiverId].sort().join('-');
      if (threadKey === selectedThread.id) {
        setSelectedThread(prev => prev ? {
          ...prev,
          messages: [...prev.messages, optimisticMessage],
          lastMessage: optimisticMessage
        } : null);
      }
    }

    // Update threads list
    setMessageThreads(prev => {
      const threadKey = [profile.id, receiverId].sort().join('-');
      return prev.map(thread => {
        if (thread.id === threadKey) {
          return {
            ...thread,
            messages: [...thread.messages, optimisticMessage],
            lastMessage: optimisticMessage
          };
        }
        return thread;
      });
    });

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          sender_id: profile.id,
          receiver_id: receiverId,
          pitch_id: pitchId,
          attachment_urls: attachmentUrls || null,
          status: 'sent'
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });

        // Remove optimistic message on error
        setMessageThreads(prev => {
          const threadKey = [profile.id, receiverId].sort().join('-');
          return prev.map(thread => {
            if (thread.id === threadKey) {
              return {
                ...thread,
                messages: thread.messages.filter(m => m.id !== optimisticMessage.id),
                lastMessage: thread.messages[thread.messages.length - 2] || thread.lastMessage
              };
            }
            return thread;
          });
        });

        if (selectedThread) {
          const threadKey = [profile.id, receiverId].sort().join('-');
          if (threadKey === selectedThread.id) {
            setSelectedThread(prev => prev ? {
              ...prev,
              messages: prev.messages.filter(m => m.id !== optimisticMessage.id),
              lastMessage: prev.messages[prev.messages.length - 2] || prev.lastMessage
            } : null);
          }
        }
        return;
      }

      // Replace optimistic message with real message
      if (data) {
        const realMessage: Message = {
          ...data,
          attachment_urls: data.attachment_urls ?
            (Array.isArray(data.attachment_urls) ?
              data.attachment_urls.map(url => String(url)) :
              [String(data.attachment_urls)]) :
            [],
          sender_profile: {
            full_name: profile.full_name || 'You',
            user_type: profile.user_type || 'user'
          },
          receiver_profile: undefined
        };

        setMessageThreads(prev => {
          const threadKey = [profile.id, receiverId].sort().join('-');
          return prev.map(thread => {
            if (thread.id === threadKey) {
              return {
                ...thread,
                messages: thread.messages.map(m =>
                  m.id === optimisticMessage.id ? realMessage : m
                ),
                lastMessage: realMessage
              };
            }
            return thread;
          });
        });

        if (selectedThread) {
          const threadKey = [profile.id, receiverId].sort().join('-');
          if (threadKey === selectedThread.id) {
            setSelectedThread(prev => prev ? {
              ...prev,
              messages: prev.messages.map(m =>
                m.id === optimisticMessage.id ? realMessage : m
              ),
              lastMessage: realMessage
            } : null);
          }
        }
      }

      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error in handleSendMessage:', error);

      // Remove optimistic message on error
      setMessageThreads(prev => {
        const threadKey = [profile.id, receiverId].sort().join('-');
        return prev.map(thread => {
          if (thread.id === threadKey) {
            return {
              ...thread,
              messages: thread.messages.filter(m => m.id !== optimisticMessage.id),
              lastMessage: thread.messages[thread.messages.length - 2] || thread.lastMessage
            };
          }
          return thread;
        });
      });

      if (selectedThread) {
        const threadKey = [profile.id, receiverId].sort().join('-');
        if (threadKey === selectedThread.id) {
          setSelectedThread(prev => prev ? {
            ...prev,
            messages: prev.messages.filter(m => m.id !== optimisticMessage.id),
            lastMessage: prev.messages[prev.messages.length - 2] || prev.lastMessage
          } : null);
        }
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // File upload functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate file types and sizes
    const maxSize = 10 * 1024 * 1024; // 10MB

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `${file.name} is too large. Maximum size is 10MB.`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
    setShowAttachments(true);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    if (attachments.length <= 1) {
      setShowAttachments(false);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `message-attachments/${fileName}`;

    const { data, error } = await supabase.storage
      .from('message-attachments')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSendMessageWithFiles = async () => {
    if (!selectedThread || !profile?.id) return;
    if (!newMessage.trim() && attachments.length === 0) return;

    setUploading(true);
    try {
      // Upload files first
      const uploadedUrls: string[] = [];
      for (const file of attachments) {
        const url = await uploadFile(file);
        uploadedUrls.push(url);
      }

      // Send message with attachments
      await handleSendMessage(newMessage, selectedThread.participant.id, undefined, uploadedUrls);

      // Clear form
      setNewMessage('');
      setAttachments([]);
      setShowAttachments(false);

    } catch (error) {
      console.error('Error sending message with files:', error);
      toast({
        title: "Error",
        description: "Failed to send message with attachments",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePreviewFile = (url: string, name: string, type?: string) => {
    // Auto-detect file type if not provided
    let detectedType = type;
    if (!detectedType) {
      const lowerUrl = url.toLowerCase();
      const fileExtension = name.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
        detectedType = 'image';
      } else if (fileExtension === 'pdf' || lowerUrl.includes('.pdf') || lowerUrl.includes('/contracts/')) {
        detectedType = 'pdf';
      } else {
        detectedType = 'document';
      }
    }
    setPreviewFile({ url, name, type: detectedType });
    setShowFilePreview(true);
  };

  const downloadFile = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download file",
        variant: "destructive"
      });
    }
  };

  const filteredThreads = messageThreads.filter(thread => {
    const matchesSearch = thread.participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.lastMessage.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === 'all' ||
      (filterType === 'unread' && thread.unreadCount > 0) ||
      (filterType === 'agents' && thread.participant.type === 'agent') ||
      (filterType === 'teams' && thread.participant.type === 'team');

    return matchesSearch && matchesFilter;
  });

  return (
    <Layout>
      <div className="flex h-screen bg-background">
        {/* Messages Sidebar */}
        <div className="w-1/3  bg-black flex flex-col">
          {/* Header */}
          <div className="p-4 ">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-6 h-6 text-rosegold" />
              <h1 className="text-xl font-polysans font-bold text-white">Messages</h1>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card boeder-0 text-white"
              />
            </div>

            {/* Filters */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-card border-0 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='border-0'>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="agents">From Agents</SelectItem>
                <SelectItem value="teams">From Teams</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Messages List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-4">
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-10 h-10 bg-card rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-card rounded mb-2"></div>
                          <div className="h-3 bg-card rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <h3 className="text-lg font-polysans font-semibold text-white mb-2">
                  No Messages Found
                </h3>
                <p className="text-gray-400 font-poppins">
                  {searchTerm || filterType !== 'all'
                    ? "Try adjusting your search or filters"
                    : "Start a conversation by messaging other users about transfer opportunities"
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y ">
                {filteredThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`p-4 cursor-pointer hover:bg-card transition-colors ${selectedThread?.id === thread.id ? 'bg-card  border-rosegold' : ''
                      }`}
                    onClick={() => handleThreadSelect(thread)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-card text-white">
                          {thread.participant.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-poppins font-medium text-white truncate">
                            {thread.participant.name}
                          </h4>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[.5rem]",
                              thread.participant.type === 'agent'
                                ? "border-blue-400 text-blue-400"
                                : "border-green-400 text-green-400"
                            )}
                          >
                            {thread.participant.type}
                          </Badge>
                          {thread.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {thread.unreadCount}
                            </Badge>
                          )}
                        </div>

                        <p className="text-[.8rem] text-start text-gray-400 truncate font-poppins">
                          {thread.lastMessage.content}
                        </p>

                        <div className="flex justify-end items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-[.6rem] text-gray-500">
                            {formatDate(thread.lastMessage.created_at)}
                          </span>
                          {thread.lastMessage.contract_file_url && (
                            <span title="Contract attached">
                              <FileText className="w-3 h-3 text-blue-400" />
                            </span>
                          )}
                          {thread.lastMessage.attachment_urls && thread.lastMessage.attachment_urls.length > 0 && (
                            <span title="Files attached">
                              <FileText className="w-3 h-3 text-gray-400" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Message Detail */}
        <div className="flex-1 flex flex-col">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="p-4 bg-[#0b0b0b]">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className=" text-white">
                      {selectedThread.participant.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-polysans font-bold text-white">
                      {selectedThread.participant.name}
                    </h2>
                    <p className="text-sm text-gray-400 capitalize">
                      {selectedThread.participant.type}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedThread.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === profile?.id ? 'justify-end' : 'justify-start'
                        }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${message.sender_id === profile?.id
                          ? 'bg-rosegold text-white'
                          : 'bg-[#0a0a0a] text-[#fffc]'
                          }`}
                      >
                        <p className="font-poppins text-[.8rem] text-start">{message.content}</p>

                        {/* Contract File */}
                        {message.contract_file_url && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 p-2 bg-card rounded border-0">
                              <FileText className="w-4 h-4 flex-shrink-0 text-[#fffc]" />
                              <span className="text-xs truncate flex-1 text-[#fffc]">
                                Contract Document
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-[#fffc]"
                                  onClick={() => handlePreviewFile(message.contract_file_url!, 'Contract Document.pdf')}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0  text-[#fffc]"
                                  onClick={() => downloadFile(message.contract_file_url!, 'Contract Document.pdf')}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* File Attachments */}
                        {message.attachment_urls && message.attachment_urls.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachment_urls.map((url, index) => {
                              const fileName = url.split('/').pop() || `File ${index + 1}`;
                              const fileType = fileName.split('.').pop()?.toLowerCase() || '';
                              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);

                              return (
                                <div key={index} className="flex items-center gap-2 p-2 bg-black/20 rounded">
                                  <FileText className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-xs truncate flex-1">{fileName}</span>
                                  <div className="flex gap-1">
                                    {isImage && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 "
                                        onClick={() => handlePreviewFile(url, fileName, 'image')}
                                      >
                                        <Eye className="w-3 h-3" />
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 hover:bg-white/20"
                                      onClick={() => downloadFile(url, fileName)}
                                    >
                                      <Download className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs opacity-70">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-700">
                {/* File Attachments Preview */}
                {showAttachments && attachments.length > 0 && (
                  <div className="mb-3 p-3 bg-gray-800 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-700 rounded-lg p-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="text-sm truncate max-w-32">{file.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0 text-red-400 hover:text-red-300"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 bg-gray-800 border-gray-600 text-white"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessageWithFiles();
                      }
                    }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="border-gray-600 hover:bg-gray-700"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessageWithFiles}
                    disabled={uploading || (!newMessage.trim() && attachments.length === 0)}
                    className="bg-rosegold hover:bg-rosegold/90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <h3 className="text-xl font-polysans font-semibold text-white mb-2">
                  Select a Conversation
                </h3>
                <p className="text-gray-400 font-poppins">
                  Choose a message thread to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Preview Dialog */}
      {previewFile && (
        <DocumentPreview
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type}
          isOpen={showFilePreview}
          onClose={() => setShowFilePreview(false)}
        />
      )}
    </Layout>
  );
};

export default Messages;
