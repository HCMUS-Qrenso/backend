import { ApiProperty } from '@nestjs/swagger';

export class PresignUploadResponseDto {
  @ApiProperty({
    description: 'Presigned URL for uploading the file',
    example:
      'https://bucket.s3.amazonaws.com/uploads/image.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&...',
  })
  uploadUrl: string;

  @ApiProperty({
    description: 'Object key for the uploaded file',
    example: 'uploads/image.jpg',
  })
  key: string;
}
