import simpleGit, { SimpleGit } from 'simple-git';
import paths from './path';
import logger from './logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

class AutoUpdater {
  private git: SimpleGit;
  private repoPath: string;

  constructor() {
    this.git = simpleGit();
    this.repoPath = paths.get('root');
  }

  /**
   * 检查远程更新
   */
  public async checkForUpdates(): Promise<boolean> {
    try {
      logger.info('检查仓库更新中..');

      const status = await this.git.status();
      if (status.ahead > 0) {
        logger.info('检测到当地仓库有未提交的更改，跳过更新..');
        return false;
      }

      logger.info('正在获取远程仓库信息..');
      await this.git.fetch();

      const localBranch = status.current;
      const diffSummary = await this.git.diffSummary([`${localBranch}..origin/${localBranch}`]);

      if (diffSummary.files.length > 0) {
        logger.info('检测到远程仓库有更新！');

        logger.info('正在拉取更新..');
        if (localBranch) {
          await this.git.pull('origin', localBranch);
        } else {
          logger.error('当前分支名称未知，无法执行拉取操作..');
          return false;
        }

        logger.info('代码更新成功，开始更新依赖..');
        await this.updateDependencies();

        logger.info('自动更新流程完成。');
        return true;
      } else {
        logger.info('远程仓库没有新变化..');
        return false;
      }
    } catch (error) {
      logger.error('检查仓库更新失败: ', error);
      return false;
    }
  }

  /**
   * 自动更新依赖和构建
   */
  private async updateDependencies(): Promise<void> {
    try {
      logger.info('执行 pnpm install...');
      await execAsync('pnpm install', { cwd: this.repoPath });
      logger.info('依赖安装完成。');

      const pkgPath = paths.get('package');
      const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      if (pkgJson.scripts?.build) {
        logger.info('检测到 build 脚本，执行 pnpm build...');
        await execAsync('pnpm build', { cwd: this.repoPath });
        logger.info('构建完成。');
      } else {
        logger.info('未检测到 build 脚本，跳过构建。');
      }
    } catch (error) {
      logger.error('更新依赖或构建失败: ', error);
    }
  }
}

const autoUpdater = new AutoUpdater();
export default autoUpdater;
