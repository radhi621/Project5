import { IsString, IsEmail, IsOptional, IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateMechanicRequestDto {
  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsEmail()
  @IsNotEmpty()
  userEmail: string;

  @IsString()
  @IsOptional()
  userPhone?: string;

  @IsMongoId()
  @IsNotEmpty()
  mechanicId: string;

  @IsString()
  @IsNotEmpty()
  mechanicName: string;

  @IsEmail()
  @IsNotEmpty()
  mechanicEmail: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

