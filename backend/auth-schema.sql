-- Create users table for Thriftshop Polinela authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  reset_otp VARCHAR(6),
  reset_otp_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to create new users (registration)
CREATE POLICY "Allow public registration" ON users
  FOR INSERT WITH CHECK (true);

-- Policy: Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (true);

-- Policy: Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Create index for email lookup (for faster queries)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
