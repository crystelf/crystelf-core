import express from 'express';
import compression from 'compression';
import logger from '../utils/system/logger';
import paths from '../utils/system/path';
import System from '../utils/system/system';
import path from 'path';

const apps = {
  async createApp() {
    const app = express();
    paths.init();
    logger.info('晶灵核心初始化..');
    app.use((req, res, next) => {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data')) {
        logger.debug('检测到form-data数据流,跳过加载 express.json() 中间件..');
        next();
      } else {
        express.json()(req, res, next);
      }
    });
    app.use(compression());
    logger.debug('成功加载 express.json() 中间件..');
    const publicPath = paths.get('public');
    app.use('/public', express.static(publicPath));
    logger.debug(`静态资源路由挂载: /public => ${publicPath}`);
    const duration = System.checkRestartTime();
    if (duration) {
      logger.warn(`重启完成！耗时 ${duration} 秒..`);
      const restartTimePath = path.join(paths.get('temp'), 'restart_time');
      require('fs').writeFileSync(restartTimePath, duration.toString());
    }

    logger.info('晶灵核心初始化完毕！');
    return app;
  },
};

export default apps;
