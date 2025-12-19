import { IsString, IsNotEmpty, IsOptional, IsMimeType } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PresignUploadDto {
  @ApiProperty({
    description: 'File name',
    example: 'image.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  @IsMimeType()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({
    description: 'Group or folder to categorize the upload (optional)',
    example: 'avatars',
    required: false,
  })
  @IsOptional()
  group?: string;

  @ApiProperty({
    description: 'File size in bytes (optional)',
    example: 1024000,
    required: false,
  })
  @IsOptional()
  fileSize?: number;
}
