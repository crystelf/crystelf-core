import { Inject, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathService } from '../../core/path/path.service';
import { SystemService } from 'src/core/system/system.service';

@Injectable()
export class SystemWebService {
  private readonly logger = new Logger(SystemWebService.name);
  @Inject(SystemService)
  private readonly system: SystemService;
  @Inject(PathService)
  private readonly pathService: PathService;

  /**
   * 重启系统
   */
  async systemRestart(): Promise<void> {
    this.logger.debug(`有个小可爱正在请求重启核心..`);
    await this.system.restart();
  }

  /**
   * 获取上次重启所耗时间
   */
  async getRestartTime(): Promise<string> {
    this.logger.debug(`有个小可爱想知道核心重启花了多久..`);
    const restartTimePath = path.join(
      this.pathService.get('temp'),
      'restart_time',
    );
    return await fs.readFile(restartTimePath, 'utf8');
  }
}
