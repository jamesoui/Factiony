/*
  # Create subscriptions table

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `plan` (text, check constraint for 'free' or 'premium')
      - `status` (text, check constraint for 'active', 'cancelled', 'expired')
      - `start_date` (timestamp, default now())
      - `end_date` (timestamp, nullable)
      - `created_at` (timestamp, default now())
      - `updated_at` (timestamp, default now())

  2. Security
    - Enable RLS on `subscriptions` table
    - Add policy for users to read their own subscriptions
    - Add policy for users to insert their own subscriptions
    - Add policy for users to update their own subscriptions

  3. Constraints
    - Foreign key to users table with CASCADE delete
    - Check constraints for plan and status values

  4. Triggers
    - Auto-update updated_at column
*/

-- Create function for updating updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('free', 'premium')),
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON subscriptions;

-- Create policies
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();