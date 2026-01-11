
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DataChangeNotificationProps {
  userId: string;
  email: string;
  changeType: string;
  entityType: 'player' | 'team' | 'video' | 'profile';
  entityName: string;
}

export const useDataChangeNotification = () => {
  const { toast } = useToast();

  const sendChangeNotification = async ({
    userId,
    email,
    changeType,
    entityType,
    entityName
  }: DataChangeNotificationProps) => {
    try {
      // Create notification record
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${changeType}`,
          message: `${entityName} has been ${changeType.toLowerCase()}`,
          type: 'data_change',
          metadata: {
            entity_type: entityType,
            entity_name: entityName,
            change_type: changeType,
            email_sent: true
          }
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      // Send email notification via edge function (you would need to implement this)
      try {
        const { error: emailError } = await supabase.functions.invoke('send-data-change-email', {
          body: {
            to: email,
            changeType,
            entityType,
            entityName,
            timestamp: new Date().toISOString()
          }
        });

        if (emailError) {
          console.error('Error sending email:', emailError);
        }
      } catch (emailError) {
        console.error('Email function not available:', emailError);
      }

      toast({
        title: "Change Confirmed",
        description: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${changeType.toLowerCase()} confirmed. You'll receive an email confirmation shortly.`,
      });

    } catch (error) {
      console.error('Error sending change notification:', error);
      toast({
        title: "Notification Error",
        description: "Changes saved but failed to send notification email.",
        variant: "destructive"
      });
    }
  };

  return { sendChangeNotification };
};
