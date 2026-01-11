-- Enhanced Messaging and Contract Management Schema
-- This schema implements all the missing features for the transfer timeline messaging system

-- Enhanced Messages Table with Contract Support
CREATE TABLE IF NOT EXISTS enhanced_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pitch_id UUID REFERENCES transfer_pitches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'general' CHECK (message_type IN ('general', 'contract', 'invitation', 'negotiation', 'response')),
    subject TEXT,
    contract_file_url TEXT,
    contract_file_name TEXT,
    contract_file_size INTEGER,
    contract_file_type TEXT,
    contract_status TEXT DEFAULT 'draft' CHECK (contract_status IN ('draft', 'sent', 'reviewed', 'signed', 'rejected')),
    requires_response BOOLEAN DEFAULT false,
    response_deadline TIMESTAMP WITH TIME ZONE,
    is_flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    auto_flag_contact BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Message Attachments Table
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES enhanced_messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract Templates Table
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

-- Generated Contracts Table
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

-- Enhanced Notifications Table
CREATE TABLE IF NOT EXISTS enhanced_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('message', 'contract', 'pitch', 'system', 'reminder')),
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'transfer', 'contract', 'message', 'system')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    is_actionable BOOLEAN DEFAULT false,
    action_url TEXT,
    action_text TEXT,
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    actioned_at TIMESTAMP WITH TIME ZONE
);

-- Message Threads Table for Organized Conversations
CREATE TABLE IF NOT EXISTS message_threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_type TEXT NOT NULL CHECK (thread_type IN ('pitch', 'contract', 'general')),
    pitch_id UUID REFERENCES transfer_pitches(id),
    player_id UUID REFERENCES players(id),
    title TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Thread Participants Table
CREATE TABLE IF NOT EXISTS thread_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'participant' CHECK (role IN ('initiator', 'participant', 'observer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(thread_id, profile_id)
);

-- Message Violations Table for Content Moderation
CREATE TABLE IF NOT EXISTS message_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES enhanced_messages(id) ON DELETE CASCADE,
    violation_type TEXT NOT NULL CHECK (violation_type IN ('phone', 'email', 'inappropriate', 'spam')),
    violation_content TEXT NOT NULL,
    violation_position INTEGER,
    flagged_by UUID NOT NULL REFERENCES profiles(id),
    flagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);

-- User Blocking Table
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(blocker_id, blocked_id)
);

