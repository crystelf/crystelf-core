import express from 'express';
import logger from './utils/core/logger';
import paths from './utils/core/path';
import sampleController from './modules/sample/sample.controller';
import imageController from './modules/image/image.controller';
import Config from './utils/core/config';
import fc from './utils/core/file';

const apps = {
  createApp() {
    const app = express();

    logger.info('晶灵核心初始化..');

    Config.check(['PORT', 'DEBUG']);

    app.use(express.json());
    logger.debug('成功加载express.json()中间件');

    const publicPath = paths.get('public');
    app.use('/public', express.static(publicPath));
    logger.debug(`静态资源路由挂载:/public → ${publicPath}`);

    const modules = [
      { path: '/api/sample', name: '测试模块', controller: sampleController },
      { path: '/images', name: '图像模块', controller: imageController },
    ];

    modules.forEach((module) => {
      app.use(module.path, module.controller.getRouter());
      logger.debug(`模块路由挂载: ${module.path.padEnd(12)} → ${module.name}`);

      if (Config.get('DEBUG', false)) {
        module.controller.getRouter().stack.forEach((layer) => {
          if (layer.route) {
            const methods = Object.keys(layer.route)
              .map((m) => m.toUpperCase())
              .join(',');
            logger.debug(`  ↳ ${methods.padEnd(6)} ${module.path}${layer.route.path}`);
          }
        });
      }
    });
    const logPath = paths.get('log');
    fc.createDir(logPath);
    logger.debug(`日志目录初始化: ${logPath}`);
    logger.info('晶灵核心初始化完毕！');
    return app;
  },
};

export default apps;
