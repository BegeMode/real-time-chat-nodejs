import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  chatId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: 'Message text cannot exceed 5000 characters' })
  text!: string;
}
