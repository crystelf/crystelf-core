import { Response } from 'express';
import logger from './logger';

class response {
  /**
   * 成功响应
   * @param res Express响应对象
   * @param data 返回数据
   * @param statusCode HTTP状态码，默认200
   */
  public static async success(res: Response, data: any, statusCode = 200) {
    res.status(statusCode).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 错误响应
   * @param res Express响应对象
   * @param message 错误信息
   * @param statusCode HTTP状态码，默认500
   * @param error 原始错误对象（开发环境显示）
   */
  public static async error(res: Response, message: string, statusCode = 500, error?: any) {
    const response: Record<string, any> = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    logger.debug(error instanceof Error ? error.stack : error);

    res.status(statusCode).json(response);
  }

  /**
   * 分页数据响应
   * @param res Express响应对象
   * @param data 数据数组
   * @param total 总条数
   * @param page 当前页码
   * @param pageSize 每页条数
   */
  public static async pagination(
    res: Response,
    data: any[],
    total: number,
    page: number,
    pageSize: number
  ) {
    res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      timestamp: new Date().toISOString(),
    });
  }
}

export default response;
