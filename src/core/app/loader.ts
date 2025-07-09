import path from 'path';
import fs from 'fs/promises';
import simpleGit, { SimpleGit } from 'simple-git';
import { Application } from 'express';
import { Server } from 'http';
import Plugin from './../types/plugin';
import logger from '../utils/system/logger';
import paths from '../utils/system/path';
import Core from './core';

class PluginLoader {
  private readonly pluginsDir: string;
  private loadedPlugins: Map<string, Plugin> = new Map();
  private gitInstances: Map<string, SimpleGit> = new Map();

  constructor(
    private app: Application,
    private server?: Server
  ) {
    this.pluginsDir = paths.get('plugins');
  }

  public async loadPlugins(): Promise<void> {
    try {
      logger.info('正在加载插件..');
      const pluginFolders = await fs.readdir(this.pluginsDir);

      await Promise.all(
        pluginFolders.map(async (folder) => {
          const pluginPath = path.join(this.pluginsDir, folder);
          logger.debug(`加载${folder}插件..`);
          const stat = await fs.stat(pluginPath);

          if (stat.isDirectory()) {
            await this.loadPlugin(pluginPath);
          }
        })
      );

      await this.invokePluginHooks('onReady');
    } catch (err) {
      logger.error('加载插件时出错:', err);
    }
  }

  /**
   * 加载插件
   * @param pluginPath
   * @private
   */
  private async loadPlugin(pluginPath: string): Promise<void> {
    try {
      const pluginName = path.basename(pluginPath);
      const indexPath = path.join(pluginPath, 'index.js');

      if (!(await this.fileExists(indexPath))) {
        logger.warn(`插件 ${pluginName} 缺少 index.js 入口文件`);
        return;
      }

      if (await this.checkPluginUpdates(pluginPath)) {
        logger.info(`插件 ${pluginName} 有可用更新，正在更新..`);
        await this.updatePlugin(pluginPath);
      }

      const pluginModule = await import(indexPath);
      const plugin: Plugin = pluginModule.default || pluginModule;

      if (!plugin.name || !plugin.version) {
        logger.warn(`插件 ${pluginName} 缺少必要信息 (name/version)`);
        return;
      }

      try {
        await this.checkDependencies(plugin);
      } catch (err) {
        logger.error(`插件依赖检查失败: ${plugin.name}`, err);
        return;
      }

      if (plugin.initialize) {
        await plugin.initialize(this.app, this.server);
      }

      if (plugin.routes) {
        plugin.routes(this.app);
      }

      this.loadedPlugins.set(plugin.name, plugin);
      logger.info(`插件加载成功: ${plugin.name}@${plugin.version}`);
    } catch (err) {
      logger.error(`加载插件 ${path.basename(pluginPath)} 失败:`, err);
    }
  }

  /**
   * 检查更新
   * @param pluginPath
   * @private
   */
  private async checkPluginUpdates(pluginPath: string): Promise<boolean> {
    try {
      const git = simpleGit(pluginPath);
      this.gitInstances.set(pluginPath, git);

      const isRepo = await git.checkIsRepo();
      if (!isRepo) return false;

      const pluginConfig = await this.getPluginConfig(pluginPath);
      if (!pluginConfig.autoUpdateEnabled) return false;

      await git.fetch();
      const status = await git.status();

      return status.behind > 0;
    } catch (err) {
      logger.warn(`检查插件更新失败: ${path.basename(pluginPath)}`, err);
      return false;
    }
  }

  /**
   * 更新插件
   * @param pluginPath
   * @private
   */
  private async updatePlugin(pluginPath: string): Promise<void> {
    try {
      const git = this.gitInstances.get(pluginPath);
      if (!git) return;

      const status = await git.status();
      if (status.current) {
        await git.pull('origin', status.current);
        logger.info(`插件 ${path.basename(pluginPath)} 更新成功`);

        await this.loadPlugin(pluginPath);
      }
    } catch (err) {
      logger.error(`更新插件 ${path.basename(pluginPath)} 失败:`, err);
    }
  }

