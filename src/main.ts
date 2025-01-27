import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformResInterceptor } from './interceptor/transform-res.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new TransformResInterceptor());
  await app.listen(process.env.APP_PORT ?? 3000);
}
bootstrap();
