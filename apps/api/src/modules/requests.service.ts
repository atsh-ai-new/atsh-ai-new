import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from './database.service';
import { CreateRequestDto } from './requests.dto';
@Injectable()
export class RequestsService {
 constructor(private readonly db: DatabaseService) {}
 async create(input: CreateRequestDto, submissionKey?: string) {
  if (submissionKey && !/^[0-9a-fA-F-]{36}$/.test(submissionKey)) throw new BadRequestException('Invalid Idempotency-Key');
  const normalized={name:input.name.trim(),email:input.email.toLowerCase().trim(),phone:input.phone.trim(),details:input.details.trim(),services:[...new Set(input.services)].sort()};
  const payloadHash=createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  if(submissionKey){const existing=await this.db.serviceRequest.findUnique({where:{submissionKey}});if(existing){if(existing.payloadHash!==payloadHash)throw new ConflictException('Idempotency key reused with different request');return {reference:existing.reference,status:'submitted'};}}
  const reference='ATSH-'+randomBytes(8).toString('hex').toUpperCase();
  try {const request=await this.db.serviceRequest.create({data:{reference,submissionKey:submissionKey||null,payloadHash,customerName:normalized.name,email:normalized.email,phone:normalized.phone,details:normalized.details,selectedServices:normalized.services,status:'SUBMITTED'}});return {reference:request.reference,status:'submitted'};}
  catch(error){if(submissionKey && typeof error==='object' && error!==null && 'code' in error && error.code==='P2002'){const existing=await this.db.serviceRequest.findUnique({where:{submissionKey}});if(existing){if(existing.payloadHash!==payloadHash)throw new ConflictException('Idempotency key reused with different request');return {reference:existing.reference,status:'submitted'};}}throw error;}
 }
}
