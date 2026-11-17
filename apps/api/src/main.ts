import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './modules/app.module';
async function bootstrap() { const app = await NestFactory.create(AppModule, { rawBody: true }); app.enableCors({ origin: (process.env.ALLOWED_ORIGIN || 'http://localhost:3000').split(','), methods: ['GET','POST','PATCH','DELETE'], credentials: false }); app.useGlobalPipes(new ValidationPipe({ whitelist:true, forbidNonWhitelisted:true, transform:true })); await app.listen(Number(process.env.PORT || 4000), '0.0.0.0'); }
bootstrap();
