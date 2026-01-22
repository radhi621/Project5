import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsString()
  requestId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class GetReviewsQueryDto {
  @IsOptional()
  @IsString()
  mechanicId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  limit?: number;
}
