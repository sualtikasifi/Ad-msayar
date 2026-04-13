import https from 'https';
import { pool } from '../config/database';

// ─── Token management ──────────────────────────────────────────────────────

export async function saveToken(userId: string, token: string): Promise<void> {
  await pool.query(
    `INSERT INTO push_tokens (user_id, token, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (token)
     DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = NOW()`,
    [userId, token]
  );
}

export async function removeToken(token: string): Promise<void> {
  await pool.query('DELETE FROM push_tokens WHERE token = $1', [token]);
}

async function getTokensForUser(userId: string): Promise<string[]> {
  const { rows } = await pool.query<{ token: string }>(
    'SELECT token FROM push_tokens WHERE user_id = $1',
    [userId]
  );
  return rows.map((r) => r.token);
}

async function getTokensForUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const { rows } = await pool.query<{ token: string }>(
    'SELECT token FROM push_tokens WHERE user_id = ANY($1)',
    [userIds]
  );
  return rows.map((r) => r.token);
}

// ─── Expo Push API sender ──────────────────────────────────────────────────

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

async function sendExpoPushNotifications(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // Batch into groups of 100 (Expo limit)
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const body = JSON.stringify(chunk);

    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'exp.host',
          path: '/--/api/v2/push/send',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          res.on('data', () => {});
          res.on('end', resolve);
        }
      );
      req.on('error', (err) => {
        console.error('Push notification error:', err.message);
        resolve(); // Don't block on push failures
      });
      req.write(body);
      req.end();
    });
  }
}

// ─── Notification helpers ──────────────────────────────────────────────────

function isExpoToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

async function notifyUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const tokens = await getTokensForUser(userId);
  const expoTokens = tokens.filter(isExpoToken);
  if (expoTokens.length === 0) return;

  await sendExpoPushNotifications(
    expoTokens.map((token) => ({ to: token, title, body, sound: 'default', data }))
  );
}

async function notifyUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const tokens = await getTokensForUsers(userIds);
  const expoTokens = tokens.filter(isExpoToken);
  if (expoTokens.length === 0) return;

  await sendExpoPushNotifications(
    expoTokens.map((token) => ({ to: token, title, body, sound: 'default', data }))
  );
}

// ─── Domain notifications ──────────────────────────────────────────────────

export async function notifyFriendRequest(
  toUserId: string,
  fromUsername: string
): Promise<void> {
  await notifyUser(
    toUserId,
    '🤝 Yeni Arkadaşlık İsteği',
    `${fromUsername} seni arkadaş olarak ekledi`,
    { screen: 'friends', tab: 'requests' }
  );
}

export async function notifyFriendAccepted(
  toUserId: string,
  byUsername: string
): Promise<void> {
  await notifyUser(
    toUserId,
    '✅ Arkadaşlık İsteği Kabul Edildi',
    `${byUsername} arkadaşlık isteğini kabul etti!`,
    { screen: 'friends' }
  );
}

export async function notifyChallengeInvite(
  toUserIds: string[],
  fromUsername: string,
  challengeId: string,
  challengeTitle: string | null,
  type: '1v1' | 'group'
): Promise<void> {
  const typeLabel = type === '1v1' ? '1v1' : 'grup';
  const title = challengeTitle || `${typeLabel} challenge`;
  await notifyUsers(
    toUserIds,
    '🏆 Challenge Daveti!',
    `${fromUsername} seni ${title} challenge'ına davet etti`,
    { screen: 'challenge', challengeId }
  );
}

export async function notifyChallengeStarted(
  participantIds: string[],
  challengeId: string,
  challengeTitle: string | null
): Promise<void> {
  const title = challengeTitle || 'Challenge';
  await notifyUsers(
    participantIds,
    '🚀 Challenge Başladı!',
    `${title} başladı — adım atmaya başla!`,
    { screen: 'challenge', challengeId }
  );
}

export async function notifyChallengeCompleted(
  participantIds: string[],
  challengeId: string,
  winnerUsername: string,
  challengeTitle: string | null
): Promise<void> {
  const title = challengeTitle || 'Challenge';
  await notifyUsers(
    participantIds,
    '🎉 Challenge Bitti!',
    `${title} tamamlandı. Kazanan: ${winnerUsername}!`,
    { screen: 'challenge', challengeId }
  );
}

export async function notifyAchievementEarned(
  userId: string,
  achievementName: string,
  achievementEmoji: string,
  xp: number
): Promise<void> {
  await notifyUser(
    userId,
    `${achievementEmoji} Rozet Kazandın!`,
    `${achievementName} (+${xp} XP)`,
    { screen: 'achievements' }
  );
}

export async function sendPenaltyReminder(
  loserIds: string[],
  challengeId: string,
  penaltyText: string
): Promise<void> {
  const tokens = await getTokensForUsers(loserIds);
  if (tokens.length === 0) return;
  await sendExpoPushNotifications(tokens.map((token) => ({
    to: token,
    title: '😅 Challenge Kaybettin!',
    body: `Cezanı unutma: "${penaltyText}"`,
    data: { screen: 'challenge', challengeId },
  })));
}
