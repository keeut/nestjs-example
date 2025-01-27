import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { userIdType } from '../entities/user-constant';

export class CreateUserDto {
  @IsString()
  @IsEmail()
  userId: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsEnum(userIdType)
  idType: userIdType;

  @IsString()
  // 사업자등록번호, 주민번호에 따라 validate
  // @Matches(/^[0-9]+$/, { message: 'ID_VALUE_INVALID' })
  idValue: string;
}
