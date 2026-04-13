-- Challenge modes: standard (time-based), duel (24h 1v1), race (goal-based)
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS mode VARCHAR(20) NOT NULL DEFAULT 'standard';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS step_goal INTEGER;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS penalty_text VARCHAR(200);
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Per-participant penalty tracking (losers confirm their penalty individually)
ALTER TABLE challenge_participants ADD COLUMN IF NOT EXISTS penalty_claimed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN challenges.mode IS 'standard | duel | race';
COMMENT ON COLUMN challenges.step_goal IS 'Target steps for race mode; first to reach it wins';
COMMENT ON COLUMN challenges.started_at IS 'When challenge became active; used for 24h duel expiry';
COMMENT ON COLUMN challenge_participants.penalty_claimed IS 'Loser confirmed penalty acceptance';
