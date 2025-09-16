import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);
  private readonly envPath = path.resolve(process.cwd(), '.env');
  private readonly envExamplePath = path.resolve(process.cwd(), '.envExample');

  constructor(
    @Inject(NestConfigService)
    private readonly nestConfigService: NestConfigService,
  ) {}

  onModuleInit() {
    this.checkAndSyncEnv();
  }

  /**
   * 获取环境变量
   */
  public get<T = string>(key: string, defaultValue?: T): T | undefined {
    const value = this.nestConfigService.get<T>(key);
    if (value === undefined || value === null) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      this.logger.error(`环境变量 ${key} 未定义!`);
    }
    return value;
  }

  /**
   * 检查并补全 .env 文件
   */
  private checkAndSyncEnv(): void {
    this.logger.log('检查并同步 .env 与 .env.example ...');

    if (!fs.existsSync(this.envExamplePath)) {
      this.logger.error(`缺少 ${this.envExamplePath} 文件，无法校验`);
      return;
    }

    const exampleContent = fs.readFileSync(this.envExamplePath, 'utf8');
    const exampleVars = this.parseEnv(exampleContent);

    let envContent = fs.existsSync(this.envPath)
      ? fs.readFileSync(this.envPath, 'utf8')
      : '';
    const envVars = this.parseEnv(envContent);

    let updated = false;
    for (const key of Object.keys(exampleVars)) {
      if (!(key in envVars)) {
        const value = exampleVars[key] ?? '';
        envContent += `\n${key}=${value}`;
        this.logger.warn(`补全缺失环境变量: ${key}=${value}`);
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(this.envPath, envContent.trim() + '\n', {
        encoding: 'utf8',
      });
      this.logger.log('.env 已自动补全缺失项');
    } else {
      this.logger.log('.env 已与 .env.example 保持一致');
    }
  }

  /**
   * 解析.env为对象
   * @param content
   * @private
   */
  private parseEnv(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .forEach((line) => {
        const [key, ...rest] = line.split('=');
        result[key.trim()] = rest.join('=').trim();
      });
    return result;
  }
}
