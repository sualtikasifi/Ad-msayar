import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from './config/jwt';
import { pool } from './config/database';

let io: Server | null = null;

export function initSocket(server: import('http').Server): Server {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Auth middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      (socket.data as { userId: string }).userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket.data as { userId: string }).userId;
    console.log(`🔌 Socket connected: ${userId}`);

    // Auto-join personal room
    socket.join(`user:${userId}`);

    socket.on('challenge:join', async ({ challengeId }: { challengeId: string }) => {
      if (!challengeId) return;
      const { rows } = await pool.query(
        `SELECT 1 FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2`,
        [challengeId, userId]
      );
      if (rows.length === 0) return; // not a participant — refuse to leak room events
      socket.join(`challenge:${challengeId}`);
    });

    socket.on('challenge:leave', ({ challengeId }: { challengeId: string }) => {
      socket.leave(`challenge:${challengeId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${userId}`);
    });
  });

  return io;
}

export function getSocketServer(): Server | null {
  return io;
}
