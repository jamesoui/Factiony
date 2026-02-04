/*
  # Create game notifications system

  1. New Tables
    - `game_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `game_id` (text)
      - `game_name` (text)
      - `notification_type` (text) - Type de changement (release_date, name, screenshots, etc.)
      - `old_value` (text) - Ancienne valeur
      - `new_value` (text) - Nouvelle valeur
      - `message` (text) - Message de notification
      - `read` (boolean) - Lu ou non
      - `created_at` (timestamptz)

  2. Functions
    - Function to notify followers when a game changes
    - Trigger on games table to detect changes

  3. Security
    - Enable RLS on game_notifications
    - Users can only read their own notifications
    - System can insert notifications

  4. Public Policies
    - Add public read policy on game_follows for counting followers (anticipation)
*/

-- Create game_notifications table
CREATE TABLE IF NOT EXISTS game_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_id text NOT NULL,
  game_name text NOT NULL,
  notification_type text NOT NULL,
  old_value text,
  new_value text,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_notifications_user_id ON game_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_game_notifications_game_id ON game_notifications(game_id);
CREATE INDEX IF NOT EXISTS idx_game_notifications_read ON game_notifications(read);

-- Enable RLS
ALTER TABLE game_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own notifications
CREATE POLICY "Users can read own notifications"
  ON game_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can insert notifications (for the trigger)
CREATE POLICY "Service can insert notifications"
  ON game_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON game_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add public policy to game_follows for counting followers (anticipation)
CREATE POLICY "Anyone can count game followers"
  ON game_follows FOR SELECT
  TO public
  USING (true);

-- Function to notify followers when a game changes
CREATE OR REPLACE FUNCTION notify_game_followers()
RETURNS TRIGGER AS $$
DECLARE
  follower_record RECORD;
  change_message TEXT;
  change_type TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  -- Only notify for games that are not yet released
  IF NEW.released IS NULL OR NEW.released > NOW() THEN
    
    -- Detect release date change
    IF OLD.released IS DISTINCT FROM NEW.released THEN
      change_type := 'release_date';
      old_val := COALESCE(OLD.released::TEXT, 'Inconnue');
      new_val := COALESCE(NEW.released::TEXT, 'Inconnue');
      change_message := 'La date de sortie a changé';
      
    -- Detect name change
    ELSIF OLD.name IS DISTINCT FROM NEW.name THEN
      change_type := 'name';
      old_val := OLD.name;
      new_val := NEW.name;
      change_message := 'Le nom du jeu a changé';
      
    -- Detect screenshots added
    ELSIF jsonb_array_length(COALESCE(NEW.screenshots, '[]'::jsonb)) > 
          jsonb_array_length(COALESCE(OLD.screenshots, '[]'::jsonb)) THEN
      change_type := 'screenshots';
      old_val := jsonb_array_length(COALESCE(OLD.screenshots, '[]'::jsonb))::TEXT;
      new_val := jsonb_array_length(COALESCE(NEW.screenshots, '[]'::jsonb))::TEXT;
      change_message := 'De nouvelles captures d''écran ont été ajoutées';
      
    -- Detect videos added
    ELSIF jsonb_array_length(COALESCE(NEW.videos->'trailers', '[]'::jsonb)) > 
          jsonb_array_length(COALESCE(OLD.videos->'trailers', '[]'::jsonb)) THEN
      change_type := 'videos';
      old_val := jsonb_array_length(COALESCE(OLD.videos->'trailers', '[]'::jsonb))::TEXT;
      new_val := jsonb_array_length(COALESCE(NEW.videos->'trailers', '[]'::jsonb))::TEXT;
      change_message := 'De nouvelles vidéos ont été ajoutées';
      
    -- Detect description change
    ELSIF OLD.description_raw IS DISTINCT FROM NEW.description_raw 
          AND NEW.description_raw IS NOT NULL 
          AND LENGTH(NEW.description_raw) > 10 THEN
      change_type := 'description';
      old_val := 'Description mise à jour';
      new_val := 'Description mise à jour';
      change_message := 'La description a été mise à jour';
      
    ELSE
      -- No significant change, don't notify
      RETURN NEW;
    END IF;
    
    -- Insert notification for each follower
    FOR follower_record IN 
      SELECT user_id 
      FROM game_follows 
      WHERE game_id = NEW.id::TEXT
    LOOP
      INSERT INTO game_notifications (
        user_id,
        game_id,
        game_name,
        notification_type,
        old_value,
        new_value,
        message,
        created_at
      ) VALUES (
        follower_record.user_id,
        NEW.id::TEXT,
        NEW.name,
        change_type,
        old_val,
        new_val,
        change_message,
        NOW()
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on games table
DROP TRIGGER IF EXISTS notify_followers_on_game_change ON games;
CREATE TRIGGER notify_followers_on_game_change
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION notify_game_followers();