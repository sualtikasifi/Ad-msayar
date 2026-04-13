import http from 'http';
import cron from 'node-cron';
import { createApp } from './app';
import { initSocket, getSocketServer } from './socket';
import { testConnection } from './config/database';
import { env } from './config/env';
import { completeExpiredChallenges } from './services/challenge.service';

async function bootstrap(): Promise<void> {
  await testConnection();

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  // Cron job: complete expired challenges every hour at :00
  cron.schedule('0 * * * *', async () => {
    const io = getSocketServer();
    if (io) {
      await completeExpiredChallenges(io).catch(console.error);
    }
  });

  server.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
