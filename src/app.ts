import express from 'express';
import logger from './utils/logger';
import fc from './utils/file';
import paths from './utils/path';
import sampleController from './modules/sample/sample.controller';
import imageController from './modules/image/image.controller';

const apps = {
  createApp() {
    const app = express();

    app.use(express.json());
    app.use('/public', express.static(paths.get('public')));
    logger.debug(`路由/public挂载成功..`);
    app.use('/api/sample', sampleController.getRouter());
    logger.debug(`路由/api/sample挂载成功..`);
    app.use('/images', imageController.getRouter());
    logger.debug(`路由/images挂载成功..`);
    fc.createDir(paths.get('log'));
    logger.info('晶灵核心初始化成功！');
    return app;
  },
};

export default apps;
