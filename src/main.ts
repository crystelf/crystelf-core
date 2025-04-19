import apps from './app';
import logger from './utils/core/logger';
import config from './utils/core/config';
import redis from './services/redis/redis';
import autoUpdater from './utils/core/autoUpdater';

config.check(['PORT', 'DEBUG', 'RD_PORT', 'RD_ADD', 'WS_SECRET', 'WS_PORT']);
const PORT = config.get('PORT') || 3000;

apps
  .createApp()
  .then(async (app) => {
    app.listen(PORT, () => {
      logger.info(`Crystelf-core listening on ${PORT}`);
    });
    const isUpdated = await autoUpdater.checkForUpdates();
    if (isUpdated) {
      logger.warn(`检测到更新，请重启..`);
    }
  })
  .catch((err) => {
    logger.error('Crystelf-core启动失败:', err);
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  await redis.disconnect();
  process.exit(0);
});
