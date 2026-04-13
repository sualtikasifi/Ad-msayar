CREATE TABLE IF NOT EXISTS daily_steps (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step_date  DATE        NOT NULL,
  step_count INTEGER     NOT NULL DEFAULT 0 CHECK (step_count >= 0),
  synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_date UNIQUE (user_id, step_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_steps_user_date ON daily_steps(user_id, step_date DESC);
