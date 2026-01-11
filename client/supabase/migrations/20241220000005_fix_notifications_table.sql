-- Update the notification creation function to handle missing columns gracefully
CREATE OR REPLACE FUNCTION create_enhanced_message_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        metadata,
        is_read,
        created_at
    ) VALUES (
        NEW.receiver_id,
        'New Message Received',
        CASE 
            WHEN NEW.subject IS NOT NULL THEN NEW.subject
            ELSE 'You have received a new message'
        END,
        'message',
        jsonb_build_object(
            'message_id', NEW.id,
            'sender_id', NEW.sender_id,
            'pitch_id', NEW.pitch_id,
            'player_id', NEW.player_id,
            'message_type', COALESCE(NEW.message_type, 'general'),
            'category', 'message',
            'priority', 'normal',
            'is_actionable', true,
            'action_url', '/messages/' || NEW.id,
            'action_text', 'View Message'
        ),
        false,
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
