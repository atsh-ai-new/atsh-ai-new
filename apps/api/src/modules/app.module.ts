import { Module, Injectable, OnModuleDestroy } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaClient } from '@prisma/client';
import { PublicController } from './public.controller';
import { RequestsService } from './requests.service';
@Injectable() export class DatabaseService extends PrismaClient implements OnModuleDestroy { async onModuleDestroy() { await this.$disconnect(); } }
@Module({ imports:[ThrottlerModule.forRoot([{ttl:60000,limit:20}])], controllers:[PublicController], providers:[DatabaseService,RequestsService,{provide:APP_GUARD,useClass:ThrottlerGuard}] })
export class AppModule {}
