-- Fix RLS policy for notifications to allow system-generated notifications
-- The issue is that the current policy only allows users to insert notifications for themselves
-- But we need the system to be able to create notifications for any user

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a more permissive policy that allows:
-- 1. Users to insert notifications for themselves
-- 2. Service role to insert notifications for anyone (system notifications)
CREATE POLICY "Allow notification creation" ON public.notifications
  FOR INSERT WITH CHECK (
    -- Allow if user is creating for themselves
    user_id = auth.uid() 
    OR 
    -- Allow if this is a service role (system) creating notifications
    auth.role() = 'service_role'
    OR
    -- Allow if user is authenticated (for system-generated notifications)
    auth.uid() IS NOT NULL
  );

-- Also ensure users can read their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Allow users to update their own notifications (mark as read, etc.)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Allow users to delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());
