-- Replace user-uploaded avatar images (unreliable on ephemeral hosting)
-- with a choice of 10 built-in preset avatars, identified by a small int.
ALTER TABLE users ADD COLUMN avatar_id SMALLINT NOT NULL DEFAULT 1
  CHECK (avatar_id BETWEEN 1 AND 10);

UPDATE users SET avatar_id = (floor(random() * 10) + 1)::smallint;

ALTER TABLE users DROP COLUMN avatar_url;
