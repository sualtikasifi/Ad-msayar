CREATE TABLE IF NOT EXISTS achievements (
  id          VARCHAR(64)  PRIMARY KEY,  -- slug key e.g. 'first_steps'
  name        VARCHAR(100) NOT NULL,
  description TEXT         NOT NULL,
  emoji       VARCHAR(8)   NOT NULL,
  category    VARCHAR(32)  NOT NULL,     -- 'steps' | 'streak' | 'social' | 'challenge'
  xp          INTEGER      NOT NULL DEFAULT 10,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed all achievements
INSERT INTO achievements (id, name, description, emoji, category, xp) VALUES
  -- Steps milestones
  ('first_step',        'İlk Adım',           'İlk adımını sun!',                         '👟', 'steps',     5),
  ('steps_1k',          'Yürüyüşçü',           'Tek günde 1.000 adım at',                  '🚶', 'steps',    10),
  ('steps_5k',          'Aktif Kahraman',      'Tek günde 5.000 adım at',                  '🏃', 'steps',    20),
  ('steps_10k',         'Adım Ustası',         'Tek günde 10.000 adım at',                 '🌟', 'steps',    50),
  ('steps_20k',         'Maraton Ruhu',        'Tek günde 20.000 adım at',                 '⚡', 'steps',   100),
  ('total_50k',         'Elli Binlik',         'Toplamda 50.000 adım at',                  '🎯', 'steps',    30),
  ('total_100k',        'Yüz Binlik',          'Toplamda 100.000 adım at',                 '💯', 'steps',    60),
  ('total_500k',        'Efsane',              'Toplamda 500.000 adım at',                 '🏅', 'steps',   200),
  ('total_1m',          'Milyoncu',            'Toplamda 1.000.000 adım at',               '👑', 'steps',   500),

  -- Streak achievements
  ('streak_3',          '3 Günlük Seri',       '3 gün üst üste adım kaydet',               '🔥', 'streak',   15),
  ('streak_7',          'Haftalık Kahraman',   '7 gün üst üste adım kaydet',               '💪', 'streak',   40),
  ('streak_14',         'İki Haftalık Güç',    '14 gün üst üste adım kaydet',              '⚡', 'streak',   80),
  ('streak_30',         'Aylık Efsane',        '30 gün üst üste adım kaydet',              '🌙', 'streak',  150),
  ('streak_100',        'Yüz Gün Ustası',      '100 gün üst üste adım kaydet',             '🦁', 'streak',  500),

  -- Social achievements
  ('first_friend',      'İlk Arkadaş',         'İlk arkadaşını ekle',                      '🤝', 'social',   10),
  ('friends_5',         'Sosyal Kelebek',      '5 arkadaşın olsun',                        '🦋', 'social',   25),
  ('friends_10',        'Topluluk Lideri',     '10 arkadaşın olsun',                       '🌐', 'social',   50),

  -- Challenge achievements
  ('first_challenge',   'İlk Challenge',       'İlk challenge''ına katıl',                  '🏆', 'challenge', 10),
  ('first_win',         'Kazanan Ruh',         'İlk challenge''ını kazan',                  '🥇', 'challenge', 30),
  ('wins_3',            'Üç Şampiyon',         '3 challenge kazan',                        '🎖', 'challenge', 60),
  ('wins_5',            'Challenge Ustası',    '5 challenge kazan',                        '🏆', 'challenge',100),
  ('wins_10',           'Efsane Şampiyon',     '10 challenge kazan',                       '👑', 'challenge',200),
  ('group_win',         'Grup Hâkimi',         'Grup challenge''ında birinci ol',           '🎯', 'challenge', 40),
  ('comeback',          'Geri Dönüş',          'Geride iken challenge''ı kazan',            '⚡', 'challenge', 50)
ON CONFLICT (id) DO NOTHING;