-- Contract Negotiation History
CREATE TABLE IF NOT EXISTS contract_negotiations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES generated_contracts(id) ON DELETE CASCADE,
    negotiator_id UUID NOT NULL REFERENCES profiles(id),
    action_type TEXT NOT NULL CHECK (action_type IN ('propose', 'accept', 'reject', 'modify', 'comment')),
    action_details JSONB NOT NULL,
    previous_terms JSONB,
    new_terms JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_enhanced_messages_sender_id ON enhanced_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_messages_receiver_id ON enhanced_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_messages_pitch_id ON enhanced_messages(pitch_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_messages_player_id ON enhanced_messages(player_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_messages_created_at ON enhanced_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_messages_is_flagged ON enhanced_messages(is_flagged);

CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_user_id ON enhanced_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_type ON enhanced_notifications(type);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_is_read ON enhanced_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_created_at ON enhanced_notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_message_threads_pitch_id ON message_threads(pitch_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_player_id ON message_threads(player_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON message_threads(last_message_at);

CREATE INDEX IF NOT EXISTS idx_generated_contracts_pitch_id ON generated_contracts(pitch_id);
CREATE INDEX IF NOT EXISTS idx_generated_contracts_status ON generated_contracts(status);
CREATE INDEX IF NOT EXISTS idx_generated_contracts_expires_at ON generated_contracts(expires_at);

-- Row Level Security
ALTER TABLE enhanced_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_negotiations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for enhanced_messages
CREATE POLICY "Users can view messages they sent or received" ON enhanced_messages
    FOR SELECT USING (
        sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
        receiver_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create messages" ON enhanced_messages
    FOR INSERT WITH CHECK (
        sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their own messages" ON enhanced_messages
    FOR UPDATE USING (
        sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their own messages" ON enhanced_messages
    FOR DELETE USING (
        sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

-- RLS Policies for enhanced_notifications
CREATE POLICY "Users can view their own notifications" ON enhanced_notifications
    FOR SELECT USING (
        user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their own notifications" ON enhanced_notifications
    FOR UPDATE USING (
        user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

-- RLS Policies for message_threads
CREATE POLICY "Thread participants can view threads" ON message_threads
    FOR SELECT USING (
        id IN (
            SELECT thread_id FROM thread_participants 
            WHERE profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Users can create threads" ON message_threads
    FOR INSERT WITH CHECK (true);

-- RLS Policies for generated_contracts
CREATE POLICY "Users can view contracts they're involved in" ON generated_contracts
    FOR SELECT USING (
        sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
        receiver_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create contracts" ON generated_contracts
    FOR INSERT WITH CHECK (
        sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
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

-- Trigger for auto-flagging
CREATE TRIGGER auto_flag_contact_info
    BEFORE INSERT OR UPDATE ON enhanced_messages
    FOR EACH ROW EXECUTE FUNCTION flag_contact_info();

-- Function to create notification when message is received
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO enhanced_notifications (
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

-- Trigger for creating notifications
CREATE TRIGGER create_message_notification_trigger
    AFTER INSERT ON enhanced_messages
    FOR EACH ROW EXECUTE FUNCTION create_message_notification();

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

-- Trigger for updating pitch message count
CREATE TRIGGER update_pitch_message_count_trigger
    AFTER INSERT OR DELETE ON enhanced_messages
    FOR EACH ROW EXECUTE FUNCTION update_pitch_message_count();

-- Function to create contract notification
CREATE OR REPLACE FUNCTION create_contract_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO enhanced_notifications (
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
            'player_id', NEW.player_id,
            'contract_type', 'generated'
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for contract notifications
CREATE TRIGGER create_contract_notification_trigger
    AFTER INSERT ON generated_contracts
    FOR EACH ROW EXECUTE FUNCTION create_contract_notification();

-- Insert default contract templates
INSERT INTO contract_templates (template_name, template_type, sport_type, template_content, variables, created_by) VALUES
(
    'Standard Transfer Contract',
    'transfer',
    'football',
    'This agreement is made between {team_name} (hereinafter "the Club") and {player_name} (hereinafter "the Player") for the transfer of the Player from {current_team} to the Club.

TERMS AND CONDITIONS:
1. Transfer Fee: {transfer_fee} {currency}
2. Contract Duration: {contract_years} years
3. Weekly Wage: {weekly_wage} {currency}
4. Signing Bonus: {signing_bonus} {currency}
5. Performance Bonuses: {performance_bonuses}

The Club agrees to pay the transfer fee to {current_team} within 30 days of this agreement being signed.

This contract is subject to the Player passing a medical examination and obtaining necessary work permits.',
    '{"team_name": "", "player_name": "", "current_team": "", "transfer_fee": "", "currency": "", "contract_years": "", "weekly_wage": "", "signing_bonus": "", "performance_bonuses": ""}',
    (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)
),
(
    'Loan Agreement Template',
    'loan',
    'football',
    'This loan agreement is made between {parent_team} (hereinafter "the Parent Club") and {loan_team} (hereinafter "the Loan Club") for the temporary transfer of {player_name} (hereinafter "the Player").

LOAN TERMS:
1. Loan Duration: {loan_duration} months
2. Loan Fee: {loan_fee} {currency}
3. Wage Contribution: {wage_contribution}% by Loan Club
4. Option to Buy: {buy_option} {currency}
5. Performance Requirements: {performance_requirements}

The Player will be registered with the Loan Club for the duration of this agreement and will be eligible to play in all competitions.',
    '{"parent_team": "", "loan_team": "", "player_name": "", "loan_duration": "", "loan_fee": "", "currency": "", "wage_contribution": "", "buy_option": "", "performance_requirements": ""}',
    (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)
);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
