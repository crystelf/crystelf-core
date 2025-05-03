import apps from './app';
import logger from './utils/core/logger';
import config from './utils/core/config';
import redis from './services/redis/redis';
import autoUpdater from './utils/core/autoUpdater';
import System from './utils/core/system';

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
      logger.warn(`检测到更新，正在重启..`);
      await System.restart();
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
