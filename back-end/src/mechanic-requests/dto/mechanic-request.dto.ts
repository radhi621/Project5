import { IsString, IsEmail, IsArray, IsOptional, IsNotEmpty } from 'class-validator';

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

  @IsArray()
  @IsNotEmpty()
  chatHistory: {
    role: string;
    content: string;
    timestamp: Date;
  }[];
}

export class RespondToRequestDto {
  @IsString()
  @IsNotEmpty()
  responseMessage: string;
}
