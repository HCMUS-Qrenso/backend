import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum DownloadFormat {
  PNG = 'png',
  PDF = 'pdf',
}

export class DownloadQrDto {
  @ApiPropertyOptional({
    enum: DownloadFormat,
    example: DownloadFormat.PNG,
    description: 'Download format (png or pdf)',
    default: DownloadFormat.PNG,
  })
  @IsOptional()
  @IsEnum(DownloadFormat)
  format?: DownloadFormat = DownloadFormat.PNG;
}
