CREATE TABLE IF NOT EXISTS challenge_invite_links (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID        NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  created_by   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        VARCHAR(12) NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_links_token ON challenge_invite_links(token);
CREATE INDEX IF NOT EXISTS idx_invite_links_challenge ON challenge_invite_links(challenge_id);
