import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './requests.dto';
@Controller('api') export class PublicController { constructor(private readonly requests: RequestsService) {} @Get('health') health(){return {status:'ok',service:'atsh-api'};} @Post('public/requests') @Throttle({default:{limit:5,ttl:60000}}) createRequest(@Body() body:CreateRequestDto){return this.requests.create(body);} }
