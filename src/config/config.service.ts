import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(
    @Inject(NestConfigService)
    private readonly nestConfigService: NestConfigService,
  ) {}

  onModuleInit() {
    this.checkRequiredVariables();
  }

  /**
   * 获取环境变量
   * @param key 键值
   * @param defaultValue 默认
   */
  public get<T = string>(key: string, defaultValue?: T): T | undefined {
    const value = this.nestConfigService.get<T>(key);
    if (value === undefined || value === null) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      this.logger.error(`环境变量 ${key} 未定义！`);
    }
    return value;
  }

  private checkRequiredVariables(): void {
    this.logger.log('检查必要环境变量..');
    const requiredVariables = ['RD_PORT', 'RD_ADD', 'WS_SECRET'];

    requiredVariables.forEach((key) => {
      const value = this.nestConfigService.get(key);
      if (value === undefined || value === null) {
        this.logger.fatal(`必需环境变量缺失: ${key}`);
      } else {
        this.logger.debug(`检测到环境变量: ${key}`);
      }
    });
  }
}
