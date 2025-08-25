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

  constructor(@Inject(PathService) private readonly pathService: PathService) {
    this.git = simpleGit();
    this.repoPath = this.pathService.get('root');
  }

  /**
   * 检查主仓库远程更新
   */
  async checkForUpdates(): Promise<boolean> {
    return this.checkRepoForUpdates(this.repoPath, 'crystelf-core');
  }

  /**
   * 检查指定文件夹的更新
   */
  async checkRepoForUpdates(
    folderPath: string,
    label = '子仓库',
  ): Promise<boolean> {
    try {
      this.logger.log(`[${label}] 检查仓库更新中...`);

      const repoGit = simpleGit(folderPath);
      const status = await repoGit.status();

      if (status.ahead > 0) {
        this.logger.warn(`[${label}] 检测到本地仓库有未提交的更改，跳过更新`);
        return false;
      }

      this.logger.log(`[${label}] 正在获取远程仓库信息...`);
      await repoGit.fetch();

      const localBranch = status.current;
      const diffSummary = await repoGit.diffSummary([
        `${localBranch}..origin/${localBranch}`,
      ]);

      if (diffSummary.files.length > 0) {
        this.logger.log(`[${label}] 检测到远程仓库有更新！`);
        if (localBranch) {
          this.logger.log(`[${label}] 正在拉取远程代码...`);
          await repoGit.pull('origin', localBranch);
        } else {
          this.logger.error(`[${label}] 当前分支名称未知，无法执行拉取操作。`);
          return false;
        }

        this.logger.log(`[${label}] 代码更新成功，开始更新依赖...`);
        await this.updateDependencies(folderPath, label);

        this.logger.log(`[${label}] 自动更新流程完成`);
        return true;
      } else {
        this.logger.log(`[${label}] 远程仓库没有新变化`);
        return false;
      }
    } catch (error) {
      this.logger.error(`[${label}] 检查仓库更新失败:`, error);
      return false;
    }
  }

  /**
   * 自动安装依赖和构建
   */
  private async updateDependencies(
    folderPath: string,
    label = '仓库',
  ): Promise<void> {
    try {
      this.logger.log(`[${label}] 执行 pnpm install...`);
      await execAsync('pnpm install', { cwd: folderPath });
      this.logger.log(`[${label}] 依赖安装完成`);

      const pkgPath = `${folderPath}/package.json`;
      let pkgJson: any;

      try {
        pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      } catch {
        this.logger.warn(`[${label}] 未找到 package.json，跳过依赖构建`);
        return;
      }

      if (pkgJson.scripts?.build) {
        this.logger.log(`[${label}] 检测到 build 脚本，执行 pnpm build...`);
        await execAsync('pnpm build', { cwd: folderPath });
        this.logger.log(`[${label}] 构建完成`);
      } else {
        this.logger.log(`[${label}] 未检测到 build 脚本，跳过构建`);
      }
    } catch (error) {
      this.logger.error(`[${label}] 更新依赖或构建失败:`, error);
    }
  }
}
