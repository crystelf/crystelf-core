import { HttpException, HttpStatus, Logger } from '@nestjs/common';

/**
 * 错误处理工具类
 */
export class ErrorUtil {
  private static readonly logger = new Logger(ErrorUtil.name);
  /**
   * 创建业务异常
   * @param message 错误消息
   * @param status HTTP状态码
   * @param details 详细信息
   */
  static createBusinessError(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: any,
  ): HttpException {
    return new HttpException(
      {
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }

  /**
   * 创建服务器内部错误
   * @param message 错误消息
   * @param originalError 原始错误
   */
  static createInternalError(
    message: string,
    originalError?: any,
  ): HttpException {
    return new HttpException(
      {
        message,
        originalError: originalError?.message || originalError,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * 创建资源未找到错误
   * @param resource 资源名称
   * @param identifier 资源标识符
   */
  static createNotFoundError(
    resource: string,
    identifier?: string,
  ): HttpException {
    const message = identifier
      ? `${resource} '${identifier}' 不存在`
      : `${resource} 不存在`;

    return this.createBusinessError(message, HttpStatus.NOT_FOUND);
  }

  /**
   * 创建验证错误
   * @param message 错误消息
   * @param field 字段名
   */
  static createValidationError(message: string, field?: string): HttpException {
    return new HttpException(
      {
        message,
        field,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * 处理未知错误并转换为HttpException
   * @param error 未知错误
   * @param defaultMessage 默认错误消息
   * @param context 错误上下文（可选）
   */
  static handleUnknownError(
    error: any,
    defaultMessage: string = '服务器内部错误',
    context?: string,
  ): HttpException {
    const errorMsg = error?.message || String(error);
    const logMessage = context ? `${context}: ${errorMsg}` : errorMsg;
    this.logger.error(logMessage);

    if (error instanceof HttpException) {
      return error;
    }

    if (error instanceof Error) {
      return this.createInternalError(
        `${defaultMessage}: ${error.message}`,
        error,
      );
    }

    return this.createInternalError(`${defaultMessage}: ${String(error)}`);
  }
}
