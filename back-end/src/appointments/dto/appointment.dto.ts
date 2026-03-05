import { IsNotEmpty, IsString, IsDateString, IsOptional, IsMongoId, IsNumber } from 'class-validator';

export class CreateAppointmentDto {
  // userId and userName are ignored for regular users — they are always sourced from the JWT token.
  // An admin may optionally supply them to book on behalf of another user.
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsNotEmpty()
  @IsMongoId()
  mechanicId: string;

  @IsNotEmpty()
  @IsString()
  mechanicName: string;

  @IsNotEmpty()
  @IsString()
  shopName: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsString()
  timeSlot: string;

  @IsNotEmpty()
  @IsString()
  serviceType: string;

  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  userPhone?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  timeSlot?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
