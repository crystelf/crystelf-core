import simpleGit, { SimpleGit } from 'simple-git';
import paths from './path';
import logger from './logger';

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

        logger.info('更新成功！');
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
}

const autoUpdater = new AutoUpdater();
export default autoUpdater;
