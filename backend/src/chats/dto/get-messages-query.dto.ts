import { Transform } from 'class-transformer';
import { IsOptional, IsPositive, Max } from 'class-validator';

export class GetMessagesQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value as string, 10))
  @IsPositive()
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value as string, 10))
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  before?: string; // Message ID to paginate before
}
