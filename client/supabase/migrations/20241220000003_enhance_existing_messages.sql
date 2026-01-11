-- Enhance existing messages table to support enhanced messaging features
-- This migration adds missing columns to the existing messages table

-- First, fix the syntax error in the status column
ALTER TABLE public.messages 
ALTER COLUMN status TYPE TEXT,
ALTER COLUMN status SET DEFAULT 'sent';

-- Add missing columns for enhanced messaging
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS contract_file_url TEXT,
ADD COLUMN IF NOT EXISTS contract_file_name TEXT,
ADD COLUMN IF NOT EXISTS contract_file_size INTEGER,
ADD COLUMN IF NOT EXISTS contract_file_type TEXT,
ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS requires_response BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS flag_reason TEXT,
ADD COLUMN IF NOT EXISTS auto_flag_contact BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

-- Add check constraints for message_type and contract_status
ALTER TABLE public.messages 
ADD CONSTRAINT IF NOT EXISTS messages_message_type_check 
CHECK (message_type IN ('general', 'contract', 'invitation', 'negotiation', 'response'));

ALTER TABLE public.messages 
ADD CONSTRAINT IF NOT EXISTS messages_contract_status_check 
CHECK (contract_status IN ('draft', 'sent', 'reviewed', 'signed', 'rejected'));

-- Add missing columns to notifications table for enhanced notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS is_actionable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS action_text TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actioned_at TIMESTAMP WITH TIME ZONE;

-- Add check constraints for notifications
ALTER TABLE public.notifications 
ADD CONSTRAINT IF NOT EXISTS notifications_category_check 
CHECK (category IN ('general', 'transfer', 'contract', 'message', 'system'));

ALTER TABLE public.notifications 
ADD CONSTRAINT IF NOT EXISTS notifications_priority_check 
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Create indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_contract_status ON public.messages(contract_status);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(read_at);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_is_actionable ON public.notifications(is_actionable);

-- Create contract templates table
CREATE TABLE IF NOT EXISTS contract_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN ('transfer', 'loan', 'free_agent', 'invitation')),
    sport_type TEXT NOT NULL,
    template_content TEXT NOT NULL,
    variables JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated contracts table
CREATE TABLE IF NOT EXISTS generated_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES contract_templates(id),
    pitch_id UUID REFERENCES transfer_pitches(id),
    sender_id UUID NOT NULL REFERENCES profiles(id),
    receiver_id UUID NOT NULL REFERENCES profiles(id),
    player_id UUID REFERENCES players(id),
    contract_content TEXT NOT NULL,
    contract_data JSONB NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'reviewed', 'signed', 'rejected', 'expired')),
    file_url TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    signed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message threads table
CREATE TABLE IF NOT EXISTS message_threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_type TEXT NOT NULL CHECK (thread_type IN ('pitch', 'contract', 'general')),
    pitch_id UUID REFERENCES transfer_pitches(id),
    player_id UUID REFERENCES players(id),
    title TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create thread participants table
CREATE TABLE IF NOT EXISTS thread_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(thread_id, profile_id)
);

-- Create message violations table
CREATE TABLE IF NOT EXISTS message_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    violation_type TEXT NOT NULL CHECK (violation_type IN ('contact_info', 'inappropriate_content', 'spam')),
    violation_reason TEXT,
    flagged_by UUID REFERENCES profiles(id),
    flagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id)
);

-- Create user blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- Create contract negotiations table
CREATE TABLE IF NOT EXISTS contract_negotiations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES generated_contracts(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('sent', 'reviewed', 'signed', 'rejected', 'counter_offered')),
    action_by UUID NOT NULL REFERENCES profiles(id),
    action_notes TEXT,
    action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_negotiations ENABLE ROW LEVEL SECURITY;

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_contract_templates_sport_type ON contract_templates(sport_type);
CREATE INDEX IF NOT EXISTS idx_contract_templates_is_active ON contract_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_generated_contracts_sender_id ON generated_contracts(sender_id);
CREATE INDEX IF NOT EXISTS idx_generated_contracts_receiver_id ON generated_contracts(receiver_id);
CREATE INDEX IF NOT EXISTS idx_generated_contracts_status ON generated_contracts(status);
CREATE INDEX IF NOT EXISTS idx_message_threads_pitch_id ON message_threads(pitch_id);
CREATE INDEX IF NOT EXISTS idx_thread_participants_thread_id ON thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_participants_profile_id ON thread_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON user_blocks(blocked_id);

