import { Inject, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PathService } from '../path/path.service';
import { AutoUpdateService } from '../auto-update/auto-update.service';
import * as process from 'node:process';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  private readonly restartFile: string;
  private readonly checkIntervalMs = 60 * 60 * 1000; // 1小时

  constructor(
    @Inject(PathService)
    private readonly pathService: PathService,
    @Inject(AutoUpdateService)
    private readonly autoUpdateService: AutoUpdateService,
  ) {
    this.restartFile = path.join(
      this.pathService.get('temp'),
      'restart.timestamp',
    );

    this.startAutoCheckUpdate();
  }

  /**
   * 重启前保存时间戳
   */
  private markRestartTime(): void {
    const now = Date.now();
    fs.writeFileSync(this.restartFile, now.toString(), 'utf-8');
    this.logger.debug(`记录重启时间戳: ${now}`);
  }

  /**
   * 检查重启时间戳
   */
  public checkRestartTime(): number | null {
    if (fs.existsSync(this.restartFile)) {
      const prev = Number(fs.readFileSync(this.restartFile, 'utf-8'));
      const duration = ((Date.now() - prev) / 1000 - 5).toFixed(2);
      fs.unlinkSync(this.restartFile);
      this.logger.debug(`检测到重启,耗时: ${duration}秒`);
      return Number(duration);
    }
    return null;
  }

  /**
   * 重启服务
   */
  public async restart(): Promise<void> {
    this.markRestartTime();
    this.logger.warn('服务即将重启..');
    await new Promise((resolve) => setTimeout(resolve, 300));
    process.exit(0);
  }

  /**
   * 检查更新
   */
  public async checkUpdate(): Promise<void> {
    this.logger.debug('检查系统代码更新..');
    const updated = await this.autoUpdateService.checkForUpdates();
    if (updated) {
      this.logger.warn('系统代码已更新,正在重启..');
      process.exit(1);
    }
  }

  /**
   * 启动定时检查更新任务
   */
  private startAutoCheckUpdate() {
    setInterval(async () => {
      try {
        await this.checkUpdate();
      } catch (e) {
        this.logger.error(`定时检查更新失败: ${e?.message}`);
      }
    }, this.checkIntervalMs);
  }
}
