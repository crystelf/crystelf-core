import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

/**
 * 全局异常过滤器
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status: number;
    let message: string;
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
      
      // 获取HttpException的详细信息
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        errorDetails = exceptionResponse;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      
      // 处理非HttpException的错误
      if (exception instanceof Error) {
        message = exception.message || '服务器内部错误';
        errorDetails = {
          name: exception.name,
          stack: process.env.NODE_ENV === 'development' ? exception.stack : undefined,
        };
      } else {
        message = '服务器内部错误';
        errorDetails = String(exception);
      }
    }

    // 记录错误日志
    this.logger.error(
      `异常捕获 - ${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : exception,
    );

    const errorResponse = {
      success: false,
      data: null,
      message,
      ...(process.env.NODE_ENV === 'development' && errorDetails && { errorDetails }),
    };

    response.status(status).json(errorResponse);
  }
}
