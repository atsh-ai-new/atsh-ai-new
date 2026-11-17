import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseService } from './database.service';
import { PublicController } from './public.controller';
import { RequestsService } from './requests.service';
@Module({ imports:[ThrottlerModule.forRoot([{ttl:60000,limit:20}])], controllers:[PublicController], providers:[DatabaseService,RequestsService,{provide:APP_GUARD,useClass:ThrottlerGuard}] })
export class AppModule {}
