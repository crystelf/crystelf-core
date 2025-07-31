import { Inject, Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { PathService } from '../path/path.service';

const execAsync = promisify(exec);

@Injectable()
export class AutoUpdateService {
  private readonly logger = new Logger(AutoUpdateService.name);
  private readonly git: SimpleGit;
  private readonly repoPath: string;

  constructor(
    @Inject(PathService)
    private readonly pathService: PathService,
  ) {
    this.git = simpleGit();
    this.repoPath = this.pathService.get('root');
  }

  /**
   * 检查远程更新
   */
  async checkForUpdates(): Promise<boolean> {
    try {
      this.logger.log('检查仓库更新中...');

      const status = await this.git.status();
      if (status.ahead > 0) {
        this.logger.warn('检测到本地仓库有未提交的更改，跳过更新');
        return false;
      }

      this.logger.log('正在获取远程仓库信息...');
      await this.git.fetch();

      const localBranch = status.current;
      const diffSummary = await this.git.diffSummary([
        `${localBranch}..origin/${localBranch}`,
      ]);

      if (diffSummary.files.length > 0) {
        this.logger.log('检测到远程仓库有更新！');

        if (localBranch) {
          this.logger.log('正在拉取远程代码...');
          await this.git.pull('origin', localBranch);
        } else {
          this.logger.error('当前分支名称未知，无法执行拉取操作。');
          return false;
        }

        this.logger.log('代码更新成功，开始更新依赖...');
        await this.updateDependencies();

        this.logger.log('自动更新流程完成');
        return true;
      } else {
        this.logger.log('远程仓库没有新变化');
        return false;
      }
    } catch (error) {
      this.logger.error('检查仓库更新失败:', error);
      return false;
    }
  }

  /**
   * 自动安装依赖和构建
   */
  private async updateDependencies(): Promise<void> {
    try {
      this.logger.log('执行 pnpm install...');
      await execAsync('pnpm install', { cwd: this.repoPath });
      this.logger.log('依赖安装完成');

      const pkgPath = this.pathService.get('package');
      const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      if (pkgJson.scripts?.build) {
        this.logger.log('检测到 build 脚本，执行 pnpm build...');
        await execAsync('pnpm build', { cwd: this.repoPath });
        this.logger.log('构建完成');
      } else {
        this.logger.log('未检测到 build 脚本，跳过构建');
      }
    } catch (error) {
      this.logger.error('更新依赖或构建失败:', error);
    }
  }
}
