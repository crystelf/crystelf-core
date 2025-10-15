import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as fs from 'fs';
import * as path from 'path';

interface RequestLogEntry {
  timestamp: string;
  ip: string | string[] | undefined;
  method: string;
  url: string;
  controller: string;
  handler: string;
  userAgent?: string;
  params?: any;
  query?: any;
  body?: any;
  statusCode?: number;
  durationMs?: number;
}

@Injectable()
export class RequestLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const now = Date.now();
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const ip = req.headers['x-forwarded-for'] || req.ip;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const userAgent = req.headers['user-agent'];
    this.logger.log(
      `${method} ${url} - ${controller}.${handler} - ip=${Array.isArray(ip) ? ip[0] : ip}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          this.writeLog({
            timestamp: new Date(now).toISOString(),
            ip,
            method,
            url,
            controller,
            handler,
            userAgent,
            params: req.params,
            query: req.query,
            body: req.body,
            statusCode: res.statusCode,
            durationMs: Date.now() - now,
          });
        },
        error: () => {
          this.writeLog({
            timestamp: new Date(now).toISOString(),
            ip,
            method,
            url,
            controller,
            handler,
            userAgent,
            params: req.params,
            query: req.query,
            body: req.body,
            statusCode: res.statusCode,
            durationMs: Date.now() - now,
          });
        },
      }),
    );
  }

  private writeLog(entry: RequestLogEntry) {
    try {
      const baseDir = path.resolve(process.cwd(), 'logs');
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      const fileName = `access-${this.getDateStr()}.jsonl`;
      const filePath = path.join(baseDir, fileName);
      const serialized = JSON.stringify(entry) + '\n';
      fs.appendFile(filePath, serialized, { encoding: 'utf8' }, () => {});
    } catch (err) {
      this.logger.warn(`写入访问日志失败: ${err?.message || err}`);
    }
  }

  private getDateStr(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
