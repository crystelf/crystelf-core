import { Inject, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PathService } from '../path/path.service';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  private readonly restartFile: string;

  constructor(
    @Inject(PathService)
    private readonly pathService: PathService,
  ) {
    this.restartFile = path.join(
      this.pathService.get('temp'),
      'restart.timestamp',
    );
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
  checkRestartTime(): number | null {
    if (fs.existsSync(this.restartFile)) {
      const prev = Number(fs.readFileSync(this.restartFile, 'utf-8'));
      const duration = ((Date.now() - prev) / 1000 - 5).toFixed(2);
      fs.unlinkSync(this.restartFile);
      this.logger.debug(`检测到重启，耗时: ${duration}秒`);
      return Number(duration);
    }
    return null;
  }

  /**
   * 重启服务
   */
  async restart(): Promise<void> {
    this.markRestartTime();
    this.logger.warn('服务即将重启..');
    await new Promise((resolve) => setTimeout(resolve, 300));
    process.exit(0);
  }
}
