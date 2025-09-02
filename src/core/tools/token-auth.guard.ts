import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ToolsService } from './tools.service';

/**
 * token验证守卫
 */
@Injectable()
export class TokenAuthGuard implements CanActivate {
  private readonly logger = new Logger(TokenAuthGuard.name);

  constructor(
    @Inject(ToolsService) private readonly toolsService: ToolsService,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.body?.token || request.headers['x-token']; //两种传入方式

    if (!token) {
      this.logger.warn('请求缺少 token');
      throw new UnauthorizedException('缺少 token');
    }

    if (!this.toolsService.checkToken(token)) {
      this.toolsService.tokenCheckFailed(token);
    }

    return true;
  }
}
