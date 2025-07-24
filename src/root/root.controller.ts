import { Controller, Get } from '@nestjs/common';

@Controller()
export class RootController {
  @Get()
  getWelcome() {
    return {
      message: '欢迎使用晶灵核心',
    };
  }
}
