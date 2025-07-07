import { Application } from 'express';
import { Server } from 'http';

interface Plugin {
  name: string;
  version: string;
  description?: string;
  // 初始化插件
  initialize?: (app: Application, server?: Server) => void | Promise<void>;
  // 路由挂载点
  routes?: (app: Application) => void;
  // 生命周期钩子
  onReady?: () => void | Promise<void>;
  onClose?: () => void | Promise<void>;
  onError?: (error: Error) => void;
  // 自动更新相关
  autoUpdateEnabled?: boolean;
  checkForUpdates?: () => Promise<boolean>;
  applyUpdate?: () => Promise<void>;
}

export default Plugin;
