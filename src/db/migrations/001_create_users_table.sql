-- Migration: Create users table with comprehensive analytics
-- This table stores user information and analytics for production use

CREATE TABLE IF NOT EXISTS users (
  -- Primary key - references auth.users(id)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic user information
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'google' NOT NULL,
  
  -- Analytics and activity tracking
  last_sign_in_at TIMESTAMPTZ,
  last_sign_out_at TIMESTAMPTZ,
  sign_in_count TEXT DEFAULT '0' NOT NULL,
  first_sign_in_at TIMESTAMPTZ,
  
  -- Comprehensive device information for analytics
  device_info JSONB DEFAULT '{}'::jsonb NOT NULL,
  
  -- Notification preferences
  notification_preferences JSONB DEFAULT '{
    "email": true,
    "push": true,
    "in_app": true,
    "categories": {
      "system": true,
      "task": true,
      "message": true,
      "reminder": true
    }
  }'::jsonb NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_sign_in ON users(last_sign_in_at);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Disable RLS (Row Level Security) as requested
-- Note: Access will be controlled through authenticated API calls only
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

