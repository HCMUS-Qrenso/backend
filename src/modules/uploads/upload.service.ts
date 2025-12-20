import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { PresignUploadDto, PresignUploadResponseDto } from './dto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || '';
    this.s3Client = new S3Client({
      region: this.configService.get<string>('S3_REGION') || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID') || '',
        secretAccessKey:
          this.configService.get<string>('S3_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  async generatePresignedUrl(
    dto: PresignUploadDto,
  ): Promise<PresignUploadResponseDto> {
    try {
      // Generate a unique key for the file
      const fileExtension = dto.fileName.split('.').pop();
      const uniqueId = uuidv4();
      const key = `${dto.group || 'uploads'}/${uniqueId}.${fileExtension}`;

      // Create the PutObject command
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: dto.contentType,
        ...(dto.fileSize && { ContentLength: dto.fileSize }),
      });

      const minutesToExpire =
        this.configService.get<number>('S3_PRESIGNED_URL_EXPIRATION') || 2;

      // Generate presigned URL (expires in 2 minutes)
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: minutesToExpire * 60, // 2 minutes
      });

      this.logger.log(`Generated presigned URL for key: ${key}`);

      return {
        uploadUrl,
        key,
      };
    } catch (error) {
      this.logger.error('Error generating presigned URL', error);
      throw error;
    }
  }
}
