DO $$ BEGIN
  CREATE TYPE participant_status AS ENUM ('invited', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS challenge_participants (
  id           UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID               NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id      UUID               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       participant_status NOT NULL DEFAULT 'invited',
  total_steps  INTEGER            NOT NULL DEFAULT 0 CHECK (total_steps >= 0),
  rank         SMALLINT,
  joined_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_challenge_user UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_challenge   ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_cp_user        ON challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_steps       ON challenge_participants(challenge_id, total_steps DESC);
