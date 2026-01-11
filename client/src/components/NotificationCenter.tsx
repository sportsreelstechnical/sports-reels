import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
    Bell,
    Check,
    Trash2,
    Settings,
    MessageSquare,
    User,
    TrendingUp,
    Clock,
    X,
    RefreshCw
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { notificationService, NotificationPreferences, NotificationData } from '@/domains/notifications/services/notificationService';
import { Json } from '@/integrations/supabase/types';

interface Notification {
    id: string;
    title: string;
    description: string;
    type: string;
    read: boolean;
    created_at: string;
    data?: any;
}

const NotificationCenter: React.FC = () => {
    const { profile } = useAuth();
    const { toast } = useToast();
    const { notifications, unreadCount, markAsRead, markAllAsRead, loading, refreshNotifications, deleteNotification } = useNotifications();
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        if (profile?.user_id) {
            fetchPreferences();
        }
    }, [profile]);


    const fetchPreferences = async () => {
        if (!profile?.user_id) return;

        try {
            const prefs = await notificationService.getNotificationPreferences(profile.user_id);
            setPreferences(prefs);
        } catch (error) {
            console.error('Error fetching preferences:', error);
        }
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await markAsRead(notificationId);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
            toast({
                title: "Success",
                description: "All notifications marked as read",
            });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            toast({
                title: "Error",
                description: "Failed to mark notifications as read",
                variant: "destructive"
            });
        }
    };

    const handleDeleteNotification = async (notificationId: string) => {
        try {
            const success = await deleteNotification(notificationId);
            if (success) {
                toast({
                    title: "Success",
                    description: "Notification deleted",
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to delete notification",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast({
                title: "Error",
                description: "Failed to delete notification",
                variant: "destructive"
            });
        }
    };

    const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
        if (!profile?.user_id || !preferences) return;

        try {
            const updatedPrefs = { ...preferences, [key]: value };
            const success = await notificationService.updateNotificationPreferences(
                profile.user_id,
                updatedPrefs
            );

            if (success) {
                setPreferences(updatedPrefs);
                toast({
                    title: "Success",
                    description: "Notification preferences updated",
                });
            }
        } catch (error) {
            console.error('Error updating preferences:', error);
            toast({
                title: "Error",
                description: "Failed to update preferences",
                variant: "destructive"
            });
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'transfer':
                return <TrendingUp className="h-4 w-4 text-blue-400" />;
            case 'message':
                return <MessageSquare className="h-4 w-4 text-green-400" />;
            case 'profile':
                return <User className="h-4 w-4 text-purple-400" />;
            case 'success':
                return <Check className="h-4 w-4 text-green-400" />;
            case 'warning':
                return <Bell className="h-4 w-4 text-yellow-400" />;
            case 'error':
                return <X className="h-4 w-4 text-red-400" />;
            default:
                return <Bell className="h-4 w-4 text-gray-400" />;
        }
    };

    const getNotificationBadge = (type: string) => {
        switch (type) {
            case 'transfer':
                return <Badge variant="outline" className="border-0 bg-blue-500/10 text-blue-300">Transfer</Badge>;
            case 'message':
                return <Badge variant="outline" className="border-0 bg-green-500/10 text-green-300">Message</Badge>;
            case 'profile':
                return <Badge variant="outline" className="border-0 bg-purple-500/10 text-purple-300">Profile</Badge>;
            case 'success':
                return <Badge variant="outline" className="border-0 bg-emerald-500/10 text-emerald-300">Success</Badge>;
            case 'warning':
                return <Badge variant="outline" className="border-0 bg-yellow-500/10 text-yellow-300">Warning</Badge>;
            case 'error':
                return <Badge variant="outline" className="border-0 bg-red-500/10 text-red-300">Error</Badge>;
            default:
                return <Badge variant="outline" className="border-0 bg-gray-500/10 text-gray-300">Info</Badge>;
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return date.toLocaleDateString();
    };

    const filteredNotifications = notifications.filter(notification => {
        if (activeTab === 'all') return true;
        if (activeTab === 'unread') return !notification.read;
        return notification.type === activeTab;
    });

    if (loading) {
        return (
            <Card className="border border-gray-800 bg-[#0f0f0f]">
                <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse h-16 bg-gray-800 rounded-lg" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className='space-y-2'>
                    <h1 className="text-xl sm:text-2xl font-polysans font-bold text-white">
                        Notifications
                    </h1>
                    <p className="text-sm sm:text-base text-gray-400 font-poppins">
                        Stay updated with your latest activities and messages
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={refreshNotifications}
                        variant="outline"
                        className="h-10 px-4 text-sm border-gray-600 text-white hover:bg-gray-700"
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    {unreadCount > 0 && (
                        <Button
                            onClick={handleMarkAllAsRead}
                            variant="outline"
                            className="h-10 px-4 text-sm border-rosegold text-rosegold hover:bg-rosegold hover:text-white"
                        >
                            <Check className="h-4 w-4 mr-2" />
                            Mark All Read
                        </Button>
                    )}
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-4 text-sm text-gray-400">
                    <RefreshCw className="h-5 w-5 animate-spin text-blue-400 mr-2" />
                    Updating notifications...
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-2 bg-[#111111] border border-gray-800 rounded-lg p-1">
                    <TabsTrigger value="all" className="px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                        All ({notifications.length})
                    </TabsTrigger>
                    <TabsTrigger value="unread" className="px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                        Unread ({unreadCount})
                    </TabsTrigger>
                    <TabsTrigger value="transfer" className="px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                        Transfers
                    </TabsTrigger>
                    <TabsTrigger value="message" className="px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                        Messages
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                        <Settings className="h-4 w-4" />
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-3 sm:space-y-4">
                    {filteredNotifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={handleMarkAsRead}
                            onDelete={handleDeleteNotification}
                            getNotificationIcon={getNotificationIcon}
                            getNotificationBadge={getNotificationBadge}
                            formatTimeAgo={formatTimeAgo}
                        />
                    ))}
                </TabsContent>

                <TabsContent value="unread" className="space-y-3 sm:space-y-4">
                    {filteredNotifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={handleMarkAsRead}
                            onDelete={handleDeleteNotification}
                            getNotificationIcon={getNotificationIcon}
                            getNotificationBadge={getNotificationBadge}
                            formatTimeAgo={formatTimeAgo}
                        />
                    ))}
                </TabsContent>

                <TabsContent value="transfer" className="space-y-3 sm:space-y-4">
                    {filteredNotifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={handleMarkAsRead}
                            onDelete={handleDeleteNotification}
                            getNotificationIcon={getNotificationIcon}
                            getNotificationBadge={getNotificationBadge}
                            formatTimeAgo={formatTimeAgo}
                        />
                    ))}
                </TabsContent>

                <TabsContent value="message" className="space-y-3 sm:space-y-4">
                    {filteredNotifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={handleMarkAsRead}
                            onDelete={handleDeleteNotification}
                            getNotificationIcon={getNotificationIcon}
                            getNotificationBadge={getNotificationBadge}
                            formatTimeAgo={formatTimeAgo}
                        />
                    ))}
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 sm:space-y-6">
                    <Card className="border border-gray-800 bg-[#0f0f0f]">
                        <CardHeader className="p-4 sm:p-5">
                            <CardTitle className="text-white font-polysans text-base sm:text-lg">Notification Preferences</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-5">
                            {preferences && (
                                <>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-white text-sm sm:text-base">Email Notifications</Label>
                                                <p className="text-sm text-gray-400">Receive notifications via email</p>
                                            </div>
                                            <Switch
                                                checked={preferences.email_notifications}
                                                onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-white text-sm sm:text-base">Newsletter Subscription</Label>
                                                <p className="text-sm text-gray-400">Receive our newsletter and updates</p>
                                            </div>
                                            <Switch
                                                checked={preferences.newsletter_subscription}
                                                onCheckedChange={(checked) => updatePreference('newsletter_subscription', checked)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-white text-sm sm:text-base">In-App Notifications</Label>
                                                <p className="text-sm text-gray-400">Show notifications within the app</p>
                                            </div>
                                            <Switch
                                                checked={preferences.in_app_notifications}
                                                onCheckedChange={(checked) => updatePreference('in_app_notifications', checked)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-white text-sm sm:text-base">Transfer Updates</Label>
                                                <p className="text-sm text-gray-400">Notifications about transfer interest</p>
                                            </div>
                                            <Switch
                                                checked={preferences.transfer_updates}
                                                onCheckedChange={(checked) => updatePreference('transfer_updates', checked)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-white text-sm sm:text-base">Message Notifications</Label>
                                                <p className="text-sm text-gray-400">Notifications about new messages</p>
                                            </div>
                                            <Switch
                                                checked={preferences.message_notifications}
                                                onCheckedChange={(checked) => updatePreference('message_notifications', checked)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-white text-sm sm:text-base">Profile Changes</Label>
                                                <p className="text-sm text-gray-400">Notifications about profile updates</p>
                                            </div>
                                            <Switch
                                                checked={preferences.profile_changes}
                                                onCheckedChange={(checked) => updatePreference('profile_changes', checked)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-white text-sm sm:text-base">Login Notifications</Label>
                                                <p className="text-sm text-gray-400">Get notified when you log in</p>
                                            </div>
                                            <Switch
                                                checked={preferences.login_notifications}
                                                onCheckedChange={(checked) => updatePreference('login_notifications', checked)}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {filteredNotifications.length === 0 && activeTab !== 'settings' && (
                <Card className="border border-gray-800 bg-[#0f0f0f]">
                    <CardContent className="p-10 text-center space-y-3">
                        <Bell className="w-12 h-12 mx-auto text-gray-500" />
                        <h3 className="text-lg sm:text-xl font-polysans font-semibold text-white">
                            No Notifications
                        </h3>
                        <p className="text-sm sm:text-base text-gray-400 font-poppins">
                            {activeTab === 'unread'
                                ? "You're all caught up! No unread notifications."
                                : "No notifications to display."
                            }
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

interface NotificationItemProps {
    notification: NotificationData;
    onMarkAsRead: (id: string) => void;
    onDelete: (id: string) => void;
    getNotificationIcon: (type: string) => React.ReactNode;
    getNotificationBadge: (type: string) => React.ReactNode;
    formatTimeAgo: (dateString: string) => string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
    notification,
    onMarkAsRead,
    onDelete,
    getNotificationIcon,
    getNotificationBadge,
    formatTimeAgo
}) => {
    return (
        <Card className={`border border-gray-800 bg-[#111111] rounded-xl ${!notification.read ? 'ring-1 ring-blue-500/30' : ''}`}>
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h4 className={`font-polysans font-semibold text-sm sm:text-base ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                                        {notification.title}
                                    </h4>
                                    {getNotificationBadge(notification.type)}
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                    {notification.description}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    {formatTimeAgo(notification.created_at)}
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {!notification.read && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onMarkAsRead(notification.id)}
                                        className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-900/20"
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onDelete(notification.id)}
                                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default NotificationCenter; 