import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CreateChatDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  userIds!: string[]; // The other users to start chat with
}
