import express from 'express';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import logger from './utils/core/logger';
import paths from './utils/core/path';
import config from './utils/core/config';
import './services/ws/wsServer';
import System from './utils/core/system';

const apps = {
  async createApp() {
    const app = express();
    paths.init();
    logger.info('晶灵核心初始化..');

    app.use(express.json());
    app.use(compression());
    logger.debug('成功加载 express.json() 中间件');

    const publicPath = paths.get('public');
    app.use('/public', express.static(publicPath));
    logger.debug(`静态资源路由挂载: /public => ${publicPath}`);

    const modulesDir = path.resolve(__dirname, './modules');
    const controllerPattern = /\.controller\.[jt]s$/;

    if (!fs.existsSync(modulesDir)) {
      logger.warn(`未找到模块目录: ${modulesDir}`);
    } else {
      const moduleFolders = fs.readdirSync(modulesDir).filter((folder) => {
        const fullPath = path.join(modulesDir, folder);
        return fs.statSync(fullPath).isDirectory();
      });

      for (const folder of moduleFolders) {
        const folderPath = path.join(modulesDir, folder);
        const files = fs.readdirSync(folderPath).filter((f) => controllerPattern.test(f));

        for (const file of files) {
          const filePath = path.join(folderPath, file);

          try {
            //logger.debug(`尝试加载模块: ${filePath}`);
            const controllerModule = require(filePath);
            const controller = controllerModule.default;

            if (controller?.getRouter) {
              const isPublic = folder === 'public';
              const routePath = isPublic ? `/${folder}` : `/api/${folder}`;
              app.use(routePath, controller.getRouter());
              logger.debug(`模块路由挂载: ${routePath.padEnd(12)} => ${file}`);

              if (config.get('DEBUG', false)) {
                controller.getRouter().stack.forEach((layer: any) => {
                  if (layer.route) {
                    const methods = Object.keys(layer.route.methods || {})
                      .map((m) => m.toUpperCase())
                      .join(',');
                    logger.debug(`  ↳ ${methods.padEnd(6)} ${routePath}${layer.route.path}`);
                  }
                });
              }
            } else {
              logger.warn(`模块 ${file} 没有导出 getRouter 方法，跳过..`);
            }
          } catch (err) {
            logger.error(`模块 ${file} 加载失败:`, err);
          }
        }
      }
    }

    const duration = System.checkRestartTime();
    //logger.info(duration);
    if (duration) {
      logger.warn(`重启完成！耗时 ${duration} 秒..`);
      const restartTimePath = path.join(paths.get('temp'), 'restart_time');
      fs.writeFileSync(restartTimePath, duration.toString());
    }

    logger.info('晶灵核心初始化完毕！');
    return app;
  },
};

export default apps;
