import { Application } from 'express';
import { Server } from 'http';

export default interface Plugin {
  // 必须字段
  name: string;
  version: string;

  // 可选描述
  description?: string;

  // 依赖的核心服务 (如 ['logger', 'redis'])
  dependencies?: string[];

  // 初始化方法
  initialize?: (app: Application, server?: Server) => void | Promise<void>;

  // 路由注册方法
  routes?: (app: Application) => void;

  // 生命周期钩子
  onReady?: () => void | Promise<void>;
  onClose?: () => void | Promise<void>;
  onError?: (error: Error) => void;

  // 自动更新配置
  autoUpdateEnabled?: boolean;
  checkForUpdates?: () => Promise<boolean>;
  applyUpdate?: () => Promise<void>;

  // 其他配置
  [key: string]: any;
}
