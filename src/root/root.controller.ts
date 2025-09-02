import { Controller, Get } from '@nestjs/common';

@Controller()
export class RootController {
  @Get()
  public getWelcome() {
    return {
      message: '欢迎使用晶灵核心',
    };
  }
}
