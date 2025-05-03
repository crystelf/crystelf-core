import express from 'express';
import response from '../core/response';
import Config from '../core/config';

let tools = {
  /**
   * token验证错误处理逻辑
   * @param res
   * @param token
   */
  async tokenCheckFailed(res: express.Response, token: string): Promise<void> {
    await response.error(
      res,
      'token验证失败..',
      404,
      `有个小可爱使用了错误的token:${JSON.stringify(token)}`
    );
  },

  /**
   * 检查token是否正确
   * @param token
   */
  checkToken(token: string): boolean {
    return token.toString() === Config.get('TOKEN').toString();
  },
};

export default tools;
