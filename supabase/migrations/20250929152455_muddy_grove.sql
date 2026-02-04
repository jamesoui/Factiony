/*
  # Create subscriptions table

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `plan` (text, check constraint)
      - `status` (text, check constraint)
      - `start_date` (timestamp)
      - `end_date` (timestamp, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `subscriptions` table
    - Add policies for users to manage their own subscriptions

  3. Indexes
    - Index on user_id for performance
    - Index on status for filtering
*/

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();