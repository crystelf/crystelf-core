import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exception.filter';
import { SystemService } from './core/system/system.service';
import { WsAdapter } from '@nestjs/platform-ws';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  Logger.log('晶灵核心初始化..', '', 'Core');
  const envPath = path.join(__dirname, '../.env');
  const envExamplePath = path.join(__dirname, '../.envExample');
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      Logger.warn(`.env 文件已自动生成,请修改配置后重启核心..`, '', 'ENV');
      process.exit(1);
    } else {
      Logger.error('配置模块初始化出错,请重新拉取应用!', '', 'ENV');
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', {
    exclude: [
      'cdn',
      { path: 'cdn/(.*)', method: RequestMethod.ALL },
      'public',
      { path: 'public/(.*)', method: RequestMethod.ALL },
    ],
  });
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  const systemService = app.get(SystemService);
  const restartDuration = systemService.checkRestartTime();
  if (restartDuration) {
    Logger.warn(`重启完成!耗时 ${restartDuration} 秒`, '', 'System');
  }
  const config = new DocumentBuilder()
    .setTitle('晶灵核心')
    .setDescription('为晶灵提供API服务')
    .setVersion('1.0')
    .build();
  const document = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(6868);
  await systemService.checkUpdate().catch((err) => {
    Logger.error(`自动更新失败: ${err?.message}`, '', 'System');
  });
}

bootstrap().then(() => {
  Logger.log(`API服务已启动：http://localhost:6868/api`, '', 'Core');
  Logger.log(`API文档： http://localhost:6868/docs`, '', 'Core');
});
