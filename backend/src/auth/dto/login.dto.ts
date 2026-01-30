import type { ILoginDto } from '@shared/index.js';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto implements ILoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
