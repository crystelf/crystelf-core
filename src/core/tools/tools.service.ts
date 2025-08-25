import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RetryOptions } from './retry-options.interface';
import { AppConfigService } from '../../config/config.service';

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);
  constructor(
    @Inject(AppConfigService)
    private readonly config: AppConfigService,
  ) {}
  /**
   * 异步重试
   * @param operation
   * @param options
   */
  async retry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
  ): Promise<T> {
    let attempt = 0;
    let lastError: any;

    while (attempt < options.maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt < options.maxAttempts) {
          const delay = options.initialDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error('重试失败', lastError);
    throw lastError;
  }

  /**
   * 从一个可迭代列表中随机选择一个对象
   */
  getRandomItem<T>(list: T[]): T {
    return list[Math.floor(Math.random() * list.length)];
  }

  /**
   * 获取随机数
   */
  getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 检查 token 是否有效
   * @param token 待验证的 token
   */
  checkToken(token: string): boolean {
    const expected = this.config.get<string>('TOKEN');
    if (!expected) {
      this.logger.error('环境变量 TOKEN 未配置，无法进行验证！');
      throw new UnauthorizedException('系统配置错误，缺少 TOKEN');
    }
    return token === expected;
  }

  /**
   * token 验证失败时的逻辑
   * @param token 无效的 token
   */
  tokenCheckFailed(token: string): never {
    this.logger.warn(`有个小可爱使用了错误的 token: ${JSON.stringify(token)}`);
    throw new UnauthorizedException('token 验证失败..');
  }
}