  /**
   * 检查依赖
   * @param plugin
   * @private
   */
  private async checkDependencies(plugin: Plugin): Promise<boolean> {
    if (!plugin.dependencies || plugin.dependencies.length === 0) {
      return true;
    }
    const missingDeps: string[] = [];
    for (const dep of plugin.dependencies) {
      try {
        if (!Core.hasService(dep)) {
          missingDeps.push(dep);
        }
      } catch (err) {
        logger.warn(`检查依赖 ${dep} 时出错:`, err);
        missingDeps.push(dep);
      }
    }
    if (missingDeps.length > 0) {
      throw new Error(`插件 ${plugin.name} 缺少以下依赖服务: ${missingDeps.join(', ')}`);
    }
    return true;
  }

  /**
   * 关闭插件
   */
  public async closePlugins(): Promise<void> {
    await this.invokePluginHooks('onClose');
    this.loadedPlugins.clear();
    this.gitInstances.clear();
  }

  private async invokePluginHooks(hookName: 'onReady' | 'onClose'): Promise<void> {
    for (const [name, plugin] of this.loadedPlugins) {
      try {
        if (plugin[hookName]) {
          await plugin[hookName]!();
        }
      } catch (err) {
        logger.error(`执行插件 ${name} 的 ${hookName} 钩子失败:`, err);
      }
    }
  }

  /**
   * 检查目录是否存在
   * @param path 目录路径
   */
  private async dirExists(path: string): Promise<boolean | undefined> {
    try {
      const stat = await fs.stat(path);
      return stat.isDirectory();
    } catch (err) {
      logger.error(err);
    }
  }

  /**
   * 检查文件是否存在
   * @param path 文件路径
   */
  private async fileExists(path: string): Promise<boolean | undefined> {
    try {
      const stat = await fs.stat(path);
      return stat.isFile();
    } catch (err) {
      logger.error(err);
    }
  }

  /**
   * 获取插件配置
   * @param pluginPath 插件路径
   */
  private async getPluginConfig(pluginPath: string): Promise<{
    autoUpdateEnabled: boolean;
    [key: string]: any;
  }> {
    const packagePath = path.join(pluginPath, 'package.json');

    try {
      if (!(await this.fileExists(packagePath))) {
        return { autoUpdateEnabled: false };
      }

      const pkg = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      return {
        autoUpdateEnabled: pkg?.crystelf?.autoUpdate ?? false,
        ...pkg,
      };
    } catch (err) {
      logger.warn(`读取插件配置失败: ${path.basename(pluginPath)}`, err);
      return { autoUpdateEnabled: false };
    }
  }

  /**
   * 获取插件元数据
   * @param pluginPath 插件路径
   */
  private async getPluginMetadata(pluginPath: string): Promise<{
    name: string;
    version: string;
    description?: string;
  } | null> {
    const packagePath = path.join(pluginPath, 'package.json');

    try {
      if (!(await this.fileExists(packagePath))) {
        return null;
      }

      const pkg = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      return {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
      };
    } catch (err) {
      logger.warn(`读取插件元数据失败: ${path.basename(pluginPath)}`, err);
      return null;
    }
  }

  /**
   * 验证插件名称是否符合规范
   * @param name 插件名称
   */
  private isValidPluginName(name: string): boolean {
    return /^[a-z][a-z0-9-]*$/.test(name);
  }

  /**
   * 获取所有已加载插件信息
   */
  public getLoadedPlugins(): Array<{
    name: string;
    version: string;
    path: string;
  }> {
    return Array.from(this.loadedPlugins.entries()).map(([name, plugin]) => ({
      name,
      version: plugin.version,
      path: path.join(this.pluginsDir, name),
    }));
  }
}

export default PluginLoader;
