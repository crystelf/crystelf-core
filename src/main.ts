import apps from './app';
import logger from './utils/core/logger';
import config from './utils/core/config';
import redis from './services/redis/redis';

config.check(['PORT', 'DEBUG', 'RD_PORT', 'RD_ADD']);
const PORT = config.get('PORT') || 3000;

apps
  .createApp()
  .then((app) => {
    app.listen(PORT, () => {
      logger.info(`Crystelf-core listening on ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error('Crystelf-core启动失败:', err);
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  await redis.disconnect();
  process.exit(0);
});