-- RLS Policies for new tables
CREATE POLICY "Users can view contract templates" ON contract_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create contract templates" ON contract_templates
    FOR INSERT WITH CHECK (
        created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can view contracts they're involved in" ON generated_contracts
    FOR SELECT USING (
        sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
        receiver_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create contracts" ON generated_contracts
    FOR INSERT WITH CHECK (
        sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Thread participants can view threads" ON message_threads
    FOR SELECT USING (
        id IN (
            SELECT thread_id FROM thread_participants 
            WHERE profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Users can create threads" ON message_threads
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own violations" ON message_violations
    FOR SELECT USING (
        message_id IN (
            SELECT id FROM messages 
            WHERE sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
                   receiver_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Users can view their own blocks" ON user_blocks
    FOR SELECT USING (
        blocker_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
        blocked_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create blocks" ON user_blocks
    FOR INSERT WITH CHECK (
        blocker_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

-- Functions for Auto-flagging Contact Information
CREATE OR REPLACE FUNCTION flag_contact_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for phone numbers
    IF NEW.content ~ '(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}' OR
       NEW.content ~ '(\+?\d{1,4}[-.\s]?)?\d{10,15}' OR
       NEW.content ~ '(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})' OR
       NEW.content ~ '(\+\d{1,3}\s?\d{1,14})' THEN
        
        NEW.is_flagged := true;
        NEW.flag_reason := 'phone_number_detected';
        NEW.auto_flag_contact := true;
    END IF;
    
    -- Check for email addresses
    IF NEW.content ~ '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' OR
       NEW.content ~ '[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}' OR
       NEW.content ~ '[a-zA-Z0-9._%+-]+\[at\][a-zA-Z0-9.-]+\[dot\][a-zA-Z]{2,}' THEN
        
        NEW.is_flagged := true;
        NEW.flag_reason := 'email_address_detected';
        NEW.auto_flag_contact := true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_flag_contact_info ON messages;

-- Create trigger for auto-flagging
CREATE TRIGGER auto_flag_contact_info
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION flag_contact_info();

-- Function to create enhanced notification when message is received
CREATE OR REPLACE FUNCTION create_enhanced_message_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        category,
        priority,
        is_actionable,
        action_url,
        action_text,
        metadata
    ) VALUES (
        NEW.receiver_id,
        'New Message Received',
        CASE 
            WHEN NEW.subject IS NOT NULL THEN NEW.subject
            ELSE 'You have received a new message'
        END,
        'message',
        'message',
        'normal',
        true,
        '/messages/' || NEW.id,
        'View Message',
        jsonb_build_object(
            'message_id', NEW.id,
            'sender_id', NEW.sender_id,
            'pitch_id', NEW.pitch_id,
            'player_id', NEW.player_id,
            'message_type', NEW.message_type
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_message_notification_trigger ON messages;

-- Create trigger for creating enhanced notifications
CREATE TRIGGER create_enhanced_message_notification_trigger
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION create_enhanced_message_notification();

-- Function to update message count on transfer pitches
CREATE OR REPLACE FUNCTION update_pitch_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE transfer_pitches 
        SET message_count = COALESCE(message_count, 0) + 1,
            updated_at = NOW()
        WHERE id = NEW.pitch_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE transfer_pitches 
        SET message_count = GREATEST(COALESCE(message_count, 0) - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.pitch_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_pitch_message_count_trigger ON messages;

-- Create trigger for updating pitch message count
CREATE TRIGGER update_pitch_message_count_trigger
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_pitch_message_count();

-- Function to create contract notification
CREATE OR REPLACE FUNCTION create_contract_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        category,
        priority,
        is_actionable,
        action_url,
        action_text,
        metadata
    ) VALUES (
        NEW.receiver_id,
        'New Contract Received',
        'You have received a new contract for review',
        'contract',
        'contract',
        'high',
        true,
        '/contracts/' || NEW.id,
        'Review Contract',
        jsonb_build_object(
            'contract_id', NEW.id,
            'sender_id', NEW.sender_id,
            'pitch_id', NEW.pitch_id,
            'player_id', NEW.player_id
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for creating contract notifications
CREATE TRIGGER create_contract_notification_trigger
    AFTER INSERT ON generated_contracts
    FOR EACH ROW EXECUTE FUNCTION create_contract_notification();

-- Insert default contract templates
INSERT INTO contract_templates (template_name, template_type, sport_type, template_content, variables, created_by) VALUES
(
    'Standard Transfer Contract',
    'transfer',
    'football',
    'This contract is made between {{team_name}} (hereinafter referred to as "the Team") and {{player_name}} (hereinafter referred to as "the Player") for the transfer of the Player to the Team.

TERMS AND CONDITIONS:
1. Transfer Fee: {{transfer_fee}}
2. Contract Duration: {{contract_duration}}
3. Weekly Wage: {{weekly_wage}}
4. Effective Date: {{effective_date}}

The Team agrees to pay the transfer fee and the Player agrees to the terms and conditions outlined above.

Signed by:
Team Representative: _________________
Player: _________________
Date: _________________',
    '{"team_name": "", "player_name": "", "transfer_fee": "", "contract_duration": "", "weekly_wage": "", "effective_date": ""}',
    (SELECT id FROM profiles LIMIT 1)
),
(
    'Loan Agreement',
    'loan',
    'football',
    'This loan agreement is made between {{lending_team}} (hereinafter referred to as "the Lending Team") and {{borrowing_team}} (hereinafter referred to as "the Borrowing Team") for the loan of {{player_name}}.

LOAN TERMS:
1. Loan Duration: {{loan_duration}}
2. Loan Fee: {{loan_fee}}
3. Wage Contribution: {{wage_contribution}}
4. Start Date: {{start_date}}

Both teams agree to the terms and conditions outlined above.

Signed by:
Lending Team: _________________
Borrowing Team: _________________
Date: _________________',
    '{"lending_team": "", "borrowing_team": "", "player_name": "", "loan_duration": "", "loan_fee": "", "wage_contribution": "", "start_date": ""}',
    (SELECT id FROM profiles LIMIT 1)
);

-- Grant permissions to authenticated users
GRANT ALL ON contract_templates TO authenticated;
GRANT ALL ON generated_contracts TO authenticated;
GRANT ALL ON message_threads TO authenticated;
GRANT ALL ON thread_participants TO authenticated;
GRANT ALL ON message_violations TO authenticated;
GRANT ALL ON user_blocks TO authenticated;
GRANT ALL ON contract_negotiations TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
