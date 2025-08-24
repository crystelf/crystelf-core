import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exception.filter';
import { SystemService } from './core/system/system.service';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  Logger.log('晶灵核心初始化..');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  const systemService = app.get(SystemService);
  const restartDuration = systemService.checkRestartTime();
  if (restartDuration) {
    new Logger('System').warn(`重启完成！耗时 ${restartDuration} 秒`);
  }
  const config = new DocumentBuilder()
    .setTitle('晶灵核心')
    .setDescription('为晶灵提供API服务')
    .setVersion('1.0')
    .build();
  const document = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('', app, document);
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(7000);
  await systemService.checkUpdate().catch((err) => {
    Logger.error(`自动更新失败: ${err?.message}`, '', 'System');
  });
}
bootstrap().then(() => {
  Logger.log(`API服务已启动：http://localhost:7000`);
  Logger.log(`API文档： http://localhost:7000/api`);
});
