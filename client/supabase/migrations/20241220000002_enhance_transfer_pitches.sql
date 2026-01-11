-- Enhance transfer_pitches table with missing fields
ALTER TABLE public.transfer_pitches 
ADD COLUMN IF NOT EXISTS deal_stage TEXT DEFAULT 'pitch' CHECK (deal_stage IN ('pitch', 'interest', 'discussion', 'expired')),
ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tagged_videos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shortlist_count INTEGER DEFAULT 0;

-- Add function to increment view count
CREATE OR REPLACE FUNCTION public.increment_pitch_view_count(pitch_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.transfer_pitches 
  SET view_count = view_count + 1 
  WHERE id = pitch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to increment message count
CREATE OR REPLACE FUNCTION public.increment_pitch_message_count(pitch_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.transfer_pitches 
  SET message_count = message_count + 1 
  WHERE id = pitch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to increment shortlist count
CREATE OR REPLACE FUNCTION public.increment_pitch_shortlist_count(pitch_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.transfer_pitches 
  SET shortlist_count = shortlist_count + 1 
  WHERE id = pitch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to decrement shortlist count
CREATE OR REPLACE FUNCTION public.decrement_pitch_shortlist_count(pitch_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.transfer_pitches 
  SET shortlist_count = GREATEST(shortlist_count - 1, 0)
  WHERE id = pitch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to increment message count when message is sent
CREATE OR REPLACE FUNCTION public.handle_message_count_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pitch_id IS NOT NULL THEN
    PERFORM public.increment_pitch_message_count(NEW.pitch_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for message count updates
CREATE TRIGGER message_count_update_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_message_count_update();

-- Create trigger to update shortlist count
CREATE OR REPLACE FUNCTION public.handle_shortlist_count_update()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.increment_pitch_shortlist_count(NEW.pitch_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.decrement_pitch_shortlist_count(OLD.pitch_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for shortlist count updates
CREATE TRIGGER shortlist_count_update_trigger
  AFTER INSERT OR DELETE ON public.shortlist
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_shortlist_count_update();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_deal_stage ON public.transfer_pitches(deal_stage);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_team_id ON public.transfer_pitches(team_id);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_player_id ON public.transfer_pitches(player_id);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_created_at ON public.transfer_pitches(created_at DESC);
