DO $$ BEGIN
  CREATE TYPE challenge_type AS ENUM ('1v1', 'group');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE challenge_status AS ENUM ('pending', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS challenges (
  id         UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       challenge_type   NOT NULL,
  status     challenge_status NOT NULL DEFAULT 'pending',
  title      VARCHAR(100),
  start_date DATE             NOT NULL,
  end_date   DATE             NOT NULL,
  created_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_challenges_creator ON challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status  ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_dates   ON challenges(start_date, end_date);
