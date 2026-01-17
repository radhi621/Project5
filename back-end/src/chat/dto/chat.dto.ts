import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateChatDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class CreateMessageDto {
  @IsNotEmpty()
  @IsString()
  chatId: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}
