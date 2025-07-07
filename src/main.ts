import apps from './core/app/app';
import logger from './core/utils/system/logger';
import config from './core/utils/system/config';
import autoUpdater from './core/utils/system/autoUpdater';
import System from './core/utils/system/system';
import PluginLoader from './core/app/loader';

config.check(['PORT', 'DEBUG', 'RD_PORT', 'RD_ADD', 'WS_SECRET', 'WS_PORT']);
const PORT = config.get('PORT') || 3000;

apps
  .createApp()
  .then(async (app) => {
    const server = app.listen(PORT, () => {
      logger.info(`Crystelf-core listening on ${PORT}`);
    });

    const pluginLoader = new PluginLoader(app, server);
    await pluginLoader.loadPlugins();
    const isUpdated = await autoUpdater.checkForUpdates();
    if (isUpdated) {
      logger.warn(`检测到更新，正在重启..`);
      await System.restart();
    }

    process.on('SIGTERM', async () => {
      logger.info('收到终止信号，正在关闭插件和服务..');
      await pluginLoader.closePlugins();
      process.exit(0);
    });

    process.on('uncaughtException', (err) => {
      logger.error('未捕获的异常:', err);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝:', reason);
    });
  })
  .catch((err) => {
    logger.error('Crystelf-core启动失败:', err);
    process.exit(1);
  });
