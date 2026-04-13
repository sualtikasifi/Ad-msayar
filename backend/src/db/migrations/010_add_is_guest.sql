-- Add is_guest flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quick cleanup of old unclaimed guest accounts (optional cron)
CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest) WHERE is_guest = TRUE;
