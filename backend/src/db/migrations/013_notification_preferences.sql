ALTER TABLE users
ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"challenge_invite":true,"friend_request":true,"challenge_started":true,"daily_reminder":true}';
