import { IsNotEmpty, IsString, IsDateString, IsOptional, IsMongoId } from 'class-validator';

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @IsNotEmpty()
  @IsString()
  userName: string;

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
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
