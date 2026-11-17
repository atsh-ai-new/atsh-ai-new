import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { DatabaseService } from './app.module';
import { CreateRequestDto } from './requests.dto';
@Injectable() export class RequestsService { constructor(private readonly db: DatabaseService) {} async create(input:CreateRequestDto) { const reference='ATSH-'+randomBytes(8).toString('hex').toUpperCase(); const request=await this.db.serviceRequest.create({data:{reference,customerName:input.name.trim(),email:input.email.toLowerCase().trim(),phone:input.phone.trim(),details:input.details.trim(),selectedServices:input.services,status:'SUBMITTED'}}); return {reference:request.reference,status:'submitted'}; } }
