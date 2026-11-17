import { IsArray, ArrayMinSize, ArrayMaxSize, IsEmail, IsNotEmpty, IsString, MaxLength, IsIn } from 'class-validator';
export const SERVICES=['موقع إلكتروني','متجر إلكتروني','تطبيق موبايل','نظام إداري','مساعد ذكاء اصطناعي','أتمتة وتكاملات','استضافة وتشغيل'] as const;
export class CreateRequestDto { @IsString() @IsNotEmpty() @MaxLength(100) name!: string; @IsEmail() @MaxLength(254) email!: string; @IsString() @MaxLength(25) phone!: string; @IsString() @IsNotEmpty() @MaxLength(5000) details!: string; @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @IsIn(SERVICES,{each:true}) services!: string[]; }
